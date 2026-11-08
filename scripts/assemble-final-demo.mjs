import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
const dir = 'demo/output/final';
await mkdir(dir, { recursive: true });
await mkdir('public/demo', { recursive: true });
const timeline = JSON.parse(await readFile('demo/TIMELINE.json', 'utf8'));
const captures = JSON.parse(await readFile('demo/FINAL_CAPTURE_MANIFEST.json', 'utf8'));
const evidence = JSON.parse(await readFile('public/evidence/devnet-batch.json', 'utf8'));
if (
  !evidence.success ||
  evidence.totalLamports !== '6000000' ||
  !evidence.reportedApplicationReceipt.screenshot?.visuallyInspected
)
  throw new Error('Genuine batch and inspected owner receipt required.');
const clip = (n) => captures.clips.find((c) => c.name === n);
const ws = clip('workspace'),
  ai = clip('recorded-ai'),
  chain = clip('batch-receipt');
if (!ws || !ai || !chain) throw new Error('Fresh authentic browser clips required.');
async function run(bin, args) {
  return await new Promise((resolve, reject) => {
    let out = '',
      err = '';
    const p = spawn(bin, args);
    p.stdout.on('data', (x) => (out += x));
    p.stderr.on('data', (x) => {
      err += x;
      if (err.length > 8000) err = err.slice(-8000);
    });
    p.on('error', reject);
    p.on('close', (code) =>
      code === 0 ? resolve(out) : reject(new Error(`${bin}: ${err.slice(-3000)}`)),
    );
  });
}
const d = timeline.scenes.map((s) => s.duration);
// All UI pixels come from the real captures or the owner's untouched receipt crop.
// The surrounding typography is editorial film graphics, never a fabricated app screen.
const parts = [
  {
    scene: 0,
    id: 'problem',
    duration: d[0],
    file: ws.path,
    start: 16.3,
    available: 13.8,
    crop: [145, 85, 1310, 740],
    layout: 'split',
    heading: 'Three payments.\nOne instruction.\nToo many steps.',
    note: 'A payment message should not mean three separate wallet workflows.',
  },
  {
    scene: 1,
    id: 'introduction',
    duration: d[1],
    file: ws.path,
    start: 16.8,
    available: 13.5,
    crop: [145, 85, 1310, 650],
    heading: 'From one brief to one transaction.',
    note: 'Actual production workspace · Example draft · Nothing sent in this recording',
  },
  {
    scene: 2,
    id: 'gemini',
    duration: d[2],
    file: ai.path,
    start: 8.0,
    available: 16.8,
    crop: [156, 176, 1288, 490],
    heading: 'AI prepares an editable draft.',
    note: 'Genuine recorded Gemini response · Exact amounts · No wallet addresses generated',
  },
  {
    scene: 3,
    id: 'contacts',
    duration: 6.2,
    file: ws.path,
    start: 41.7,
    available: 7.5,
    crop: [156, 96, 1288, 516],
    heading: 'You control the recipients.',
    note: 'Actual saved public addresses · Disposable Devnet recipients',
  },
  {
    scene: 3,
    id: 'review',
    duration: d[3] - 6.2,
    file: ws.path,
    start: 32.0,
    available: 8.5,
    crop: [150, 85, 1300, 565],
    heading: 'Check every address. Every amount.',
    note: 'Manual editor demonstration · Exact 0.006 SOL total · Human approval required',
  },
  {
    scene: 4,
    id: 'approved-receipt',
    duration: 8.2,
    file: 'public/evidence/successful-devnet-receipt.webp',
    still: true,
    crop: [0, 0, 1024, 335],
    heading: 'One approval. Three transfers.',
    note: 'Genuine owner-supplied application receipt · Phantom approval popup was not recorded',
  },
  {
    scene: 4,
    id: 'atomic-transfers',
    duration: d[4] - 8.2,
    file: chain.path,
    start: 13.4,
    available: 7.2,
    crop: [174, 127, 1250, 510],
    heading: 'One atomic Solana transaction.',
    note: 'All transfer effects succeed together or roll back together. Network fees can still apply.',
  },
  {
    scene: 5,
    id: 'rpc-receipt',
    duration: 8.0,
    file: chain.path,
    start: 4.9,
    available: 7.4,
    crop: [156, 76, 1288, 600],
    heading: 'A real payment. Independently verified.',
    note: 'Fresh public Devnet RPC lookup · Finalized · No original review snapshot supplied',
  },
  {
    scene: 5,
    id: 'rpc-transfers',
    duration: d[5] - 8.0,
    file: chain.path,
    start: 13.6,
    available: 12.5,
    crop: [176, 125, 1250, 590],
    heading: 'Three transfers. One public receipt.',
    note: '0.006 SOL transferred · Actual fee 0.000005 SOL · Explorer link and shareable signature',
  },
  {
    scene: 6,
    id: 'conclusion',
    duration: d[6],
    file: ws.path,
    start: 8.8,
    available: 5.4,
    crop: [145, 0, 1310, 900],
    layout: 'end',
    heading: 'AI organizes.\nYou approve.\nSolana verifies.',
    note: 'Built for the MLH Solana Hackathon 2026',
  },
];
const logo = (await readFile('public/branding/splitbrief-wordmark.png')).toString('base64');
const regular = (
  await readFile('node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf')
).toString('base64');
const medium = (
  await readFile('node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf')
).toString('base64');
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
try {
  for (const part of parts) {
    const split = !!part.layout;
    part.box = split ? { x: 850, y: 245, w: 990, h: 684 } : { x: 100, y: 255, w: 1720, h: 664 };
    const title = escape(part.heading).replaceAll('\n', '<br>');
    const extra =
      part.layout === 'end'
        ? '<div class="cta"><strong>splitbrief-zeta.vercel.app</strong><span>github.com/sopskistar/SplitBrief</span></div>'
        : part.layout === 'split'
          ? '<div class="problem-tag">Designer · Delivery partner · Project reserve</div>'
          : '';
    await p.setContent(
      `<html><style>@font-face{font-family:G;src:url(data:font/ttf;base64,${regular})} @font-face{font-family:G;src:url(data:font/ttf;base64,${medium});font-weight:600}*{box-sizing:border-box}body{margin:0;background:#F7F8F5;color:#171B23;font-family:G,sans-serif}.logo{position:absolute;left:80px;top:38px;width:250px;height:auto}.event{position:absolute;right:80px;top:55px;font-size:18px;letter-spacing:1.5px;color:#5E646B}.rule{position:absolute;left:80px;right:80px;top:116px;border-top:1px solid #DDE1D8}.chapter{position:absolute;left:84px;top:${split ? 176 : 140}px;color:#534CE8;font-size:18px;letter-spacing:2px}.chapter b{display:inline-block;background:#C8F36A;color:#171B23;padding:5px 10px;border-radius:5px;margin-right:12px}h1{position:absolute;margin:0;font-size:${split ? 72 : 46}px;font-weight:600;line-height:${split ? 1.13 : 1.15};letter-spacing:${split ? -2.7 : -1.8}px;left:80px;top:${split ? 265 : 181}px;max-width:${split ? 710 : 1770}px}.window{position:absolute;left:${part.box.x - 8}px;top:${part.box.y - 8}px;width:${part.box.w + 16}px;height:${part.box.h + 16}px;background:#fff;border:1px solid #DCE0D7;border-radius:18px;box-shadow:0 18px 45px #171B2310}.note{position:absolute;left:84px;top:950px;font-size:20px;color:#5E646B;max-width:1780px}.devnet{position:absolute;right:80px;bottom:24px;font-size:14px;color:#696F76}.problem-tag{position:absolute;left:84px;top:660px;font-size:21px;line-height:1.6;max-width:640px;color:#5E646B}.cta{position:absolute;left:84px;top:658px;display:grid;gap:20px;font-size:27px}.cta strong{font-weight:600;color:#534CE8}.cta span{font-size:21px;color:#5E646B}</style><body><img class="logo" src="data:image/png;base64,${logo}"><div class="event">MLH SOLANA HACKATHON 2026 · SOLANA DEVNET</div><div class="rule"></div><div class="chapter"><b>0${part.scene + 1}</b> ${['THE EVERYDAY PROBLEM', 'MEET SPLITBRIEF', 'GEMINI INTERPRETATION', 'REVIEW & CONTROL', 'ATOMIC SETTLEMENT', 'ON-CHAIN VERIFICATION', 'A CLEARER WAY TO PAY'][part.scene]}</div><h1>${title}</h1>${extra}<div class="window"></div><div class="note">${escape(part.note)}</div><div class="devnet">Devnet demonstration · Test SOL has no real financial value</div></body></html>`,
    );
    await p.evaluate(() => document.fonts.ready);
    part.background = `${dir}/${part.id}-background.png`;
    await p.screenshot({ path: part.background });
  }
} finally {
  await b.close();
}
const transition = 10 / 30;
for (const [i, part] of parts.entries()) {
  part.render = `${dir}/${part.id}.mp4`;
  if (
    (process.argv.includes('--reuse-renders') || process.argv.includes('--finish-only')) &&
    (await stat(part.render)).size > 1000
  ) {
    console.log(`Reusing inspected render ${part.id}`);
    continue;
  }
  const duration = part.duration + (i < parts.length - 1 ? transition : 0);
  const { x, y, w, h } = part.box;
  const [cx, cy, cw, ch] = part.crop;
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-loop',
    '1',
    '-framerate',
    '30',
    '-i',
    part.background,
  ];
  if (part.still) args.push('-loop', '1', '-framerate', '30', '-i', part.file);
  else
    args.push(
      '-ss',
      String(part.start),
      '-t',
      String(Math.min(part.available, duration)),
      '-i',
      part.file,
    );
  const filter = `[1:v]crop=${cw}:${ch}:${cx}:${cy},scale=${w}:${h}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0xFFFFFF,setsar=1,fps=30,tpad=stop_mode=clone:stop_duration=${duration},zoompan=z='1+0.012*min(on/${Math.round(duration * 30)},1)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=${w}x${h}:fps=30[ui];[0:v][ui]overlay=${x}:${y}:shortest=1,format=yuv420p[v]`;
  part.render = `${dir}/${part.id}.mp4`;
  await run('ffmpeg', [
    ...args,
    '-filter_complex_threads',
    '1',
    '-filter_complex',
    filter,
    '-map',
    '[v]',
    '-t',
    String(duration),
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '20',
    '-threads',
    '2',
    '-r',
    '30',
    part.render,
  ]);
  console.log(`Rendered ${part.id}`);
}
// Captions are timed to recognized words from the actual normalized narration.
const transcription = JSON.parse(await readFile(`${dir}/narration.wav.transcription.json`, 'utf8'));
const blocks = transcription.steps.flatMap((s) => s.content ?? []);
let words = blocks.flatMap((c) => (c.annotations ?? []).filter((a) => a.type === 'word_info'));
if (words.length < 200) throw new Error('Word-timed narration QA is required.');
const cues = [];
let group = [];
for (const word of words) {
  group.push(word);
  const txt = group.map((w) => w.text).join(' ');
  if (group.length >= 9 || /[.!?]$/.test(word.text) || txt.length > 72) {
    cues.push(group);
    group = [];
  }
}
if (group.length) cues.push(group);
const fixed = (s) =>
  s
    .replace(/Split Brief/gi, 'SplitBrief')
    .replace(/\bCHEDDY\b|\bCheety\b/gi, 'Chidi')
    .replace(/\bADA\b/g, 'Ada');
const stamp = (s, vtt = false) => {
  s = Math.max(0, s);
  const h = Math.floor(s / 3600),
    m = Math.floor(s / 60) % 60,
    sec = Math.floor(s) % 60,
    ms = Math.round((s % 1) * (vtt ? 1000 : 100));
  return vtt
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
    : `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
};
let vtt = 'WEBVTT\n\n';
let ass =
  '[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Geist,32,&H00FFFFFF,&H00FFFFFF,&H00171B23,&H00171B23,0,0,0,0,100,100,0,0,3,10,0,2,190,190,38,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';
for (const [i, g] of cues.entries()) {
  const start = parseFloat(g[0].start_offset),
    end = Math.max(start + 0.35, parseFloat(g.at(-1).end_offset) + 0.09);
  const text = fixed(g.map((w) => w.text).join(' '));
  vtt += `${i + 1}\n${stamp(start, true)} --> ${stamp(end, true)}\n${text}\n\n`;
  ass += `Dialogue: 0,${stamp(start)},${stamp(end)},Default,,0,0,0,,{\\an2\\pos(960,1020)}${text}\n`;
}
await writeFile('public/demo/splitbrief-captions.vtt', vtt);
await writeFile(`${dir}/captions.ass`, ass);
// Pairwise short transitions bound decoder memory; a single ten-input xfade graph
// buffers too many full-resolution frames on a shared hackathon workstation.
if (!process.argv.includes('--finish-only')) {
  const joinList = [];
  for (const [i, part] of parts.entries()) {
    const body = `${dir}/body-${i}.mp4`;
    const frames = Math.round(part.duration * 30) - (i ? 10 : 0);
    await run('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-ss',
      String(i ? transition : 0),
      '-i',
      part.render,
      '-frames:v',
      String(frames),
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '18',
      '-threads',
      '2',
      body,
    ]);
    joinList.push(body);
    if (i < parts.length - 1) {
      const path = `${dir}/transition-${i}.mp4`;
      await run('ffmpeg', [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-ss',
        String(part.duration),
        '-i',
        part.render,
        '-i',
        parts[i + 1].render,
        '-filter_complex_threads',
        '1',
        '-filter_complex',
        `[0:v]settb=AVTB,setpts=PTS-STARTPTS[a];[1:v]settb=AVTB,setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=${transition}:offset=0,format=yuv420p[v]`,
        '-map',
        '[v]',
        '-frames:v',
        '10',
        '-an',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '18',
        '-threads',
        '2',
        path,
      ]);
      joinList.push(path);
    }
    console.log(`Joined chapter ${i + 1}/${parts.length}`);
  }
  await writeFile(
    `${dir}/picture-concat.txt`,
    joinList.map((path) => `file '${path.split('/').at(-1)}'`).join('\n') + '\n',
  );
  await run('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    `${dir}/picture-concat.txt`,
    '-c',
    'copy',
    `${dir}/picture.mp4`,
  ]);
}
const output = 'demo/output/splitbrief-final-narrated.mp4';
await run('ffmpeg', [
  '-hide_banner',
  '-loglevel',
  'error',
  '-y',
  '-i',
  `${dir}/picture.mp4`,
  '-i',
  `${dir}/narration.wav`,
  '-vf',
  `ass=${dir}/captions.ass:fontsdir=node_modules/geist/dist/fonts/geist-sans,format=yuv420p`,
  '-af',
  'apad',
  '-t',
  '108',
  '-c:v',
  'libx264',
  '-crf',
  '20',
  '-preset',
  'veryfast',
  '-threads',
  '2',
  '-r',
  '30',
  '-c:a',
  'aac',
  '-b:a',
  '160k',
  '-ar',
  '48000',
  '-movflags',
  '+faststart',
  output,
]);
await copyFile(output, 'public/demo/splitbrief-final-narrated.mp4');
await run('ffmpeg', [
  '-hide_banner',
  '-loglevel',
  'error',
  '-y',
  '-ss',
  '18.5',
  '-i',
  output,
  '-frames:v',
  '1',
  '-c:v',
  'libwebp',
  '-quality',
  '88',
  'public/demo/splitbrief-poster.webp',
]);
await run('ffmpeg', [
  '-hide_banner',
  '-loglevel',
  'error',
  '-y',
  '-i',
  output,
  '-vf',
  'fps=1/9,scale=480:270,tile=3x4',
  '-frames:v',
  '1',
  `${dir}/contact-sheet.jpg`,
]);
const probe = JSON.parse(
  await run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels',
    '-of',
    'json',
    output,
  ]),
);
await writeFile(
  'demo/EXPORT_MANIFEST.json',
  JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      output,
      publicPath: '/demo/splitbrief-final-narrated.mp4',
      durationSeconds: Number(probe.format.duration),
      sourceCaptureManifest: 'demo/FINAL_CAPTURE_MANIFEST.json',
      signature: evidence.signature,
      originalPlanIndependentlyMatched: false,
      ownerReceiptScreenshot: evidence.reportedApplicationReceipt.screenshot,
      walletApprovalClip: false,
      narration: {
        provider: 'Google Gemini',
        model: 'gemini-3.8-flash-tts',
        apiVersion: 'v1beta',
        voice: 'Sulafat (prebuilt neural voice)',
        sceneSources: timeline.scenes.map((s) => `demo/narration/${s.id}.json`),
        music: 'None',
        captions:
          'Word timestamps from genuine normalized narration, with proper-name spelling corrected',
        voiceNotCloned: true,
      },
      parts,
      probe,
      bytes: (await stat(output)).size,
      sha256: createHash('sha256')
        .update(await readFile(output))
        .digest('hex'),
      qa: { pending: true },
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify({ output, probe }));
