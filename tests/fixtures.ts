import { createPlan, type Contact } from '../lib/payments';
import { DEVNET_GENESIS } from '../lib/solana';
import { SYSTEM_PROGRAM } from '../lib/verification';
import { getBase58Decoder } from '@solana/kit';
import { reviewedFeeInstructions } from '../lib/transaction-policy';

export const PAYER = '8qjxPkP6u4VqiYaTmC8otmB86TrNY5TVp8Pt8MhFoYy';
export const CONTACTS: Contact[] = [
  {
    id: 'ada',
    name: 'Ada',
    address: 'EgpR8wT9oSnYxbB3tbAtBzdMCiP1Krez84YJ5id6MRxp',
    description: 'Disposable test recipient',
  },
  {
    id: 'chidi',
    name: 'Chidi',
    address: 'B5FrY8tQL73E14k4uHvk1GqtpJeBWGhaNy6z8vtnup5d',
    description: 'Disposable test recipient',
  },
  {
    id: 'reserve',
    name: 'Reserve',
    address: '5LB7gzK1WFG6hEkeym25r9vjFEDCdBBZFpsVoSGUCBYz',
    description: 'Disposable test recipient',
  },
];
export const DRAFT = CONTACTS.map((contact, index) => ({
  recipientLabel: contact.name,
  amountSol: ['0.002', '0.001', '0.003'][index],
  purpose: ['Design', 'Delivery', 'Reserve'][index],
}));
// Preserve a pre-fix transfer-only plan to test historical receipt compatibility.
export const PLAN = Object.freeze({
  ...createPlan(PAYER, DRAFT, CONTACTS, new Date('2026-11-07T18:00:00Z')),
  feePolicy: undefined,
});
// Synthetic signature used ONLY in tests. Never published as a chain proof.
export const TEST_SIGNATURE = '1'.repeat(64);
export function chainFixture(
  plan: import('../lib/payments').PaymentPlan = PLAN,
  signature = TEST_SIGNATURE,
) {
  return {
    slot: 123n,
    blockTime: 1794080000n,
    meta: {
      err: null as unknown,
      fee: 5000n,
      innerInstructions: [] as { instructions: unknown[] }[],
    },
    transaction: {
      signatures: [signature],
      message: {
        accountKeys: [
          { pubkey: plan.payer, signer: true, writable: true },
          ...plan.items.map((item) => ({ pubkey: item.address, signer: false, writable: true })),
        ],
        instructions: plan.items.map((item) => ({
          programId: SYSTEM_PROGRAM,
          parsed: {
            type: 'transfer',
            info: {
              source: plan.payer,
              destination: item.address,
              lamports: BigInt(item.lamports),
            },
          },
        })),
      },
    },
  };
}
export const DEVNET = DEVNET_GENESIS;

export function chainFixtureForPlan(
  plan: import('../lib/payments').PaymentPlan = PLAN,
  signature = TEST_SIGNATURE,
) {
  const raw = chainFixture(plan, signature);
  return {
    ...raw,
    transaction: {
      ...raw.transaction,
      message: {
        ...raw.transaction.message,
        instructions: [
          ...(plan.feePolicy
            ? reviewedFeeInstructions().map((instruction) => ({
                programId: String(instruction.programAddress),
                accounts: [],
                data: getBase58Decoder().decode(instruction.data!),
              }))
            : []),
          ...raw.transaction.message.instructions,
        ],
      },
    },
  };
}
