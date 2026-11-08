import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';
const key = process.env.GEMINI_API_KEY?.trim();
if (!key) throw new Error('Configured Gemini key unavailable.');
const client = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: 'v1beta' } });
const model = 'gemini-3.8-flash-tts';
const voice = 'Sulafat';
const probe = process.argv.includes('--probe');
await mkdir('demo/narration', { recursive: true });
const scenes = probe
  ? [
      {
        id: 'probe',
        text: 'Meet SplitBrief, built for the MLH Solana Hackathon. AI organizes. You approve. Solana verifies.',
      },
    ]
  : JSON.parse(await readFile('demo/STORY.json', 'utf8')).scenes;
for (const scene of scenes) {
  const path = `demo/narration/${scene.id}.wav`;
  try {
    await readFile(path);
    console.log(`Using existing genuine narration: ${scene.id}`);
    continue;
  } catch {}
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 110000);
  try {
    const result = await client.interactions.create(
      {
        model,
        input: [
          {
            type: 'user_input',
            content: [
              {
                type: 'text',
                text: scene.text,
                annotations: [
                  {
                    type: 'speech_metadata',
                    style:
                      'Warm, confident professional English narration. Conversational, clear and natural, never promotional or exaggerated. A consistent adult studio voice, medium pace about 160 words per minute. Say SplitBrief as split brief, Solana as soh-LAH-nah, Gemini as JEM-in-eye. Read the transcript verbatim, with natural sentence pauses and complete endings.',
                  },
                ],
              },
            ],
          },
        ],
        response_format: { type: 'audio', mime_type: 'audio/wav' },
        generation_config: { speech_config: [{ voice }] },
        store: false,
      },
      { timeout_ms: 110000, maxRetries: 0, fetch_options: { signal: controller.signal } },
    );
    const output = result.output_audio ?? result.outputs?.find((x) => x.type === 'audio');
    if (!output?.data) throw new Error('Provider returned no audio block.');
    const bytes = Buffer.from(output.data, 'base64');
    if (bytes.toString('ascii', 0, 4) !== 'RIFF')
      throw new Error('Expected complete WAV audio from the provider.');
    await writeFile(path, bytes);
    await writeFile(
      `demo/narration/${scene.id}.json`,
      JSON.stringify(
        {
          source: 'Google Gemini official neural TTS',
          model,
          voice,
          checkedAt: new Date().toISOString(),
          elapsedMs: Date.now() - started,
          bytes: bytes.length,
          script: scene.text,
          terms: 'https://ai.google.dev/gemini-api/terms',
        },
        null,
        2,
      ) + '\n',
    );
    console.log(
      `Generated ${scene.id}: ${bytes.length} bytes, ${Date.now() - started}ms, ${model}/${voice}`,
    );
    if (!probe && scene !== scenes[scenes.length - 1])
      await new Promise((resolve) => setTimeout(resolve, 22000));
  } catch (error) {
    const status = error.status ?? null;
    const message = String(error.message ?? error)
      .replaceAll(key, '[REDACTED]')
      .replace(/AIza[\w-]+/g, '[REDACTED]')
      .slice(0, 700);
    console.log(JSON.stringify({ scene: scene.id, status, error: message }));
    process.exitCode = 1;
    break;
  } finally {
    clearTimeout(timer);
  }
}
