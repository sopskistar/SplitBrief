import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { chromium, type Page } from '@playwright/test';
import { SAMPLE_BRIEF } from '../lib/payments';

// Genuine product footage only. No route interception, fake wallet, mock AI, or mock RPC.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001';
const browser = await chromium.launch({ headless: true });
await mkdir('demo/raw', { recursive: true });
const aiEvidence = JSON.parse(await readFile('public/evidence/gemini.json', 'utf8'));
const clips: Record<string, unknown>[] = [];
async function capture(name: string, targetMs: number, action: (page: Page) => Promise<void>) {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    reducedMotion: 'reduce',
    recordVideo: { dir: 'demo/raw', size: { width: 1600, height: 900 } },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const started = Date.now();
  await action(page);
  const remaining = targetMs - (Date.now() - started);
  if (remaining > 0) await page.waitForTimeout(remaining);
  const video = page.video()!;
  await context.close();
  if (errors.length) throw new Error(`Browser exception during capture: ${errors[0]}`);
  const output = `demo/raw/${name}.webm`;
  await rename(await video.path(), output);
  clips.push({ path: output, elapsedMs: Date.now() - started, source: baseURL });
  console.log(`Captured actual footage: ${output}`);
}
const slate = (title: string, subtitle: string) =>
  `<html><body style="margin:0;background:#F7F8F5;color:#171B23;font-family:Arial,sans-serif;display:grid;place-items:center;height:100vh"><div style="max-width:1200px;padding:80px"><p style="font-size:28px;color:#534CE8">SplitBrief</p><h1 style="font-size:70px;line-height:1.1;letter-spacing:-3px">${title}</h1><p style="font-size:30px;color:#666C70">${subtitle}</p><p style="font-size:20px;margin-top:70px">Solana Devnet. Test tokens have no real financial value.</p></div></body></html>`;
try {
  await capture('01-opening', 10_000, async (page) => {
    await page.setContent(
      slate(
        'Built for the MLH Solana Hackathon.',
        'From payment instructions to one Solana transaction.',
      ),
    );
    await page.waitForTimeout(6500);
    await page.goto(baseURL);
  });
  await capture('02-product', 40_000, async (page) => {
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.locator('.wallet-control[data-hydrated="true"]').waitFor();
    await page.getByRole('button', { name: 'Load disposable demo recipients' }).click();
    await page.getByText('3/3 contacts matched').waitFor();
    await page.locator('#contacts').scrollIntoViewIfNeeded();
    await page.waitForTimeout(4000);
    await page.locator('#payment-brief').scrollIntoViewIfNeeded();
    await page
      .getByLabel('Payment instruction', { exact: true })
      .pressSequentially(SAMPLE_BRIEF, { delay: 25 });
    if (aiEvidence.success) {
      await page.getByRole('button', { name: 'Interpret brief', exact: true }).click();
      await page.getByText(/Real Gemini output/).waitFor({ timeout: 30_000 });
    } else {
      await page.getByRole('button', { name: 'Manual Mode', exact: true }).click();
      await page.getByText('You are composing this payment.').waitFor();
    }
    await page.getByRole('heading', { name: 'Payment draft' }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(6000);
    await page.getByLabel('Purpose 1', { exact: true }).fill('Design review');
    await page.getByRole('heading', { name: 'The payment, together.' }).scrollIntoViewIfNeeded();
  });
  await capture('04-close', 10_000, async (page) => {
    await page.goto(`${baseURL}/judges`, { waitUntil: 'networkidle' });
    await page.locator('.wallet-control[data-hydrated="true"]').waitFor();
    await page.waitForTimeout(6500);
    await page.setContent(
      slate(
        'One signature. Every recipient.',
        'AI interprets the brief. Solana makes the payment verifiable.',
      ),
    );
  });
  await writeFile(
    'demo/CAPTURE_MANIFEST.json',
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        clips,
        realAIClip: Boolean(aiEvidence.success),
        walletApprovalClip: false,
        publicDevnetReceiptClip: false,
        missing: [
          'demo/raw/03-phantom-receipt.mp4: user records genuine Phantom review, approval, confirmed receipt, and Explorer',
          ...(!aiEvidence.success
            ? [
                'Replace 02-product with a successful live Gemini interpretation before claiming the AI Track demo is verified.',
              ]
            : []),
        ],
        notes:
          'No simulated wallet, model, or RPC was used. Opening/closing title slates are motion-title material, not blockchain evidence.',
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser.close();
}
