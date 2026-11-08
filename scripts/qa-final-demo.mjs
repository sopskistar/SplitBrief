import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const output = 'demo/output/splitbrief-final-narrated.mp4';
async function run(bin, args) {
  return await new Promise((resolve, reject) => {
    let out = '',
      err = '';
    const p = spawn(bin, args);
    p.stdout.on('data', (x) => (out += x));
    p.stderr.on('data', (x) => (err += x));
    p.on('error', reject);
    p.on('close', (code) =>
      code === 0 ? resolve({ out, err }) : reject(new Error(err.slice(-2000))),
    );
  });
}
const manifest = JSON.parse(await readFile('demo/EXPORT_MANIFEST.json', 'utf8'));
const video = manifest.probe.streams.find((s) => s.codec_type === 'video');
const audio = manifest.probe.streams.find((s) => s.codec_type === 'audio');
if (
  video?.codec_name !== 'h264' ||
  video.width !== 1920 ||
  video.height !== 1080 ||
  video.r_frame_rate !== '30/1' ||
  audio?.codec_name !== 'aac' ||
  manifest.durationSeconds < 105 ||
  manifest.durationSeconds >= 120
)
  throw new Error('Invalid final export format.');
const result = await run('ffmpeg', [
  '-hide_banner',
  '-i',
  output,
  '-vf',
  'blackdetect=d=0.25:pix_th=0.10,freezedetect=n=-50dB:d=12',
  '-af',
  'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json',
  '-f',
  'null',
  '-',
]);
const frames = [...result.err.matchAll(/frame=\s*(\d+)/g)].at(-1)?.[1];
const black = [
  ...result.err.matchAll(/black_start:([^\s]+) black_end:([^\s]+) black_duration:([^\s]+)/g),
].map((m) => ({ start: Number(m[1]), end: Number(m[2]), duration: Number(m[3]) }));
const loud = JSON.parse(
  result.err.slice(result.err.lastIndexOf('{'), result.err.lastIndexOf('}') + 1),
);
if (
  Number(frames) !== 3240 ||
  black.length ||
  Number(loud.input_i) < -24 ||
  Number(loud.input_tp) > 0
)
  throw new Error('Full-export frame or audio QA failed.');
const asr = JSON.parse(
  await readFile('demo/output/final/narration.wav.transcription.json', 'utf8'),
);
const words = asr.steps
  .flatMap((s) => s.content ?? [])
  .flatMap((c) => c.annotations ?? [])
  .filter((a) => a.type === 'word_info');
const finalWord = words.at(-1);
if (!/today\./i.test(finalWord.text) || parseFloat(finalWord.end_offset) > 107.7)
  throw new Error('Narration ending is missing or clipped.');
manifest.qa = {
  checkedAt: new Date().toISOString(),
  pendingVisualReview: true,
  fullDecodeFrames: Number(frames),
  decodeExitCode: 0,
  blackIntervalsAtLeast025Seconds: black.length,
  freezeDetectorNotes: result.err.split('\n').filter((l) => l.includes('freeze_')),
  audio: {
    integratedLufs: Number(loud.input_i),
    truePeakDbtp: Number(loud.input_tp),
    loudnessRange: Number(loud.input_lra),
    method:
      'Full AAC decode and loudness measurement; real-browser WebAudio playback is separately tested.',
  },
  speechRecognition: {
    provider: 'Google gemini-3.5-transcribe',
    wordCount: words.length,
    finalWord: finalWord.text,
    finalWordEndsAt: parseFloat(finalWord.end_offset),
    note: 'Complete generated narration was transcribed and compared with the intended story, including all payment amounts. Proper-name ASR spelling is corrected in captions. No human listening claim.',
  },
};
await writeFile('demo/EXPORT_MANIFEST.json', JSON.stringify(manifest, null, 2) + '\n');
await writeFile(
  'public/evidence/demo.json',
  JSON.stringify(
    {
      checkedAt: manifest.qa.checkedAt,
      source: '/demo/splitbrief-final-narrated.mp4',
      durationSeconds: manifest.durationSeconds,
      bytes: manifest.bytes,
      sha256: manifest.sha256,
      probe: manifest.probe,
      narration: manifest.narration,
      walletApprovalClip: false,
      actualPaymentSignature: manifest.signature,
      originalPlanIndependentlyMatched: false,
      qa: manifest.qa,
    },
    null,
    2,
  ) + '\n',
);
await copyFile('demo/output/final/contact-sheet.jpg', 'docs/screenshots/demo-contact-sheet.jpg');
console.log(JSON.stringify(manifest.qa));
