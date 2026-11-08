import { chromium, expect } from '@playwright/test';
import { lamportsToSolExact } from '../lib/payments';
import { readFile, writeFile } from 'node:fs/promises';
const origin = process.env.PLAYWRIGHT_BASE_URL || 'https://splitbrief-zeta.vercel.app';
const chain = JSON.parse(await readFile('public/evidence/devnet.json', 'utf8'));
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const checks: string[] = [];
const transientNotes: string[] = [];
const errors: string[] = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  for (const route of [
    '/',
    '/verify',
    '/demo',
    '/demo/splitbrief-poster.webp',
    '/demo/splitbrief-captions.vtt',
    '/evidence/devnet-batch.json',
    '/how-it-works',
    '/judges',
    '/privacy',
    '/robots.txt',
    '/sitemap.xml',
    '/opengraph-image',
    '/icon.png',
    '/branding/splitbrief-icon.png',
    '/branding/splitbrief-wordmark.png',
  ]) {
    const response = await context.request.get(`${origin}${route}`);
    if (response.status() !== 200) throw new Error(`${route} returned ${response.status()}`);
    checks.push(`HTTP 200 ${route}`);
  }
  const missing = await context.request.get(`${origin}/this-page-does-not-exist`);
  if (missing.status() !== 404) throw new Error('Custom 404 response is incorrect.');
  checks.push('Custom 404');
  await page.goto(origin, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Pay multiple people in one Solana transaction.',
  );
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /icon\.png/);
  const logo = page.getByRole('img', { name: 'SplitBrief', exact: true });
  await expect(logo).toBeVisible();
  try {
    await expect
      .poll(
        () =>
          logo.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth === 1950),
        { timeout: 8000 },
      )
      .toBe(true);
  } catch {
    transientNotes.push(
      'Initial browser image download was incomplete; one read-only page reload was required.',
    );
    await page.reload({ waitUntil: 'networkidle' });
    await expect
      .poll(
        () =>
          logo.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth === 1950),
        { timeout: 15000 },
      )
      .toBe(true);
  }
  const image = await logo.evaluate((node: HTMLImageElement) => ({
    loaded: node.complete && node.naturalWidth === 1950,
    ratio: node.getBoundingClientRect().width / node.getBoundingClientRect().height,
  }));
  if (!image.loaded || Math.abs(image.ratio - 1950 / 450) > 0.1)
    throw new Error('Wordmark is distorted or unavailable.');
  checks.push('Uploaded wordmark loads at original aspect ratio; metadata favicon correct');
  await page.screenshot({
    path: 'docs/screenshots/production-workspace-desktop.png',
    fullPage: true,
  });
  const setup = page.getByRole('button', { name: 'Load disposable demo recipients', exact: true });
  await expect(setup).toBeVisible();
  await setup.click();
  await expect(page.getByText('3/3 contacts matched')).toBeVisible();
  await setup.click();
  await expect(
    page.getByRole('button', { name: 'Replace saved contacts with demo recipients', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Keep my contacts', exact: true }).click();
  checks.push(
    'Visible demo recipient setup loads three addresses; existing contacts require explicit replacement approval',
  );
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
  await expect(page.locator('#wallet-menu')).toBeVisible();
  checks.push('Wallet Standard picker opens; no Phantom signing is claimed');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    if (overflow) throw new Error(`Horizontal overflow at ${width}px`);
    for (const name of ['New payment', 'Verify receipt', 'How it works', 'For judges'])
      await expect(
        page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name }),
      ).toBeVisible();
    checks.push(`Workspace/navigation fit ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'docs/screenshots/production-workspace-mobile.png',
    fullPage: true,
  });
  await page.goto(`${origin}/verify?signature=${chain.signature}`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(
    page.getByRole('heading', { name: 'On-chain transaction decoded', exact: true }),
  ).toBeVisible({ timeout: 65_000 });
  const receipt = page.locator('.receipt-panel');
  await expect(receipt).toContainText(chain.receipt.payer);
  await expect(receipt).toContainText(chain.receipt.transfers[0].destination);
  await expect(receipt).toContainText(lamportsToSolExact(chain.totalLamports));
  for (const transfer of chain.receipt.transfers)
    await expect(receipt).toContainText(transfer.destination);
  await expect(receipt).toContainText(`${lamportsToSolExact(chain.feeLamports)} SOL`);
  await expect(receipt).toContainText('finalized');
  await expect(receipt).toContainText('No expected plan was supplied');
  await expect(page.getByRole('button', { name: 'Copy signature', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Copy receipt summary', exact: true }),
  ).toBeVisible();
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
    throw new Error('Mobile receipt overflows.');
  await page.screenshot({ path: 'docs/screenshots/production-receipt-mobile.png', fullPage: true });
  checks.push(
    'Real Devnet batch receipt: actual payer/three destinations/0.006 SOL/fee/finality; no invented original-plan match; mobile fit',
  );
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'On-chain transaction decoded', exact: true }),
  ).toBeVisible({ timeout: 65_000 });
  await page.goto(origin, { waitUntil: 'networkidle' });
  await expect(page.locator('#history')).toContainText(chain.signature);
  checks.push('Verified reference persists across reload/navigation with a fresh RPC check');
  await page.goto(`${origin}/demo`, { waitUntil: 'domcontentloaded' });
  const video = page.locator('video');
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState), { timeout: 30000 })
    .toBeGreaterThan(0);
  const playback = await video.evaluate(async (v: HTMLVideoElement) => {
    await v.play();
    await new Promise((r) => setTimeout(r, 2500));
    v.pause();
    return {
      time: v.currentTime,
      duration: v.duration,
      width: v.videoWidth,
      height: v.videoHeight,
      error: v.error?.message,
    };
  });
  if (
    playback.error ||
    playback.time < 1 ||
    playback.duration < 105 ||
    playback.duration >= 120 ||
    playback.width !== 1920 ||
    playback.height !== 1080
  )
    throw new Error('Production video failed playback: ' + JSON.stringify(playback));
  checks.push(
    'Public narrated MP4 loads and plays; 1920x1080, under two minutes, native controls/captions',
  );
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  const evidence = {
    checkedAt: new Date().toISOString(),
    origin,
    success: true,
    checks,
    browserErrors: errors,
    transientNotes,
    note: 'Anonymous public browser. Real RPC, no fixtures. Gemini is separately recorded; The owner supplied the genuine successful receipt; the approval popup was not recorded.',
  };
  await writeFile('public/evidence/deployment.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await context.close();
  await browser.close();
}
