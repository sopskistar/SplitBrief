import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const story = JSON.parse(await readFile('demo/STORY.json', 'utf8'));
const dir = 'demo/output/final';
await mkdir(dir, { recursive: true });
function run(bin, args) {
  const r = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 1000000 });
  if (r.status !== 0) throw new Error(String(r.stderr || r.error).slice(-1200));
  return r.stdout;
}
const raw = story.scenes.map((scene) =>
  Number(
    run('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      `demo/narration/${scene.id}.wav`,
    ]),
  ),
);
const weights = [1, 0.8, 0.5, 0.8, 1.2, 1.4, 0.7];
const extra = 108 - raw.reduce((a, b) => a + b, 0) - 0.6 * 7;
if (extra < 0)
  throw new Error('Narration exceeds the natural pacing budget; revise text before rendering.');
let start = 0;
let usedFrames = 0;
const timeline = [];
for (const [i, scene] of story.scenes.entries()) {
  const frames =
    i === 6
      ? 3240 - usedFrames
      : Math.round((raw[i] + 0.6 + (extra * weights[i]) / weights.reduce((a, b) => a + b, 0)) * 30);
  const duration = frames / 30;
  usedFrames += frames;
  const path = `${dir}/${scene.id}-narration.wav`;
  run('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    `demo/narration/${scene.id}.wav`,
    '-af',
    `loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000,adelay=200:all=1,apad`,
    '-t',
    String(duration),
    '-ar',
    '48000',
    '-ac',
    '1',
    '-c:a',
    'pcm_s16le',
    path,
  ]);
  timeline.push({
    ...scene,
    start,
    duration,
    frames,
    rawNarrationSeconds: raw[i],
    narration: path,
  });
  start += duration;
}
await writeFile(
  `${dir}/narration-concat.txt`,
  timeline.map((s) => `file '${s.id}-narration.wav'`).join('\n') + '\n',
);
run('ffmpeg', [
  '-hide_banner',
  '-loglevel',
  'error',
  '-y',
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  `${dir}/narration-concat.txt`,
  '-c:a',
  'pcm_s16le',
  `${dir}/narration.wav`,
]);
await writeFile(
  'demo/TIMELINE.json',
  JSON.stringify(
    {
      durationSeconds: start,
      fps: 30,
      voice: 'Sulafat',
      provider: 'Google Gemini 3.8 Flash TTS',
      apiVersion: 'v1beta',
      music: 'None; clear original narration',
      scenes: timeline,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify(
    timeline.map((s) => ({
      scene: s.id,
      start: s.start,
      duration: s.duration,
      narration: s.rawNarrationSeconds,
    })),
  ),
);
