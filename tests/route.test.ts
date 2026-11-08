import { beforeEach, describe, expect, it, vi } from 'vitest';
const { modelCall } = vi.hoisted(() => ({ modelCall: vi.fn() }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    interactions = { create: modelCall };
  },
}));
import { POST } from '../app/api/interpret/route';
import { DRAFT } from './fixtures';
import { SAMPLE_BRIEF } from '../lib/payments';

let requestNumber = 0;
function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/interpret', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `test-${requestNumber++}`,
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
const BODY = { instruction: SAMPLE_BRIEF, recipientNames: ['Ada', 'Chidi', 'Reserve'] };
beforeEach(() => {
  vi.stubEnv('GEMINI_API_KEY', 'unit-test-placeholder');
  vi.stubEnv('AI_REQUESTS_ENABLED', 'true');
  modelCall.mockReset();
  modelCall.mockResolvedValue({
    output_text: JSON.stringify({ items: DRAFT, warnings: [], clarificationNeeded: false }),
  });
});
describe('POST /api/interpret', () => {
  it('returns a validated provider draft and a server-side model ID', async () => {
    const response = await POST(request(BODY));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ items: DRAFT, source: 'gemini' });
    const input = modelCall.mock.calls[0][0];
    expect(input.response_format.mime_type).toBe('application/json');
    expect(input.response_format.schema.properties.items.maxItems).toBe(3);
    expect(input.generation_config.max_output_tokens).toBe(1024);
    expect(input.store).toBe(false);
    expect(input.automatic_continuation).toBe(false);
    expect(input.input).not.toContain('address');
    const options = modelCall.mock.calls[0][1];
    expect(options.maxRetries).toBe(0);
    expect(options.timeout_ms).toBe(270_000);
    expect(options.fetch_options.signal).toBeInstanceOf(AbortSignal);
  });
  it('handles an absent server API key with explicit manual fallback', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const response = await POST(request(BODY));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'MISSING_API_KEY', manualAvailable: true });
    expect(modelCall).not.toHaveBeenCalled();
  });
  it('supports the server AI spending switch', async () => {
    vi.stubEnv('AI_REQUESTS_ENABLED', 'false');
    expect((await POST(request(BODY))).status).toBe(503);
    expect(modelCall).not.toHaveBeenCalled();
  });
  it('validates the request schema before the provider', async () => {
    expect((await POST(request({ ...BODY, instruction: '' }))).status).toBe(400);
    expect(modelCall).not.toHaveBeenCalled();
  });
  it('rejects invalid JSON', async () => expect((await POST(request('{bad'))).status).toBe(400));
  it('requires JSON content type', async () =>
    expect((await POST(request(BODY, { 'content-type': 'text/plain' }))).status).toBe(415));
  it('rejects oversized bodies even without a content-length header', async () =>
    expect((await POST(request({ ...BODY, padding: 'x'.repeat(5000) }))).status).toBe(413));
  it('rejects oversized declared content length', async () =>
    expect((await POST(request(BODY, { 'content-length': '5000' }))).status).toBe(413));
  it('rejects unknown provider labels', async () => {
    modelCall.mockResolvedValue({
      output_text: JSON.stringify({
        items: [{ ...DRAFT[0], recipientLabel: 'Unknown' }, DRAFT[1]],
        warnings: [],
        clarificationNeeded: false,
      }),
    });
    expect((await POST(request(BODY))).status).toBe(502);
  });
  it('rejects malformed provider output', async () => {
    modelCall.mockResolvedValue({ output_text: 'not json' });
    expect((await POST(request(BODY))).status).toBe(502);
  });
  it.each([
    [429, 429],
    [503, 503],
    [404, 503],
    [403, 503],
    [500, 503],
  ])('handles provider HTTP %s', async (status, expected) => {
    modelCall.mockRejectedValue({ status, message: 'Sensitive diagnostic' });
    const response = await POST(request(BODY));
    expect(response.status).toBe(expected);
    expect(JSON.stringify(await response.json())).not.toContain('Sensitive');
  });
  it('handles provider abort/timeout', async () => {
    modelCall.mockRejectedValue({ name: 'TimeoutError' });
    expect((await POST(request(BODY))).status).toBe(504);
  });
  it('reports guard output as validation, never as a genuine Gemini result', async () => {
    const response = await POST(
      request({ ...BODY, instruction: 'Pay Ada 2 USDC and Chidi 3 USDC' }),
    );
    expect(await response.json()).toMatchObject({
      source: 'validation',
      clarificationNeeded: true,
      items: [],
    });
    expect(modelCall).not.toHaveBeenCalled();
  });
  it('throttles repeated clients before expensive model calls', async () => {
    const ip = `throttle-${requestNumber++}`;
    for (let index = 0; index < 6; index++)
      expect((await POST(request(BODY, { 'x-forwarded-for': ip }))).status).toBe(200);
    expect((await POST(request(BODY, { 'x-forwarded-for': ip }))).status).toBe(429);
  });
});
