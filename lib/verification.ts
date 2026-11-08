import { z } from 'zod';
import { validatePlan, type PaymentPlan } from './payments';

export const SYSTEM_PROGRAM = '11111111111111111111111111111111';
export const signatureSchema = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/, 'Enter a base58 Solana transaction signature.');
export type ChainTransfer = {
  source: string;
  destination: string;
  lamports: string;
  inner: boolean;
};
export type Receipt = {
  signature: string;
  network: 'devnet';
  state: 'confirmed' | 'finalized' | 'failed' | 'unverified';
  payer: string;
  transfers: ChainTransfer[];
  instructionCount: number;
  signatureCount: number;
  feeLamports: string;
  slot: string;
  timestamp: number | null;
  matchesPlan: boolean | null;
  issues: string[];
  otherInstructions: { index: number; programId: string; inner: boolean }[];
};

const keySchema = z.object({ pubkey: z.string(), signer: z.boolean(), writable: z.boolean() });
const instructionSchema = z
  .object({ programId: z.string(), parsed: z.unknown().optional() })
  .passthrough();
const chainSchema = z.object({
  slot: z.union([z.bigint(), z.number().int().nonnegative()]),
  blockTime: z
    .union([z.number(), z.bigint().transform(Number)])
    .nullable()
    .optional(),
  meta: z
    .object({
      err: z.unknown(),
      fee: z.union([z.bigint(), z.number().int().nonnegative()]),
      innerInstructions: z
        .array(z.object({ instructions: z.array(instructionSchema) }))
        .nullable()
        .optional(),
    })
    .nullable(),
  transaction: z.object({
    signatures: z.array(z.string()).min(1),
    message: z.object({
      accountKeys: z.array(keySchema).min(1),
      instructions: z.array(instructionSchema),
    }),
  }),
});

function integerString(value: unknown): string {
  if (typeof value === 'bigint' && value >= 0n) return value.toString();
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
    return value.toString();
  if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value).toString();
  throw new Error('RPC returned an unsafe integer amount.');
}

export function decodeReceipt(
  signature: string,
  raw: unknown,
  finality: string | null = null,
  expected?: PaymentPlan,
): Receipt {
  signatureSchema.parse(signature);
  if (!raw)
    throw new Error('Signature not found on Devnet, not yet confirmed, or history is unavailable.');
  const tx = chainSchema.parse(raw);
  if (tx.transaction.signatures[0] !== signature)
    throw new Error('RPC transaction signature does not match the lookup.');
  const issues: string[] = [];
  const transfers: ChainTransfer[] = [];
  const otherInstructions: Receipt['otherInstructions'] = [];
  const payer = tx.transaction.message.accountKeys[0];
  if (!payer.signer) issues.push('Fee payer is not a signer.');
  const outer = tx.transaction.message.instructions;
  const inner = (tx.meta?.innerInstructions ?? []).flatMap((group) => group.instructions);
  for (const [instructions, isInner] of [
    [outer, false],
    [inner, true],
  ] as const) {
    for (const [index, instruction] of instructions.entries()) {
      const parsed = z
        .object({
          type: z.literal('transfer'),
          info: z.object({ source: z.string(), destination: z.string(), lamports: z.unknown() }),
        })
        .safeParse(instruction.parsed);
      if (instruction.programId !== SYSTEM_PROGRAM || !parsed.success) {
        otherInstructions.push({ index, programId: instruction.programId, inner: isInner });
        issues.push(
          `${isInner ? 'Inner' : 'Outer'} instruction is not a plain native SOL transfer.`,
        );
        continue;
      }
      transfers.push({
        source: parsed.data.info.source,
        destination: parsed.data.info.destination,
        lamports: integerString(parsed.data.info.lamports),
        inner: isInner,
      });
    }
  }
  if (inner.length) issues.push('Transaction contains inner instructions.');
  const state: Receipt['state'] = !tx.meta
    ? 'unverified'
    : tx.meta.err != null
      ? 'failed'
      : finality === 'finalized'
        ? 'finalized'
        : 'confirmed';
  if (state === 'failed')
    issues.push(
      'Transaction execution failed; instruction effects did not settle. Fees may still have been paid.',
    );
  if (state === 'unverified') issues.push('Transaction execution metadata is unavailable.');
  let matchesPlan: boolean | null = null;
  if (expected) {
    const plan = validatePlan(expected);
    if (tx.transaction.signatures.length !== 1)
      issues.push('Signature count differs from the single-signer review plan.');
    if (payer.pubkey !== plan.payer) issues.push('Fee payer differs from the reviewed plan.');
    if (outer.length !== plan.items.length || transfers.length !== plan.items.length)
      issues.push('Transfer or instruction count differs from the reviewed plan.');
    plan.items.forEach((item, index) => {
      const transfer = transfers[index];
      if (
        !transfer ||
        transfer.inner ||
        transfer.source !== plan.payer ||
        transfer.destination !== item.address ||
        transfer.lamports !== item.lamports
      )
        issues.push(
          `Transfer ${index + 1} differs from the reviewed payer, destination, amount, or order.`,
        );
    });
    matchesPlan = (state === 'confirmed' || state === 'finalized') && issues.length === 0;
  }
  return {
    signature,
    network: 'devnet',
    state,
    payer: payer.pubkey,
    transfers,
    instructionCount: outer.length,
    signatureCount: tx.transaction.signatures.length,
    feeLamports: tx.meta ? integerString(tx.meta.fee) : '0',
    slot: integerString(tx.slot),
    timestamp: tx.blockTime ?? null,
    matchesPlan,
    issues,
    otherInstructions,
  };
}
