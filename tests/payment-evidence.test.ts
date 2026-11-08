import { describe, expect, it } from 'vitest';
import { evaluatePaymentEvidence } from '../lib/payment-evidence';
import { decodeReceipt } from '../lib/verification';
import { CONTACTS, PLAN, TEST_SIGNATURE, chainFixture } from './fixtures';

describe('honest public payment evidence', () => {
  it('accepts the exact outgoing native batch shape without claiming an absent original plan', () => {
    const result = evaluatePaymentEvidence(
      decodeReceipt(TEST_SIGNATURE, chainFixture(), 'finalized'),
      PLAN.payer,
    );
    expect(result.success).toBe(true);
    expect(result.checks.matchesOriginalPlan).toBeNull();
  });
  it('rejects incoming funding as evidence of a user-approved outgoing batch', () => {
    const raw = chainFixture();
    raw.transaction.message.instructions = raw.transaction.message.instructions.slice(0, 1);
    raw.transaction.message.instructions[0].parsed.info.lamports = 2_500_000_000n;
    const result = evaluatePaymentEvidence(
      decodeReceipt(TEST_SIGNATURE, raw, 'finalized'),
      CONTACTS[0].address,
    );
    expect(result.success).toBe(false);
    expect(result.checks.expectedPayer).toBe(false);
    expect(result.checks.twoOrThreeTransfers).toBe(false);
    expect(result.checks.withinAppTransferCaps).toBe(false);
  });
  it('rejects transfer sources that differ from the actual fee payer', () => {
    const raw = chainFixture();
    raw.transaction.message.instructions[0].parsed.info.source = CONTACTS[0].address;
    expect(evaluatePaymentEvidence(decodeReceipt(TEST_SIGNATURE, raw, 'finalized')).success).toBe(
      false,
    );
  });
  it('rejects extra signatures when matching the single-signer review', () => {
    const raw = chainFixture();
    raw.transaction.signatures.push('2'.repeat(64));
    expect(decodeReceipt(TEST_SIGNATURE, raw, 'finalized', PLAN).matchesPlan).toBe(false);
    expect(evaluatePaymentEvidence(decodeReceipt(TEST_SIGNATURE, raw, 'finalized')).success).toBe(
      false,
    );
  });
  it('never accepts failed execution as settlement evidence', () => {
    const raw = chainFixture();
    raw.meta.err = { InstructionError: [0, 'InsufficientFunds'] };
    expect(evaluatePaymentEvidence(decodeReceipt(TEST_SIGNATURE, raw, 'confirmed')).success).toBe(
      false,
    );
  });
});
