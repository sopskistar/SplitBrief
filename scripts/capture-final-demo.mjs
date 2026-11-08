import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const prod = 'https://splitbrief-zeta.vercel.app';
const local = process.env.DEMO_PREVIEW_URL || 'http://127.0.0.1:3001';
const batch = JSON.parse(await readFile('public/evidence/devnet-batch.json', 'utf8'));
const brief =
  'Pay Ada 0.002 SOL for design, Chidi 0.001 SOL for delivery, and send 0.003 SOL to Reserve.';
const dir = 'demo/raw/final';
await mkdir(dir, { recursive: true });
const b = await chromium.launch();
let clips = [];
try {
  clips = JSON.parse(await readFile('demo/FINAL_CAPTURE_MANIFEST.json', 'utf8')).clips;
} catch {}
async function navigate(p, url, options = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', ...options });
      return;
    } catch (error) {
      if (!/ERR_NETWORK_CHANGED|ERR_CONNECTION/.test(String(error)) || attempt === 2) throw error;
      await p.waitForTimeout(800);
    }
  }
}
async function capture(name, origin, action) {
  if (clips.some((c) => c.name === name)) {
    console.log('Keeping genuine existing capture: ' + name);
    return;
  }
  const c = await b.newContext({
    viewport: { width: 1600, height: 1000 },
    reducedMotion: 'reduce',
    recordVideo: { dir, size: { width: 1600, height: 1000 } },
  });
  const p = await c.newPage();
  const start = Date.now();
  const marks = {};
  const rects = {};
  const mark = (id) => (marks[id] = (Date.now() - start) / 1000);
  async function frame(id, selector) {
    if (selector) rects[id] = await p.locator(selector).boundingBox();
    mark(id);
    await p.screenshot({ path: `${dir}/${name}-${id}.png` });
  }
  await action(p, mark, frame);
  mark('end');
  const video = p.video();
  await c.close();
  const path = `${dir}/${name}.webm`;
  await rename(await video.path(), path);
  clips.push({
    name,
    path,
    origin,
    marks,
    rects,
    sha256: createHash('sha256')
      .update(await readFile(path))
      .digest('hex'),
  });
  console.log(JSON.stringify(clips.at(-1)));
}
try {
  await capture('workspace', prod, async (p, mark, frame) => {
    await navigate(p, prod, { waitUntil: 'networkidle' });
    await p.locator('.wallet-control[data-hydrated="true"]').waitFor();
    await p.evaluate(() => document.fonts.ready);
    await frame('home');
    await p.waitForTimeout(5000);
    await p.getByRole('button', { name: 'Load disposable demo recipients', exact: true }).click();
    await p.getByText('3/3 contacts matched').waitFor();
    await p
      .locator('.brief-panel')
      .evaluate((n) => window.scrollBy(0, n.getBoundingClientRect().top - 100));
    await frame('brief', '.brief-panel');
    await p
      .getByLabel('Payment instruction', { exact: true })
      .pressSequentially(brief, { delay: 55 });
    await p.waitForTimeout(4500);
    await frame('typed', '.brief-panel');
    // Manual editor demonstration is explicitly labeled; recorded Gemini output is a separate shot.
    await p.getByRole('button', { name: 'Manual Mode', exact: true }).click();
    await p
      .locator('.draft-panel')
      .evaluate((n) => window.scrollBy(0, n.getBoundingClientRect().top - 100));
    await frame('draft', '.draft-panel');
    await p.waitForTimeout(2500);
    await p.getByLabel('Purpose 1', { exact: true }).fill('');
    await p
      .getByLabel('Purpose 1', { exact: true })
      .pressSequentially('Design work', { delay: 100 });
    await p.waitForTimeout(3500);
    await frame('edited', '.draft-panel');
    await p
      .locator('#contacts')
      .evaluate((n) => window.scrollBy(0, n.getBoundingClientRect().top - 100));
    await frame('contacts', '#contacts');
    await p.waitForTimeout(8000);
  });
  await capture('recorded-ai', local, async (p, mark, frame) => {
    await navigate(p, `${local}/judges`, { waitUntil: 'networkidle' });
    await p
      .locator('#ai-evidence')
      .evaluate((n) => window.scrollBy(0, n.getBoundingClientRect().top - 180));
    await p.evaluate(() => document.fonts.ready);
    await frame('result', '#ai-evidence');
    await p.waitForTimeout(17500);
  });
  await capture('batch-receipt', prod, async (p, mark, frame) => {
    await navigate(p, `${prod}/verify?signature=${batch.signature}`, {
      waitUntil: 'domcontentloaded',
    });
    await p
      .getByRole('heading', { name: 'On-chain transaction decoded', exact: true })
      .waitFor({ timeout: 65000 });
    await p
      .locator('.receipt-panel')
      .evaluate((n) => window.scrollBy(0, n.getBoundingClientRect().top - 80));
    await frame('top', '.receipt-panel');
    await p.waitForTimeout(8500);
    await p
      .locator('.receipt-transfers')
      .evaluate((n) => window.scrollBy(0, n.getBoundingClientRect().top - 100));
    await frame('transfers', '.receipt-transfers');
    await p.waitForTimeout(8000);
    await p
      .getByRole('button', { name: 'Copy receipt summary', exact: true })
      .scrollIntoViewIfNeeded();
    await frame('summary', '.receipt-facts');
    await p.getByRole('button', { name: 'Copy signature', exact: true }).click();
    await p.waitForTimeout(5500);
  });
  await capture('explorer', prod, async (p, mark, frame) => {
    await navigate(p, `https://explorer.solana.com/tx/${batch.signature}?cluster=devnet`, {
      waitUntil: 'domcontentloaded',
    });
    await p
      .getByText('Transaction', { exact: true })
      .first()
      .waitFor({ timeout: 45000 })
      .catch(() => {});
    await p.waitForTimeout(8000);
    await frame('explorer');
    await p.waitForTimeout(6000);
  });
} finally {
  await b.close();
  await writeFile(
    'demo/FINAL_CAPTURE_MANIFEST.json',
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        signature: batch.signature,
        clips,
        walletApprovalClip: false,
        originalPlanRecovered: false,
        notes:
          'Fresh production workspace and real RPC receipt. The recorded Gemini component displays the genuine published provider record, not a simulated live response. No wallet or RPC fixtures, no payments sent.',
      },
      null,
      2,
    ) + '\n',
  );
}
