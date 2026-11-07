import { mkdir, writeFile } from 'node:fs/promises';
import { geminiGenerator, interpret, InterpreterError } from '../lib/interpreter';
import { SAMPLE_BRIEF } from '../lib/payments';

const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const apiKey = process.env.GEMINI_API_KEY?.trim();
const startedAt = Date.now();
const evidence: Record<string, unknown> = {
  checkedAt: new Date().toISOString(),
  model,
  instruction: SAMPLE_BRIEF,
  source: 'live Google Gemini API',
  success: false,
};
if (!apiKey) {
  evidence.error = 'GEMINI_API_KEY is absent; Manual Mode is available.';
} else {
  try {
    const generate = geminiGenerator(apiKey, model);
    const result = await interpret(
      { instruction: SAMPLE_BRIEF, recipientNames: ['Ada', 'Chidi', 'Reserve'] },
      async (input, signal) => {
        try {
          const text = await generate(input, signal);
          evidence.providerResponseReceived = true;
          return text;
        } catch (error) {
          const detail = error as { name?: string; status?: number; message?: string };
          evidence.providerDiagnostic = {
            name: detail.name,
            status: detail.status,
            message: String(detail.message ?? 'Unknown provider error')
              .replaceAll(apiKey, '[REDACTED]')
              .replace(/AIza[\w-]+/g, '[REDACTED]')
              .slice(0, 900),
          };
          throw error;
        }
      },
    );
    evidence.success = !result.clarificationNeeded && result.items.length === 3;
    evidence.response = result;
  } catch (error) {
    evidence.error =
      error instanceof InterpreterError
        ? { status: error.status, code: error.code, message: error.message }
        : { message: 'Non-provider smoke test failure; no secrets logged.' };
  }
}
await mkdir('public/evidence', { recursive: true });
evidence.elapsedMs = Date.now() - startedAt;
await writeFile('public/evidence/gemini.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
if (!evidence.success) process.exitCode = 1;
