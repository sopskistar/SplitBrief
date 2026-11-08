import { expect, test, type Page } from '@playwright/test';
import {
  address,
  getAddressEncoder,
  generateKeyPairSigner,
  getTransactionCodec,
  getSignatureFromTransaction,
  partiallySignTransaction,
  compileTransaction,
  setTransactionMessageComputeUnitPrice,
} from '@solana/kit';
import { readFile } from 'node:fs/promises';
import { createPlan, type PaymentPlan } from '../../lib/payments';
import { buildPaymentMessage } from '../../lib/solana';
import { blockhash } from '@solana/kit';
import {
  CONTACTS,
  DEVNET,
  PAYER,
  PLAN,
  TEST_SIGNATURE,
  DRAFT,
  chainFixtureForPlan,
} from '../fixtures';
const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

async function seedContacts(page: Page) {
  await page.addInitScript(
    (contacts) => localStorage.setItem('splitbrief.contacts.v1', JSON.stringify(contacts)),
    CONTACTS,
  );
}
async function rpcFixture(
  page: Page,
  overrides: Record<string, unknown> = {},
  expected: PaymentPlan = PLAN,
) {
  const calls: string[] = [];
  await page.route('https://api.devnet.solana.com/', async (route) => {
    const body = route.request().postDataJSON();
    calls.push(body.method);
    const results: Record<string, unknown> = {
      getGenesisHash: DEVNET,
      getBalance: { context: { slot: 123 }, value: 1_000_000_000 },
      getLatestBlockhash: {
        context: { slot: 123 },
        value: { blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 500 },
      },
      getFeeForMessage: { context: { slot: 123 }, value: 5000 },
      getBlockHeight: 100,
      getTransaction: chainFixtureForPlan(expected, body.params?.[0] || TEST_SIGNATURE),
      getSignatureStatuses: {
        context: { slot: 123 },
        value: [{ confirmationStatus: 'finalized', err: null, slot: 123, confirmations: null }],
      },
      ...overrides,
    };
    if (body.method === 'sendTransaction')
      results.sendTransaction = getSignatureFromTransaction(
        getTransactionCodec().decode(Buffer.from(body.params[0], 'base64')),
      );
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        { jsonrpc: '2.0', id: body.id, result: results[body.method] ?? null },
        (_, value) => (typeof value === 'bigint' ? Number(value) : value),
      ),
    });
  });
  return calls;
}
async function qaWallet(page: Page, payerAddress = PAYER, mode: 'reject' | 'sign' = 'reject') {
  await page.addInitScript(
    ({ payer, publicKey, mode }) => {
      const qa = window as unknown as {
        qaWalletSignRequests: number;
        qaRequestedChain: string;
        qaSignTransaction: (wire: number[]) => Promise<number[]>;
      };
      qa.qaWalletSignRequests = 0;
      const account = {
        address: payer,
        publicKey: new Uint8Array(publicKey),
        chains: ['solana:devnet'],
        features: ['solana:signTransaction'],
      };
      let accounts: (typeof account)[] = [];
      const wallet = {
        name: 'QA wallet (simulated)',
        version: '1.0.0',
        icon: 'data:image/svg+xml;base64,PHN2Zy8+',
        chains: ['solana:devnet'],
        get accounts() {
          return accounts;
        },
        features: {
          'standard:connect': {
            version: '1.0.0',
            connect: async () => {
              accounts = [account];
              return { accounts };
            },
          },
          'standard:disconnect': {
            version: '1.0.0',
            disconnect: async () => {
              accounts = [];
            },
          },
          'standard:events': { version: '1.0.0', on: () => () => {} },
          'solana:signTransaction': {
            version: '1.0.0',
            supportedTransactionVersions: [0],
            signTransaction: async (input: { chain: string; transaction: Uint8Array }) => {
              qa.qaWalletSignRequests++;
              qa.qaRequestedChain = input.chain;
              if (mode === 'reject') throw new Error('User rejected request (QA simulated)');
              return [
                {
                  signedTransaction: new Uint8Array(
                    await qa.qaSignTransaction(Array.from(input.transaction)),
                  ),
                },
              ];
            },
          },
        },
      };
      const register = (api: { register: (wallet: unknown) => void }) => api.register(wallet);
      window.addEventListener('wallet-standard:app-ready', (event) =>
        register((event as CustomEvent).detail),
      );
      window.dispatchEvent(
        new CustomEvent('wallet-standard:register-wallet', { detail: register }),
      );
    },
    {
      payer: payerAddress,
      publicKey: Array.from(getAddressEncoder().encode(address(payerAddress))),
      mode,
    },
  );
}
async function connect(page: Page) {
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
  await page.getByRole('button', { name: 'QA wallet (simulated)', exact: true }).click();
}

test('workspace loads without a wallet and clearly labels its example', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Pay multiple people in one Solana transaction.' }),
  ).toBeVisible();
  await expect(page.getByText('Example', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review payment' })).toBeVisible();
  await page.getByRole('button', { name: 'Review payment' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Connect Phantom');
  expect(errors).toEqual([]);
});
test('contact manager adds three distinct addresses and persists them', async ({ page }) => {
  await page.goto('/');
  for (const contact of CONTACTS) {
    await page.getByLabel('Contact name', { exact: true }).fill(contact.name);
    await page.getByLabel('Solana public address', { exact: true }).fill(contact.address);
    await page.getByRole('button', { name: 'Save recipient', exact: true }).click();
  }
  await expect(page.getByText('3/3 contacts matched')).toBeVisible();
  await page.reload();
  await expect(page.getByText('3/3 contacts matched')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save recipient', exact: true })).toBeDisabled();
});
test('AI provider error exposes an honest manual composer fallback', async ({ page }) => {
  await seedContacts(page);
  await page.route('**/api/interpret', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Gemini is not configured on this server. Use Manual Mode.',
        manualAvailable: true,
      }),
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Use sample brief' }).click();
  await page.getByRole('button', { name: 'Interpret brief' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Use Manual Mode');
  await page.getByRole('button', { name: 'Manual Mode', exact: true }).click();
  await expect(page.getByText('You are composing this payment.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Amount SOL 1' })).toBeEditable();
});
test('Wallet Standard connection supports final review and cancel without signing', async ({
  page,
}) => {
  await seedContacts(page);
  const calls = await rpcFixture(page);
  await qaWallet(page);
  await page.goto('/');
  await connect(page);
  await page.getByRole('button', { name: 'Review payment' }).click();
  await expect(
    page.getByRole('heading', { name: 'Check every address before signing' }),
  ).toBeVisible();
  await expect(page.getByText('0.006005 SOL', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Cancel review', exact: true }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { qaWalletSignRequests: number }).qaWalletSignRequests,
    ),
  ).toBe(0);
  expect(calls).not.toContain('sendTransaction');
});
test('wallet rejection uses Devnet chain and never broadcasts', async ({ page }) => {
  await seedContacts(page);
  const calls = await rpcFixture(page);
  await qaWallet(page);
  await page.goto('/');
  await connect(page);
  await page.getByRole('button', { name: 'Review payment' }).click();
  await page.getByRole('button', { name: 'Approve & open Phantom' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Wallet request rejected');
  expect(
    await page.evaluate(() => (window as unknown as { qaRequestedChain: string }).qaRequestedChain),
  ).toBe('solana:devnet');
  expect(calls).not.toContain('sendTransaction');
});
test('invalid decimal draft never reaches the transaction builder RPC', async ({ page }) => {
  await seedContacts(page);
  const calls = await rpcFixture(page);
  await qaWallet(page);
  await page.goto('/');
  await connect(page);
  await page.getByRole('textbox', { name: 'Amount SOL 1' }).fill('1e-3');
  await page.getByRole('button', { name: 'Review payment' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('plain SOL decimal');
  expect(calls).not.toContain('getFeeForMessage');
  expect(calls).not.toContain('sendTransaction');
});
test('independent verifier decodes a QA RPC fixture without claiming an unknown brief match', async ({
  page,
}) => {
  await rpcFixture(page);
  await page.goto('/verify');
  await page.getByLabel('Transaction signature', { exact: true }).fill(TEST_SIGNATURE);
  await page.getByRole('button', { name: 'Verify transaction' }).click();
  await expect(page.getByRole('heading', { name: 'On-chain transaction decoded' })).toBeVisible();
  await expect(page.getByText('No expected plan was supplied.', { exact: false })).toBeVisible();
  await expect(page.getByText('Confirmed & matched', { exact: true })).toHaveCount(0);
});
test('verifier flags a mismatch against an existing saved plan', async ({ page }) => {
  await rpcFixture(page);
  await page.addInitScript(
    ({ signature, plan }) =>
      localStorage.setItem(
        'splitbrief.receipts.v1',
        JSON.stringify([
          {
            signature,
            plan: {
              ...plan,
              payer: plan.items[0].address,
              items: plan.items.map((item) => ({
                ...item,
                address:
                  item.address === plan.items[0].address
                    ? '8qjxPkP6u4VqiYaTmC8otmB86TrNY5TVp8Pt8MhFoYy'
                    : item.address,
              })),
            },
            submittedAt: new Date().toISOString(),
          },
        ]),
      ),
    { signature: TEST_SIGNATURE, plan: PLAN },
  );
  await page.goto(`/verify?signature=${TEST_SIGNATURE}`);
  await expect(page.getByRole('heading', { name: 'Does not match the saved plan' })).toBeVisible();
});
test('public pages, custom 404, metadata essentials, and keyboard entry work', async ({
  page,
  request,
}) => {
  for (const [path, heading] of [
    ['/judges', 'SplitBrief for the judges'],
    ['/privacy', 'Privacy and wallet safety'],
    ['/how-it-works', 'How SplitBrief works'],
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  expect((await request.get('/robots.txt')).status()).toBe(200);
  expect((await request.get('/sitemap.xml')).status()).toBe(200);
  expect((await request.get('/opengraph-image')).status()).toBe(200);
  const response = await page.goto('/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
});
test('workspace remains within the viewport at mobile, tablet, desktop, and wide sizes', async ({
  page,
}) => {
  for (const width of [320, 390, 820, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
test('clarification makes the old draft unpayable until explicit Manual Mode', async ({ page }) => {
  await seedContacts(page);
  await page.route('**/api/interpret', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        items: [],
        warnings: ['Specify the missing amount.'],
        clarificationNeeded: true,
        model: 'QA fixture only',
        source: 'validation',
      }),
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Use sample brief' }).click();
  await page.getByRole('button', { name: 'Interpret brief' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('Clarify the brief');
  await expect(page.getByRole('button', { name: 'Review payment' })).toBeDisabled();
  await page.getByRole('button', { name: 'Manual Mode', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Review payment' })).toBeEnabled();
});
test('an expired absent submission requires an explicit new review and never resubmits', async ({
  page,
}) => {
  const calls = await rpcFixture(page, {
    getTransaction: null,
    getSignatureStatuses: { context: { slot: 700 }, value: [null] },
    getBlockHeight: 700,
    isBlockhashValid: { context: { slot: 700 }, value: false },
  });
  await page.addInitScript(
    (signature) =>
      localStorage.setItem(
        'splitbrief.pending.v1',
        JSON.stringify({
          signature,
          blockhash: '11111111111111111111111111111111',
          lastValidBlockHeight: '500',
        }),
      ),
    TEST_SIGNATURE,
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Recheck original signature' }).click();
  const restart = page.getByRole('button', { name: 'Start a new review' });
  await expect(restart).toBeVisible();
  expect(calls).not.toContain('sendTransaction');
  await restart.click();
  await expect(page.getByRole('button', { name: 'Review payment' })).toBeEnabled();
  expect(calls).not.toContain('sendTransaction');
});
test('verified references survive reload without inventing a plan', async ({ page }) => {
  await rpcFixture(page);
  await page.goto(`/verify?signature=${TEST_SIGNATURE}`);
  await expect(page.getByRole('heading', { name: 'On-chain transaction decoded' })).toBeVisible();
  await expect(page.getByText('Saved to Recent receipts on this browser.')).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('Verified Devnet transaction', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Verified Devnet transaction', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.history-row > .badge')).toHaveText('finalized / decoded');
  await expect(page.locator('.history-row > .badge')).toBeVisible();
  await page.getByText('Verified Devnet transaction', { exact: true }).click();
  await expect(page.getByText('No expected plan was supplied.', { exact: false })).toBeVisible();
});
test('uploaded wordmark and all four navigation destinations are visible on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const logo = page.getByRole('img', { name: 'SplitBrief', exact: true });
  await expect(logo).toBeVisible();
  expect(await logo.getAttribute('src')).toBe('/branding/splitbrief-wordmark.png');
  for (const name of ['New payment', 'Verify receipt', 'How it works', 'For judges'])
    await expect(
      page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByRole('link', { name, exact: false }),
    ).toBeVisible();
  expect(
    await logo.evaluate(
      (img: HTMLImageElement) =>
        Math.abs(img.width / img.height - img.naturalWidth / img.naturalHeight) < 0.1,
    ),
  ).toBe(true);
});
test('Manual Mode cancels waiting for a slow provider and cannot be overwritten by its late response', async ({
  page,
}) => {
  await seedContacts(page);
  await page.route('**/api/interpret', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route
      .fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          warnings: ['late'],
          clarificationNeeded: true,
          model: 'QA fixture',
          source: 'validation',
        }),
      })
      .catch(() => {});
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Use sample brief' }).click();
  await page.getByRole('button', { name: 'Interpret brief', exact: true }).click();
  await page.getByRole('button', { name: 'Manual Mode', exact: true }).click();
  await expect(page.getByText('You are composing this payment.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Amount SOL 1', exact: true }).fill('0.004');
  await page.waitForTimeout(1700);
  await expect(page.getByRole('textbox', { name: 'Amount SOL 1', exact: true })).toHaveValue(
    '0.004',
  );
  await expect(page.getByRole('button', { name: 'Review payment' })).toBeEnabled();
});

test('real Wallet Standard adapter round-trips the fixed-fee message, signs once, and exports the matched receipt (QA wallet)', async ({
  page,
}) => {
  const payer = await generateKeyPairSigner(); // in-memory QA signer; never the user's Phantom
  const expected = createPlan(payer.address, DRAFT, CONTACTS);
  await page.exposeFunction('qaSignTransaction', async (wire: number[]) => {
    const tx = getTransactionCodec().decode(new Uint8Array(wire));
    const signed = await partiallySignTransaction([payer.keyPair], tx);
    return Array.from(getTransactionCodec().encode(signed));
  });
  await seedContacts(page);
  const calls = await rpcFixture(page, {}, expected);
  await qaWallet(page, payer.address, 'sign');
  await page.goto('/');
  await page.getByRole('button', { name: 'Manual Mode', exact: true }).click();
  await connect(page);
  await page.getByRole('button', { name: 'Review payment', exact: true }).click();
  await expect(page.getByText('Priority fee: 0 SOL.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Approve & open Phantom', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Payment completed', exact: true })).toBeVisible();
  expect(calls.filter((method) => method === 'sendTransaction')).toHaveLength(1);
  expect(
    await page.evaluate(
      () => (window as unknown as { qaWalletSignRequests: number }).qaWalletSignRequests,
    ),
  ).toBe(1);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download receipt JSON', exact: true }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(exported.reviewedPlan.feePolicy).toBe('fixed-zero-priority-v1');
  expect(exported.reviewedPlan.approvedFeeLamports).toBe('5000');
  expect(exported.transfers.map((t: { lamports: string }) => t.lamports)).toEqual([
    '2000000',
    '1000000',
    '3000000',
  ]);
  expect(exported.instructionCount).toBe(5);
  expect(exported.matchesPlan).toBe(true);
});

test('Wallet Standard fee mutation is blocked with a safe diagnostic and zero broadcasts (QA wallet)', async ({
  page,
}) => {
  const payer = await generateKeyPairSigner();
  const expected = createPlan(payer.address, DRAFT, CONTACTS);
  await page.exposeFunction('qaSignTransaction', async () => {
    const message = setTransactionMessageComputeUnitPrice(
      1n,
      buildPaymentMessage(expected, {
        blockhash: blockhash('11111111111111111111111111111111'),
        lastValidBlockHeight: 500n,
      }),
    );
    return Array.from(
      getTransactionCodec().encode(
        await partiallySignTransaction([payer.keyPair], compileTransaction(message)),
      ),
    );
  });
  await seedContacts(page);
  const calls = await rpcFixture(page, {}, expected);
  await qaWallet(page, payer.address, 'sign');
  await page.goto('/');
  await page.getByRole('button', { name: 'Manual Mode', exact: true }).click();
  await connect(page);
  await page.getByRole('button', { name: 'Review payment', exact: true }).click();
  await page.getByRole('button', { name: 'Approve & open Phantom', exact: true }).click();
  await expect(page.locator('p[role=alert]')).toContainText(
    'Wallet changed the reviewed transaction',
  );
  await expect(
    page.getByRole('button', { name: 'Download signing diagnostic', exact: true }),
  ).toBeVisible();
  expect(calls).not.toContain('sendTransaction');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download signing diagnostic', exact: true }).click();
  const diagnostic = JSON.parse(await readFile((await (await downloadPromise).path())!, 'utf8'));
  expect(diagnostic.differences).toContain('instructions');
  expect(diagnostic.bytesEqual).toBe(false);
  expect(JSON.stringify(diagnostic)).not.toMatch(
    /secretKey|privateKey|keyPair|signedTransaction|messageBytes/,
  );
});
