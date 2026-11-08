import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const batch = JSON.parse(
  await readFile(new URL('../../public/evidence/devnet-batch.json', import.meta.url), 'utf8'),
);

test('homepage leads to the demo without obscuring the payment editor', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#payment-editor')).toBeVisible();
  await page
    .locator('.intro-actions')
    .getByRole('link', { name: 'Watch demo', exact: true })
    .click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'SplitBrief, in under two minutes.',
  );
  await page.getByText('AI prepares an editable draft.', { exact: true }).click();
  await expect(page.getByText(/Google Gemini extracts the exact amounts:/)).toBeVisible();
});

test('finished demo loads and plays real H264/AAC media with audible narration', async ({
  page,
}) => {
  await page.goto('/demo');
  const video = page.getByLabel('SplitBrief narrated product demo');
  await expect(video).toHaveAttribute('controls', '');
  await expect(video).toHaveAttribute('preload', 'metadata');
  await expect(video.locator('track')).toHaveAttribute('kind', 'captions');
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(0);
  const metadata = await video.evaluate((v: HTMLVideoElement) => ({
    duration: v.duration,
    width: v.videoWidth,
    height: v.videoHeight,
    autoplay: v.autoplay,
    muted: v.muted,
  }));
  expect(metadata).toMatchObject({ width: 1920, height: 1080, autoplay: false, muted: false });
  expect(metadata.duration).toBeGreaterThanOrEqual(105);
  expect(metadata.duration).toBeLessThan(120);
  const playback = await video.evaluate(async (v: HTMLVideoElement) => {
    const context = new AudioContext();
    // Headless Linux has no speaker device. A silent output sink keeps its audio
    // clock running while the analyser measures the real decoded AAC samples.
    await (
      context as AudioContext & { setSinkId: (sink: { type: 'none' }) => Promise<void> }
    ).setSinkId({ type: 'none' });
    const source = context.createMediaElementSource(v);
    const analyser = context.createAnalyser();
    source.connect(analyser);
    analyser.connect(context.destination);
    await context.resume();
    await v.play();
    let peak = 0;
    const samples = new Float32Array(analyser.fftSize);
    const start = performance.now();
    while (performance.now() - start < 2600) {
      analyser.getFloatTimeDomainData(samples);
      peak = Math.max(peak, Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length));
      await new Promise((r) => setTimeout(r, 50));
    }
    const result = { time: v.currentTime, peak, error: v.error?.message };
    v.pause();
    await context.close();
    return result;
  });
  expect(playback.error).toBeUndefined();
  expect(playback.time).toBeGreaterThan(1.5);
  expect(playback.peak).toBeGreaterThan(0.015);
});

test('demo, proof and native video fit narrow mobile screens', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/demo');
    await expect(page.getByLabel('SplitBrief narrated product demo')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByRole('link', { name: 'Inspect on-chain receipt' })).toHaveAttribute(
      'href',
      `/verify?signature=${batch.signature}`,
    );
  }
});

test('judges see the demo, genuine batch and clearly labeled recorded AI', async ({ page }) => {
  await page.goto('/judges');
  await expect(page.getByRole('heading', { name: 'Watch the 2-minute demo' })).toBeVisible();
  await expect(page.locator('.batch-proof')).toContainText(batch.signature);
  await expect(page.locator('.batch-proof')).toContainText('0.006');
  await expect(page.locator('.batch-proof')).toContainText(
    'independent original-plan match is not claimed',
  );
  await expect(page.locator('#ai-evidence')).toContainText('Recorded output, not a live request');
  await expect(page.locator('#ai-evidence tbody tr')).toHaveCount(3);
  await expect(page.locator('.owner-receipt img')).toHaveAttribute(
    'src',
    /successful-devnet-receipt/,
  );
});
