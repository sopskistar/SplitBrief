import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const secret = process.env.GEMINI_API_KEY?.trim();
if (!secret) throw new Error('Local key is absent; exact-value leak scan was not performed.');
const sources = [
  ...new Set(
    execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { encoding: 'utf8' })
      .split('\0')
      .filter(Boolean),
  ),
];
const assets = [];
function visit(path) {
  for (const name of readdirSync(path)) {
    const file = join(path, name);
    if (statSync(file).isDirectory()) visit(file);
    else assets.push(file);
  }
}
visit('.next/static');
for (const file of [...sources, ...assets]) {
  try {
    if (readFileSync(file).includes(secret))
      throw new Error(`Secret detected in Git-eligible/client file: ${file}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
for (const [original, copy] of [
  ['SplitBrief_Transparent_Icon.png', 'public/branding/splitbrief-icon.png'],
  ['SplitBrief_Transparent_Wordmark.png', 'public/branding/splitbrief-wordmark.png'],
]) {
  if (!readFileSync(original).equals(readFileSync(copy)))
    throw new Error('Branding copy differs from supplied original.');
}
console.log(
  JSON.stringify({
    keyExists: true,
    gitEligibleFilesScanned: sources.length,
    clientAssetsScanned: assets.length,
    keyOccurrences: 0,
    suppliedBrandCopiesByteIdentical: true,
  }),
);
