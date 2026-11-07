import { expect, test, type Page } from '@playwright/test';
import { address, getAddressEncoder } from '@solana/kit';
import { CONTACTS, DEVNET, PAYER, PLAN, TEST_SIGNATURE, chainFixture } from '../fixtures';
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
async function rpcFixture(page: Page, overrides: Record<string, unknown> = {}) {
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
      getTransaction: chainFixture(),
      getSignatureStatuses: {
        context: { slot: 123 },
        value: [{ confirmationStatus: 'finalized', err: null, slot: 123, confirmations: null }],
      },
      ...overrides,
    };
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
async function qaWallet(page: Page) {
  await page.addInitScript(
    ({ payer, publicKey }) => {
      const qa = window as unknown as { qaWalletSignRequests: number; qaRequestedChain: string };
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
            signTransaction: async (input: { chain: string }) => {
              qa.qaWalletSignRequests++;
              qa.qaRequestedChain = input.chain;
              throw new Error('User rejected request (QA simulated)');
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
    { payer: PAYER, publicKey: Array.from(getAddressEncoder().encode(address(PLAN.payer))) },
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
  await expect(page.getByRole('heading', { name: 'A brief. A batch. All settled.' })).toBeVisible();
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
    ['/judges', 'The brief becomes the payment.'],
    ['/privacy', 'Your brief, your wallet.'],
    ['/how-it-works', 'Plain words. Precise payments.'],
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  expect((await request.get('/robots.txt')).status()).toBe(200);
  expect((await request.get('/sitemap.xml')).status()).toBe(200);
  expect((await request.get('/opengraph-image')).status()).toBe(200);
  const response = await page.goto('/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'This page didn’t settle here.' })).toBeVisible();
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
