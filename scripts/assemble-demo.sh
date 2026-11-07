#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for clip in demo/raw/01-opening.webm demo/raw/02-product.webm demo/raw/03-phantom-receipt.mp4 demo/raw/04-close.webm; do
  if [ ! -f "$clip" ]; then
    printf 'Missing genuine source clip: %s\nSee docs/DEMO_SHOTLIST.md. No final video was created.\n' "$clip" >&2
    exit 1
  fi
done
if ! command -v ffmpeg >/dev/null || ! command -v ffprobe >/dev/null; then
  printf 'Full FFmpeg and ffprobe are required. On Ubuntu: sudo apt install ffmpeg\n' >&2
  exit 1
fi
node -e "const fs=require('fs'); const ai=JSON.parse(fs.readFileSync('public/evidence/gemini.json')); const chain=JSON.parse(fs.readFileSync('public/evidence/devnet.json')); if(!ai.success || !chain.success) { console.error('Live AI or public Devnet evidence is still missing. Update genuine evidence before assembling the final submission video.'); process.exit(1); }"
mkdir -p demo/output
clips=(demo/raw/01-opening.webm demo/raw/02-product.webm demo/raw/03-phantom-receipt.mp4 demo/raw/04-close.webm)
durations=(10 40 45 10)
for index in 0 1 2 3; do
  ffmpeg -hide_banner -loglevel warning -y -i "${clips[$index]}" -t "${durations[$index]}" -vf 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p' -c:v libx264 -preset medium -crf 20 -an "demo/output/part-$index.mp4"
done
printf "file 'part-0.mp4'\nfile 'part-1.mp4'\nfile 'part-2.mp4'\nfile 'part-3.mp4'\n" > demo/output/concat.txt
ffmpeg -hide_banner -loglevel warning -y -f concat -safe 0 -i demo/output/concat.txt -c copy -movflags +faststart demo/output/splitbrief-105s.mp4
if [ -f demo/raw/narration.wav ]; then
  ffmpeg -hide_banner -loglevel warning -y -i demo/output/splitbrief-105s.mp4 -i demo/raw/narration.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -af apad -t 105 -movflags +faststart demo/output/splitbrief-105s-narrated.mp4
fi
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 demo/output/splitbrief-105s.mp4
printf 'Created demo/output/splitbrief-105s.mp4. Watch the entire video and confirm it is between 90 and 115 seconds before submission.\n'
