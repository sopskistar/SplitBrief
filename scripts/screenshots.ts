import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001';
const browser = await chromium.launch({ headless: true });
await mkdir('docs/screenshots', { recursive: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const screenshots: string[] = [];
const errors: string[] = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.locator('.wallet-control[data-hydrated="true"]').waitFor();
  await page.screenshot({ path: 'docs/screenshots/workspace-desktop.png', fullPage: true });
  screenshots.push('workspace-desktop.png');
  await page.getByRole('button', { name: 'Load disposable demo recipients' }).click();
  await page.getByText('3/3 contacts matched').waitFor();
  await page.getByRole('button', { name: 'Manual Mode', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/manual-draft-desktop.png', fullPage: true });
  screenshots.push('manual-draft-desktop.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/screenshots/workspace-mobile.png', fullPage: true });
  screenshots.push('workspace-mobile.png');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseURL}/judges`, { waitUntil: 'networkidle' });
  await page.locator('.wallet-control[data-hydrated="true"]').waitFor();
  await page.screenshot({ path: 'docs/screenshots/judges-desktop.png', fullPage: true });
  screenshots.push('judges-desktop.png');
  await page.goto(`${baseURL}/verify`, { waitUntil: 'networkidle' });
  await page.locator('.wallet-control[data-hydrated="true"]').waitFor();
  await page.screenshot({ path: 'docs/screenshots/verifier-empty.png', fullPage: true });
  screenshots.push('verifier-empty.png');
  if (errors.length) throw new Error(`Browser exception during capture: ${errors[0]}`);
  await writeFile(
    'docs/screenshots/manifest.json',
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        source: baseURL,
        screenshots,
        kind: 'Actual app screens. No mocked RPC, wallet, or provider responses; no confirmed transaction claimed.',
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await context.close();
  await browser.close();
}
