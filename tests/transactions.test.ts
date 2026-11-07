import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  assertIsTransactionWithBlockhashLifetime,
  assertIsTransactionWithinSizeLimit,
  blockhash,
  compileTransaction,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  partiallySignTransaction,
  type KeyPairSigner,
  type TransactionModifyingSigner,
} from '@solana/kit';
import { parseTransferSolInstruction } from '@solana-program/system';
import {
  assertDevnet,
  assertWalletReady,
  buildPaymentMessage,
  canRetirePendingSubmission,
  fetchReceipt,
  preparePayment,
  signAndSubmit,
  SubmissionGate,
  validateSignedTransaction,
  waitForReceipt,
  type AppRpc,
} from '../lib/solana';
import { createPlan, type PaymentPlan } from '../lib/payments';
import { CONTACTS, DEVNET, DRAFT, PLAN, TEST_SIGNATURE, chainFixture } from './fixtures';

const LIFETIME = {
  blockhash: blockhash('11111111111111111111111111111111'),
  lastValidBlockHeight: 500n,
};
let payer: KeyPairSigner;
let plan: PaymentPlan;
let signer: TransactionModifyingSigner;
beforeAll(async () => {
  payer = await generateKeyPairSigner();
  plan = createPlan(payer.address, DRAFT, CONTACTS);
  signer = {
    address: payer.address,
    modifyAndSignTransactions: async (transactions) =>
      Promise.all(
        transactions.map(async (tx) => {
          const signed = await partiallySignTransaction([payer.keyPair], tx);
          assertIsTransactionWithBlockhashLifetime(signed);
          assertIsTransactionWithinSizeLimit(signed);
          return signed;
        }),
      ),
  };
});
function fakeRpc(expected = PLAN) {
  const genesis = vi.fn(async () => DEVNET);
  const getTx = vi.fn(async (sig: string) => chainFixture(expected, sig));
  const send = vi.fn(async () => TEST_SIGNATURE);
  const fee = vi.fn(async () => ({ value: 5000n }));
  const balance = vi.fn(async () => ({ value: 1_000_000_000n }));
  const height = vi.fn(async () => 100n);
  const statuses = vi.fn(async () => ({
    value: [{ confirmationStatus: 'finalized' }] as ({ confirmationStatus: string } | null)[],
  }));
  const valid = vi.fn(async () => ({ value: true }));
  const raw = {
    getGenesisHash: () => ({ send: genesis }),
    getLatestBlockhash: () => ({ send: async () => ({ value: LIFETIME }) }),
    getBalance: () => ({ send: balance }),
    getFeeForMessage: () => ({ send: fee }),
    getBlockHeight: () => ({ send: height }),
    getTransaction: (sig: string) => ({ send: () => getTx(sig) }),
    getSignatureStatuses: () => ({ send: statuses }),
    isBlockhashValid: () => ({ send: valid }),
    sendTransaction: vi.fn(() => ({ send })),
  };
  return {
    rpc: raw as unknown as AppRpc,
    raw,
    genesis,
    getTx,
    send,
    fee,
    balance,
    height,
    statuses,
    valid,
  };
}
const callbacks = () => ({
  onAwaiting: vi.fn(),
  onSubmitted: vi.fn(),
  isCurrentWallet: () => true,
});
describe('one deterministic Kit transaction', () => {
  it.each([2, 3])('builds exactly one message with %s plain System transfers', (count) => {
    const expected = createPlan(PLAN.payer, DRAFT.slice(0, count), CONTACTS);
    const message = buildPaymentMessage(expected, LIFETIME);
    expect(message.version).toBe(0);
    expect(message.feePayer.address).toBe(expected.payer);
    expect(message.instructions).toHaveLength(count);
    message.instructions.forEach((instruction, index) => {
      const parsed = parseTransferSolInstruction(instruction);
      expect(parsed.accounts.source.address).toBe(expected.payer);
      expect(parsed.accounts.destination.address).toBe(expected.items[index].address);
      expect(parsed.data.amount).toBe(BigInt(expected.items[index].lamports));
    });
    expect(Object.keys(compileTransaction(message).signatures)).toEqual([expected.payer]);
  });
  it('builds no transaction for a tampered draft', () =>
    expect(() => buildPaymentMessage({ ...PLAN, totalLamports: '1' }, LIFETIME)).toThrow());
  it('requests a fee estimate for the compiled transaction message', async () => {
    const { rpc, fee } = fakeRpc();
    const prepared = await preparePayment(rpc, PLAN);
    expect(prepared.fee).toBe(5000n);
    expect(fee).toHaveBeenCalledOnce();
    expect(prepared.plan).toBe(PLAN);
  });
  it('rejects unavailable fee estimates', async () => {
    const { rpc, fee } = fakeRpc();
    fee.mockResolvedValue({ value: null as unknown as bigint });
    await expect(preparePayment(rpc, PLAN)).rejects.toThrow('estimate');
  });
  it('rejects insufficient balance before signing', async () => {
    const { rpc, balance } = fakeRpc();
    balance.mockResolvedValue({ value: 6_000_000n });
    await expect(preparePayment(rpc, PLAN)).rejects.toThrow('Insufficient');
  });
  it('rejects a non-Devnet genesis regardless of endpoint label', async () => {
    const { rpc, genesis } = fakeRpc();
    genesis.mockResolvedValue('mainnet-genesis');
    await expect(assertDevnet(rpc)).rejects.toThrow('not Solana Devnet');
  });
  it('rejects an explicitly wrong app network setting', async () => {
    vi.stubEnv('NEXT_PUBLIC_SOLANA_NETWORK', 'mainnet');
    await expect(assertDevnet(fakeRpc().rpc)).rejects.toThrow('only supports');
    vi.unstubAllEnvs();
  });
  it('surfaces RPC failure during preparation', async () => {
    const { rpc, genesis } = fakeRpc();
    genesis.mockRejectedValue(new Error('RPC unavailable'));
    await expect(preparePayment(rpc, PLAN)).rejects.toThrow('RPC unavailable');
  });
});
describe('explicit recovery of expired uncertain submissions', () => {
  const pending = { signature: TEST_SIGNATURE, ...LIFETIME };
  function absent() {
    const f = fakeRpc();
    f.getTx.mockResolvedValue(null as unknown as ReturnType<typeof chainFixture>);
    f.statuses.mockResolvedValue({ value: [null] });
    return f;
  }
  it('permits a new human review only after absent signature, absent transaction, expired height, and invalid blockhash', async () => {
    const f = absent();
    f.height.mockResolvedValue(501n);
    f.valid.mockResolvedValue({ value: false });
    await expect(canRetirePendingSubmission(f.rpc, pending)).resolves.toBe(true);
    expect(f.raw.sendTransaction).not.toHaveBeenCalled();
  });
  it('blocks recovery while the original blockhash is still valid', async () => {
    const f = absent();
    f.height.mockResolvedValue(501n);
    await expect(canRetirePendingSubmission(f.rpc, pending)).resolves.toBe(false);
  });
  it('blocks recovery before the last valid height', async () => {
    const f = absent();
    f.valid.mockResolvedValue({ value: false });
    await expect(canRetirePendingSubmission(f.rpc, pending)).resolves.toBe(false);
  });
  it('blocks recovery if a status still exists', async () => {
    const f = fakeRpc();
    f.getTx.mockResolvedValue(null as unknown as ReturnType<typeof chainFixture>);
    f.height.mockResolvedValue(501n);
    f.valid.mockResolvedValue({ value: false });
    await expect(canRetirePendingSubmission(f.rpc, pending)).resolves.toBe(false);
  });
  it('blocks recovery if a full transaction exists despite missing status history', async () => {
    const f = fakeRpc();
    f.statuses.mockResolvedValue({ value: [null] });
    f.height.mockResolvedValue(501n);
    f.valid.mockResolvedValue({ value: false });
    await expect(canRetirePendingSubmission(f.rpc, pending)).resolves.toBe(false);
  });
  it('keeps the original signature locked on RPC failure', async () => {
    const f = absent();
    f.height.mockRejectedValue(new Error('RPC unavailable'));
    await expect(canRetirePendingSubmission(f.rpc, pending)).rejects.toThrow('RPC unavailable');
  });
});
describe('wallet and signing safeguards', () => {
  it('rejects disconnected wallets', () =>
    expect(() => assertWalletReady(null, ['solana:devnet'], new Set([0]), PLAN.payer)).toThrow(
      'Connect',
    ));
  it('rejects wrong-chain accounts', () =>
    expect(() =>
      assertWalletReady(signer, ['solana:mainnet'], new Set([0]), payer.address),
    ).toThrow('Devnet'));
  it('rejects changed payers', () =>
    expect(() => assertWalletReady(signer, ['solana:devnet'], new Set([0]), PLAN.payer)).toThrow(
      'changed',
    ));
  it('rejects unsupported versions', () =>
    expect(() =>
      assertWalletReady(signer, ['solana:devnet'], new Set(['legacy']), payer.address),
    ).toThrow('version 0'));
  it('requires inspectable signTransaction capability', () =>
    expect(() =>
      assertWalletReady(
        { address: payer.address, signAndSendTransactions: async () => [] },
        ['solana:devnet'],
        new Set([0]),
        payer.address,
      ),
    ).toThrow('signTransaction'));
  it('verifies the cryptographic signature and reviewed bytes', async () => {
    const unsigned = compileTransaction(buildPaymentMessage(plan, LIFETIME));
    const signed = await partiallySignTransaction([payer.keyPair], unsigned);
    await expect(
      validateSignedTransaction(unsigned, signed, payer.address),
    ).resolves.toBeUndefined();
  });
  it('blocks wallet modifications before broadcast', async () => {
    const unsigned = compileTransaction(buildPaymentMessage(plan, LIFETIME));
    const signed = await partiallySignTransaction([payer.keyPair], unsigned);
    const changed = {
      ...signed,
      messageBytes: new Uint8Array(
        signed.messageBytes.map((byte, i) => (i ? byte : byte ^ 1)),
      ) as unknown as typeof signed.messageBytes,
    };
    await expect(validateSignedTransaction(unsigned, changed, payer.address)).rejects.toThrow(
      'changed',
    );
  });
  it('blocks invalid cryptographic signatures', async () => {
    const unsigned = compileTransaction(buildPaymentMessage(plan, LIFETIME));
    const signed = await partiallySignTransaction([payer.keyPair], unsigned);
    const sig = signed.signatures[payer.address]!;
    const invalid = {
      ...signed,
      signatures: { [payer.address]: new Uint8Array(sig.length).fill(1) as typeof sig },
    };
    await expect(validateSignedTransaction(unsigned, invalid, payer.address)).rejects.toThrow(
      'invalid signature',
    );
  });
  it('never broadcasts a wallet rejection', async () => {
    const { rpc, raw } = fakeRpc(plan);
    const prepared = await preparePayment(rpc, plan);
    const gate = new SubmissionGate();
    const rejected = {
      ...signer,
      modifyAndSignTransactions: vi.fn(async () => {
        throw new Error('User rejected');
      }),
    };
    await expect(signAndSubmit(rpc, prepared, rejected, gate, callbacks())).rejects.toThrow(
      'User rejected',
    );
    expect(raw.sendTransaction).not.toHaveBeenCalled();
    expect(() => gate.begin()).not.toThrow();
  });
  it('does not sign or broadcast an expiring review', async () => {
    const { rpc, raw, height } = fakeRpc(plan);
    const prepared = await preparePayment(rpc, plan);
    height.mockResolvedValue(499n);
    const modify = vi.fn(signer.modifyAndSignTransactions);
    await expect(
      signAndSubmit(
        rpc,
        prepared,
        { ...signer, modifyAndSignTransactions: modify },
        new SubmissionGate(),
        callbacks(),
      ),
    ).rejects.toThrow('expiring');
    expect(modify).not.toHaveBeenCalled();
    expect(raw.sendTransaction).not.toHaveBeenCalled();
  });
  it('honors cancellation while the wallet request is open', async () => {
    const { rpc, raw } = fakeRpc(plan);
    const prepared = await preparePayment(rpc, plan);
    let current = true;
    const canceling = {
      ...signer,
      modifyAndSignTransactions: async (
        ...args: Parameters<typeof signer.modifyAndSignTransactions>
      ) => {
        current = false;
        return signer.modifyAndSignTransactions(...args);
      },
    };
    await expect(
      signAndSubmit(rpc, prepared, canceling, new SubmissionGate(), {
        ...callbacks(),
        isCurrentWallet: () => current,
      }),
    ).rejects.toThrow('changed');
    expect(raw.sendTransaction).not.toHaveBeenCalled();
  });
});
describe('submission uncertainty and independent verification', () => {
  it('locks double clicks before wallet operations', () => {
    const gate = new SubmissionGate();
    gate.begin();
    expect(() => gate.begin()).toThrow('already');
  });
  it('never unlocks attempted submissions for automatic retry', () => {
    const gate = new SubmissionGate();
    gate.begin();
    gate.markAttempted();
    gate.releaseBeforeBroadcast();
    expect(() => gate.begin()).toThrow('already');
  });
  it('checks the original signature after a lost submission response without resending', async () => {
    const { rpc, raw, send, getTx } = fakeRpc(plan);
    send.mockRejectedValue(new Error('Connection lost after send'));
    const prepared = await preparePayment(rpc, plan);
    const submitted = vi.fn();
    const result = await signAndSubmit(rpc, prepared, signer, new SubmissionGate(), {
      ...callbacks(),
      onSubmitted: submitted,
    });
    const actual = getSignatureFromTransaction(
      await partiallySignTransaction([payer.keyPair], prepared.transaction),
    );
    expect(raw.sendTransaction).toHaveBeenCalledOnce();
    expect(submitted).toHaveBeenCalledWith(actual);
    expect(getTx).toHaveBeenCalledWith(actual);
    expect(result.matchesPlan).toBe(true);
  });
  it('surfaces signatures not found instead of claiming confirmation', async () => {
    const { rpc, getTx } = fakeRpc();
    getTx.mockResolvedValue(null as unknown as ReturnType<typeof chainFixture>);
    await expect(fetchReceipt(rpc, TEST_SIGNATURE, PLAN)).rejects.toThrow('not found');
  });
  it('cannot manufacture success when RPC is unavailable', async () => {
    const { rpc, getTx } = fakeRpc();
    getTx.mockRejectedValue(new Error('RPC unavailable'));
    await expect(fetchReceipt(rpc, TEST_SIGNATURE, PLAN)).rejects.toThrow('unavailable');
  });
  it('keeps ambiguous finality unverified without retrying payment', async () => {
    const { rpc, raw } = fakeRpc();
    await expect(waitForReceipt(rpc, TEST_SIGNATURE, PLAN, 0)).rejects.toThrow('Do not resend');
    expect(raw.sendTransaction).not.toHaveBeenCalled();
  });
});
