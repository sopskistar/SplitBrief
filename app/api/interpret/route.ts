import 'server-only';
import {
  deterministicGuard,
  geminiGenerator,
  interpret,
  interpretRequestSchema,
  InterpreterError,
} from '@/lib/interpreter';
import { takeRequest } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' };
  const fail = (status: number, code: string, error: string) =>
    Response.json({ error, code, manualAvailable: true }, { status, headers });
  if (process.env.AI_REQUESTS_ENABLED === 'false')
    return fail(503, 'AI_DISABLED', 'AI requests are disabled. Use Manual Mode.');
  if (!process.env.GEMINI_API_KEY?.trim())
    return fail(
      503,
      'MISSING_API_KEY',
      'Gemini is not configured on this server. Use Manual Mode.',
    );
  if (!request.headers.get('content-type')?.includes('application/json'))
    return fail(415, 'CONTENT_TYPE', 'Send application/json.');
  if (Number(request.headers.get('content-length') ?? 0) > 4096)
    return fail(
      413,
      'TOO_LARGE',
      'Request is too large. Keep your instruction under 500 characters.',
    );
  if (
    !takeRequest(
      `ai:${request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'}`,
      6,
    )
  )
    return fail(429, 'RATE_LIMIT', 'Too many requests. Wait one minute or use Manual Mode.');
  try {
    const reader = request.body?.getReader();
    if (!reader) return fail(400, 'INVALID_INPUT', 'A JSON payment instruction is required.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4096) {
        await reader.cancel();
        return fail(413, 'TOO_LARGE', 'Request is too large.');
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const parsed = interpretRequestSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    if (!parsed.success)
      return fail(400, 'INVALID_INPUT', 'Use 1–500 characters and 1–3 distinct contact names.');
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const result = await interpret(parsed.data, geminiGenerator(process.env.GEMINI_API_KEY, model));
    return Response.json(
      { ...result, model, source: deterministicGuard(parsed.data) ? 'validation' : 'gemini' },
      { headers },
    );
  } catch (error) {
    if (error instanceof SyntaxError)
      return fail(400, 'INVALID_JSON', 'The request must be valid JSON.');
    if (error instanceof InterpreterError) return fail(error.status, error.code, error.message);
    return fail(500, 'INTERPRET_FAILED', 'The draft could not be interpreted. Use Manual Mode.');
  }
}
