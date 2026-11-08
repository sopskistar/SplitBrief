import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
const outputDir = 'demo/output';
const manifest = JSON.parse(await readFile('demo/CAPTURE_MANIFEST.json', 'utf8'));
const ai = JSON.parse(await readFile('public/evidence/gemini.json', 'utf8'));
const chain = JSON.parse(await readFile('public/evidence/devnet.json', 'utf8'));
if (
  !chain.networkTransactionVerified ||
  !manifest.publicDevnetReceiptClip ||
  chain.signature !== manifest.signature
)
  throw new Error(
    'Refusing assembly: actual chain verification footage and matching evidence are required.',
  );
if (!ai.success || !ai.providerResponseReceived)
  throw new Error('Genuine recorded provider output is required for this cut.');
if (manifest.realAIClip && (!ai.success || !ai.productionHTTP?.success))
  throw new Error('Refusing an AI claim without a genuine captured production response.');
if (manifest.publicBatchPaymentVerified && !chain.success)
  throw new Error('Refusing a public batch claim unsupported by chain evidence.');
if (manifest.walletApprovalClip)
  throw new Error(
    'This cut has no reviewed Phantom source clip. Add a reviewed source workflow before claiming approval footage.',
  );
if (chain.success)
  throw new Error(
    'This cut explicitly describes the supplied funding transfer. Review narration before assembling different chain evidence.',
  );
await mkdir(outputDir, { recursive: true });
const find = (name: string) => {
  const clip = manifest.clips.find((item: { name: string }) => item.name === name);
  if (!clip || !existsSync(clip.path)) throw new Error(`Genuine source missing: ${name}`);
  return clip.path;
};
const aiStart = Number(manifest.marks.aiStart);
const aiEnd = Number(manifest.marks.aiEnd);
const receiptStart = Number(manifest.marks.receiptVisible);
if (![aiStart, aiEnd, receiptStart].every(Number.isFinite))
  throw new Error('Capture timing marks are missing.');
const product = find('02-product');
const segments = [
  {
    source: find('01-opening'),
    start: 0,
    duration: 8,
    caption:
      'Built for the MLH Solana Hackathon.\nFrom payment instructions to one Solana transaction.',
  },
  {
    source: product,
    start: Math.max(0, aiStart - 17),
    duration: 17,
    caption:
      'Save reviewed public addresses. Describe names and exact SOL amounts.\nThese are disposable Devnet recipients. Nothing has been sent.',
  },
  {
    source: product,
    start: aiStart + 0.5,
    duration: 3,
    caption:
      'Genuine Gemini request. Provider waiting is shortened in this edit.\nAI cannot choose an address, control keys, or approve a payment.',
  },
  {
    source: manifest.realAIClip ? product : find('06-recorded-ai'),
    start: manifest.realAIClip ? aiEnd + 0.6 : 0.8,
    duration: 15,
    caption: manifest.realAIClip
      ? 'Live Gemini output: Ada 0.002, Chidi 0.001, Reserve 0.003 SOL.\nExact labels and amounts are validated before contact addresses resolve.'
      : 'Genuine recorded Gemini response: Ada 0.002, Chidi 0.001, Reserve 0.003 SOL.\nThe captured browser request failed; this is the published successful provider record.',
  },
  {
    source: product,
    start: aiEnd + 16,
    duration: 12,
    caption: manifest.realAIClip
      ? 'Review every full address, purpose, amount, and the fee before signing.\nThree transfers total 0.006 SOL. Phantom approval footage is not available.'
      : 'Manual Mode is selected after the captured browser network failure.\nThis editable draft is not AI output or a sent payment. Phantom footage is missing.',
  },
  {
    source: find('03-verification'),
    start: receiptStart + 0.5,
    duration: 24,
    caption:
      'Real Devnet lookup: finalized funding of 2.5 SOL into the test wallet.\nOne transfer, fee 0.000005495 SOL. This is NOT a batch payout or plan match.',
  },
  {
    source: find('04-local-proof'),
    start: 0.5,
    duration: 17,
    caption:
      'Local Surfpool proof: one transaction, three transfers, exact balance changes.\nEight assertions include atomic rollback. These signatures are LOCAL, not Devnet.',
  },
  {
    source: find('05-close'),
    start: 0,
    duration: 9,
    caption:
      'Try splitbrief-zeta.vercel.app · Source: github.com/sopskistar/SplitBrief\nPublic batch payment and genuine Phantom approval footage remain outstanding.',
  },
];
function run(binary: string, args: string[]) {
  const result = spawnSync(binary, args, { encoding: 'utf8', maxBuffer: 8_000_000 });
  if (result.status !== 0)
    throw new Error(`${binary} failed: ${String(result.stderr || result.error).slice(-3000)}`);
  return result.stdout;
}
const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
if (!existsSync(font)) throw new Error('Expected readable caption font is unavailable.');
for (const [index, segment] of segments.entries()) {
  const captionPath = `${outputDir}/caption-${index}.ass`;
  const caption = segment.caption.replaceAll('\n', String.raw`\N`);
  await writeFile(
    captionPath,
    `[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,DejaVu Sans,31,&H00FFFFFF,&H00FFFFFF,&H00171B23,&H00171B23,0,0,0,0,100,100,0,0,1,0,0,1,56,56,44,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:00.00,0:00:59.00,Default,,0,0,0,,${caption}\n`,
  );
  run(ffmpeg, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-ss',
    String(segment.start),
    '-i',
    segment.source,
    '-t',
    String(segment.duration),
    '-vf',
    `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,drawbox=x=0:y=ih-144:w=iw:h=144:color=0x171B23@0.96:t=fill,ass=${captionPath}:fontsdir=/usr/share/fonts/truetype/dejavu,fade=t=in:st=0:d=0.18,fade=t=out:st=${segment.duration - 0.18}:d=0.18,format=yuv420p`,
    '-c:v',
    'libx264',
    '-threads',
    '2',
    '-preset',
    'fast',
    '-crf',
    '19',
    '-an',
    `${outputDir}/part-${index}.mp4`,
  ]);
  console.log(`Rendered genuine segment ${index + 1}/${segments.length}: ${segment.duration}s`);
}
await writeFile(
  `${outputDir}/concat.txt`,
  segments.map((_, i) => `file 'part-${i}.mp4'`).join('\n') + '\n',
);
const output = `${outputDir}/splitbrief-105s.mp4`;
run(ffmpeg, [
  '-hide_banner',
  '-loglevel',
  'error',
  '-y',
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  `${outputDir}/concat.txt`,
  '-c',
  'copy',
  '-movflags',
  '+faststart',
  output,
]);
const probe = JSON.parse(
  run(ffprobe, [
    '-v',
    'error',
    '-show_entries',
    'format=duration,size:stream=codec_name,width,height,codec_type',
    '-of',
    'json',
    output,
  ]),
);
const duration = Number(probe.format.duration);
if (duration < 90 || duration > 115) throw new Error(`Invalid final duration: ${duration}`);
await writeFile(
  'demo/EXPORT_MANIFEST.json',
  JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      output,
      durationSeconds: duration,
      source: manifest.source,
      segments,
      probe,
      audio:
        'Intentionally silent; readable burned-in captions. No simulated wallet or provider footage.',
      limits:
        'Supplied signature proves funding, not a multi-recipient payout. Local atomic execution is distinguished from public evidence. Phantom approval not captured.',
    },
    null,
    2,
  ) + '\n',
);
console.log(`Created ${output}; ${duration}s. Inspect complete export before publication.`);
