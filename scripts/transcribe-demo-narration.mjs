import { GoogleGenAI } from '@google/genai';
import { readFile, writeFile } from 'node:fs/promises';
const key = process.env.GEMINI_API_KEY?.trim();
if (!key) throw new Error('Configured server-only Gemini key is absent.');
const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: 'v1beta' } });
const input = process.argv[2] || 'demo/output/final/narration.wav';
const started = Date.now();
try {
  const result = await ai.interactions.create(
    {
      model: 'gemini-3.5-transcribe',
      input: [
        { type: 'audio', data: (await readFile(input)).toString('base64'), mime_type: 'audio/wav' },
      ],
      generation_config: {
        transcription_config: { mode: { type: 'verbatim', timestamp_granularities: ['word'] } },
      },
      store: false,
    },
    { timeout_ms: 90000, maxRetries: 0, fetch_options: { signal: AbortSignal.timeout(90000) } },
  );
  await writeFile(input + '.transcription.json', JSON.stringify(result, null, 2) + '\n');
  console.log(
    JSON.stringify({
      elapsedMs: Date.now() - started,
      outputText: result.output_text,
      outputs: result.outputs
        ?.map((x) => ({ type: x.type, text: x.text, annotations: x.annotations }))
        .slice(0, 2),
    }),
  );
} catch (e) {
  console.log(
    JSON.stringify({
      status: e.status,
      message: String(e.message).replaceAll(key, '[REDACTED]').slice(0, 500),
    }),
  );
  process.exitCode = 1;
}
