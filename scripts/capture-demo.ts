import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { chromium, type Page } from '@playwright/test';
import { SAMPLE_BRIEF } from '../lib/payments';
import { validateInterpretation } from '../lib/interpreter';

// Public production footage. Never intercept RPC/AI, inject a wallet, or invent a receipt.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://splitbrief-zeta.vercel.app';
const chain = JSON.parse(await readFile('public/evidence/devnet.json', 'utf8'));
if (!chain.networkTransactionVerified || !chain.signature)
  throw new Error('Real public-chain evidence is required.');
const browser = await chromium.launch({ headless: true });
await mkdir('demo/raw/delivery', { recursive: true });
await mkdir('.local-evidence', { recursive: true });
const clips: Record<string, unknown>[] = [];
const marks: Record<string, number> = {};
const manifest: Record<string, unknown> = {
  capturedAt: new Date().toISOString(),
  source: baseURL,
  clips,
  marks,
  realAIClip: false,
  walletApprovalClip: false,
  publicDevnetReceiptClip: false,
  publicBatchPaymentVerified: chain.success === true,
  signature: chain.signature,
  notes:
    'Actual production UI and network responses. Provider waiting may be shortened with an explicit caption. No wallet approval footage exists. Funding is never presented as a batch payout; Surfpool is explicitly local.',
};
async function capture(
  name: string,
  targetMs: number,
  action: (page: Page, elapsed: () => number) => Promise<void>,
) {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    reducedMotion: 'reduce',
    recordVideo: { dir: 'demo/raw/delivery', size: { width: 1600, height: 900 } },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const started = Date.now();
  await action(page, () => (Date.now() - started) / 1000);
  const remaining = targetMs - (Date.now() - started);
  if (remaining > 0) await page.waitForTimeout(remaining);
  const video = page.video()!;
  await context.close();
  if (errors.length) throw new Error(`Capture browser exception: ${errors[0]}`);
  const path = `demo/raw/delivery/${name}.webm`;
  await rename(await video.path(), path);
  clips.push({ name, path, elapsedMs: Date.now() - started, source: baseURL });
  console.log(`Genuine capture saved: ${path}`);
}
const logo = (await readFile('public/branding/splitbrief-wordmark.png')).toString('base64');
const slate = (heading: string, subtitle: string) =>
  `<html><body style="margin:0;background:#F7F8F5;color:#171B23;font-family:Arial,sans-serif;display:flex;align-items:center;height:100vh"><div style="padding:100px;max-width:1300px"><img src="data:image/png;base64,${logo}" style="width:380px;height:auto"><p style="font-size:23px;color:#534CE8;margin-top:40px">MLH SOLANA HACKATHON · NOVEMBER 2026</p><h1 style="font-size:64px;line-height:1.12;letter-spacing:-2px;max-width:1100px">${heading}</h1><p style="font-size:27px;line-height:1.6;max-width:1100px">${subtitle}</p><p style="font-size:19px;margin-top:48px;color:#666C70">Solana Devnet · Test tokens have no real financial value</p></div></body></html>`;
try {
  await capture('01-opening', 8000, async (page) => {
    await page.setContent(
      slate(
        'Built for the MLH Solana Hackathon.',
        'SplitBrief turns payment instructions into one reviewed Solana transaction.',
      ),
    );
  });
  await capture('02-product', 0, async (page, elapsed) => {
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.locator('.wallet-control[data-hydrated="true"]').waitFor();
    await page.getByRole('button', { name: 'Load disposable demo recipients' }).click();
    await page.getByText('3/3 contacts matched').waitFor();
    await page.locator('#contacts').scrollIntoViewIfNeeded();
    await page.waitForTimeout(5000);
    await page.locator('#payment-brief').scrollIntoViewIfNeeded();
    await page
      .getByLabel('Payment instruction', { exact: true })
      .pressSequentially(SAMPLE_BRIEF, { delay: 25 });
    if (elapsed() < 20) await page.waitForTimeout((20 - elapsed()) * 1000);
    marks.aiStart = elapsed();
    const started = Date.now();
    page.on('requestfailed', (request) => {
      if (request.url().endsWith('/api/interpret'))
        console.log('Interpreter browser transport:', request.failure()?.errorText);
    });
    console.log('Starting genuine production browser interpretation.');
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/interpret') && response.request().method() === 'POST',
      { timeout: 295_000 },
    );
    await page.getByRole('button', { name: 'Interpret brief', exact: true }).click();
    const response = await responsePromise.catch(() => null);
    const raw = response
      ? await response.json()
      : { error: 'Browser response deadline exceeded; inspect recorded client state.' };
    marks.aiEnd = elapsed();
    const live: Record<string, unknown> = {
      checkedAt: new Date().toISOString(),
      source: `${baseURL}/api/interpret`,
      status: response?.status() ?? null,
      elapsedMs: Date.now() - started,
      success: false,
    };
    if (response?.ok() && raw.source === 'gemini') {
      const result = validateInterpretation(
        { items: raw.items, warnings: raw.warnings, clarificationNeeded: raw.clarificationNeeded },
        {
          instruction: SAMPLE_BRIEF,
          recipientNames: ['Ada', 'Chidi', 'Reserve'],
        },
      );
      if (result.clarificationNeeded || result.items.length !== 3)
        throw new Error('Live API returned clarification instead of the expected draft.');
      live.success = true;
      live.response = result;
      manifest.realAIClip = true;
      await page.getByText(/Real Gemini output/).waitFor();
      const evidence = JSON.parse(await readFile('public/evidence/gemini.json', 'utf8'));
      evidence.productionHTTP = live;
      await writeFile('public/evidence/gemini.json', JSON.stringify(evidence, null, 2) + '\n');
    } else {
      live.error = raw;
      live.clientMessages = await page.getByRole('alert').allTextContents();
      await page.getByRole('button', { name: 'Manual Mode', exact: true }).click();
      await page.getByText('You are composing this payment.').waitFor();
    }
    await writeFile('.local-evidence/live-gemini.json', JSON.stringify(live, null, 2) + '\n');
    console.log(JSON.stringify(live));
    await page.getByRole('heading', { name: 'Payment draft' }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(15000);
    await page.getByLabel('Purpose 1', { exact: true }).fill('Design review');
    await page.getByRole('heading', { name: 'Payment summary' }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(14000);
  });
  await capture('03-verification', 0, async (page, elapsed) => {
    await page.goto(`${baseURL}/verify?signature=${chain.signature}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .getByRole('heading', { name: 'On-chain transaction decoded' })
      .waitFor({ timeout: 65_000 });
    await page.locator('.receipt-panel').scrollIntoViewIfNeeded();
    marks.receiptVisible = elapsed();
    manifest.publicDevnetReceiptClip = true;
    await page.screenshot({
      path: 'docs/screenshots/production-receipt-desktop.png',
      fullPage: true,
    });
    await page.waitForTimeout(13000);
    await page.getByText('Other program instructions (2)', { exact: true }).click();
    await page
      .getByRole('button', { name: 'Copy receipt summary', exact: true })
      .scrollIntoViewIfNeeded();
    await page.waitForTimeout(12000);
  });
  await capture('06-recorded-ai', 17000, async (page) => {
    await page.goto(`${baseURL}/evidence/gemini.json`, { waitUntil: 'networkidle' });
    // Only typography changes: this is the genuine published provider record, not a simulated draft.
    await page.locator('pre').evaluate((node) => {
      node.style.fontSize = '23px';
      node.style.lineHeight = '1.45';
      node.style.whiteSpace = 'pre-wrap';
    });
    await page.waitForTimeout(16000);
  });
  await capture('04-local-proof', 18000, async (page) => {
    await page.goto(`${baseURL}/judges`, { waitUntil: 'networkidle' });
    await page
      .getByRole('heading', { name: 'Evidence, with its limits.' })
      .scrollIntoViewIfNeeded();
    await page.waitForTimeout(9000);
    await page.goto(`${baseURL}/evidence/local-chain.json`);
    await page.waitForTimeout(8000);
  });
  await capture('05-close', 9000, async (page) => {
    await page.setContent(
      slate(
        'AI drafts. You approve. Solana verifies.',
        'Live Gemini and local atomic execution verified. The supplied public signature proves wallet funding; a public batch payout and Phantom approval clip remain to be recorded.',
      ),
    );
  });
} finally {
  await writeFile('demo/CAPTURE_MANIFEST.json', JSON.stringify(manifest, null, 2) + '\n');
  await browser.close();
}
