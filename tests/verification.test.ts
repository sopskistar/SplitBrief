import { describe, expect, it } from 'vitest';
import { decodeReceipt } from '../lib/verification';
import { CONTACTS, PLAN, TEST_SIGNATURE, chainFixture } from './fixtures';

describe('full transaction decoding and matching', () => {
  it('matches a successful decoded transaction against every reviewed instruction', () => {
    const receipt = decodeReceipt(TEST_SIGNATURE, chainFixture(), 'confirmed', PLAN);
    expect(receipt.matchesPlan).toBe(true);
    expect(receipt.transfers).toHaveLength(3);
    expect(receipt.feeLamports).toBe('5000');
    expect(receipt.timestamp).toBe(1794080000);
  });
  it('does not claim a brief match without a saved plan', () =>
    expect(decodeReceipt(TEST_SIGNATURE, chainFixture()).matchesPlan).toBeNull());
  it('shows actual finality from the signature status', () =>
    expect(decodeReceipt(TEST_SIGNATURE, chainFixture(), 'finalized', PLAN).state).toBe(
      'finalized',
    ));
  it('does not treat status success alone as proof when no full transaction exists', () =>
    expect(() => decodeReceipt(TEST_SIGNATURE, null, 'finalized', PLAN)).toThrow('not found'));
  it('rejects a failed execution even if every instruction was present', () => {
    const raw = chainFixture();
    raw.meta.err = { InstructionError: [2, 'InsufficientFunds'] };
    const receipt = decodeReceipt(TEST_SIGNATURE, raw, 'confirmed', PLAN);
    expect(receipt.state).toBe('failed');
    expect(receipt.matchesPlan).toBe(false);
  });
  it('rejects a mismatched fee payer', () => {
    const raw = chainFixture();
    raw.transaction.message.accountKeys[0].pubkey = CONTACTS[0].address;
    expect(decodeReceipt(TEST_SIGNATURE, raw, 'confirmed', PLAN).matchesPlan).toBe(false);
  });
  it('rejects an unsigned fee payer', () => {
    const raw = chainFixture();
    raw.transaction.message.accountKeys[0].signer = false;
    expect(decodeReceipt(TEST_SIGNATURE, raw, 'confirmed', PLAN).matchesPlan).toBe(false);
  });
  it('rejects a mismatched transfer source', () => {
    const raw = chainFixture();
    raw.transaction.message.instructions[0].parsed.info.source = CONTACTS[1].address;
    expect(decodeReceipt(TEST_SIGNATURE, raw, 'confirmed', PLAN).matchesPlan).toBe(false);
  });
  it('rejects a mismatched destination', () => {
    const raw = chainFixture();
    raw.transaction.message.instructions[0].parsed.info.destination = CONTACTS[1].address;
    expect(decodeReceipt(TEST_SIGNATURE, raw, 'confirmed', PLAN).matchesPlan).toBe(false);
  });
  it('rejects a mismatched amount', () => {
    const raw = chainFixture();
    raw.transaction.message.instructions[0].parsed.info.lamports = 1n;
    expect(decodeReceipt(TEST_SIGNATURE, raw, 'confirmed', PLAN).matchesPlan).toBe(false);
  });
  it('rejects a missing instruction', () => {
    const raw = chainFixture();
    raw.transaction.message.instructions.pop();
    expect(decodeReceipt(TEST_SIGNATURE, raw, 'confirmed', PLAN).matchesPlan).toBe(false);
  });
  it('detects an unexpected extra transfer', () => {
    const raw = chainFixture();
    raw.transaction.message.instructions.push(raw.transaction.message.instructions[0]);
    const receipt = decodeReceipt(TEST_SIGNATURE, raw, 'confirmed', PLAN);
    expect(receipt.transfers).toHaveLength(4);
    expect(receipt.matchesPlan).toBe(false);
  });
  it('detects unrelated program instructions', () => {
    const raw = chainFixture();
    raw.transaction.message.instructions.push({
      ...raw.transaction.message.instructions[0],
      programId: CONTACTS[0].address,
    });
    const receipt = decodeReceipt(TEST_SIGNATURE, raw, 'confirmed', PLAN);
    expect(receipt.matchesPlan).toBe(false);
    expect(receipt.issues.join()).toContain('not a plain');
  });
  it('calls out unrelated instructions even without a plan', () => {
    const raw = chainFixture();
    raw.transaction.message.instructions[0].programId = CONTACTS[0].address;
    expect(decodeReceipt(TEST_SIGNATURE, raw).issues.length).toBeGreaterThan(0);
  });
  it('detects inner transfers and does not conceal their amounts', () => {
    const raw = chainFixture();
    raw.meta.innerInstructions.push({ instructions: [raw.transaction.message.instructions[0]] });
    const receipt = decodeReceipt(TEST_SIGNATURE, raw, 'confirmed', PLAN);
    expect(receipt.transfers).toHaveLength(4);
    expect(receipt.transfers[3].inner).toBe(true);
    expect(receipt.matchesPlan).toBe(false);
  });
  it('rejects a different returned signature', () =>
    expect(() => decodeReceipt('2'.repeat(64), chainFixture(), 'confirmed', PLAN)).toThrow(
      'signature',
    ));
  it('rejects malformed signatures before a lookup', () =>
    expect(() => decodeReceipt('bad', chainFixture())).toThrow());
  it('marks unavailable execution metadata unverified', () =>
    expect(
      decodeReceipt(TEST_SIGNATURE, { ...chainFixture(), meta: null }, 'finalized', PLAN).state,
    ).toBe('unverified'));
  it('rejects unsafe numeric RPC amounts rather than rounding', () => {
    const raw = chainFixture();
    const modified = { ...raw, meta: { ...raw.meta, fee: Number.MAX_SAFE_INTEGER + 1 } };
    expect(() => decodeReceipt(TEST_SIGNATURE, modified)).toThrow();
  });
});
