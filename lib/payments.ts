import { address } from '@solana/kit';
import { z } from 'zod';
import { FIXED_FEE_POLICY } from './transaction-policy';

export const LAMPORTS_PER_SOL = 1_000_000_000n;
export const MAX_TRANSFER = 100_000_000n;
export const MAX_TOTAL = 200_000_000n;
export const SAMPLE_BRIEF =
  'Pay Ada 0.002 SOL for design, Chidi 0.001 SOL for delivery, and send 0.003 SOL to Reserve.';

export const contactSchema = z
  .object({
    id: z.string().min(1).max(80),
    name: z.string().trim().min(1).max(32),
    address: z.string().refine(isAddress, 'Enter a valid Solana public address.'),
    description: z.string().max(100).default(''),
  })
  .strict();
export type Contact = z.infer<typeof contactSchema>;
export const draftItemSchema = z
  .object({
    recipientLabel: z.string().trim().min(1).max(32),
    amountSol: z.string().max(24),
    purpose: z.string().max(100),
  })
  .strict();
export type DraftItem = z.infer<typeof draftItemSchema>;
export const planSchema = z
  .object({
    payer: z.string().refine(isAddress),
    createdAt: z.string().datetime(),
    items: z
      .array(
        draftItemSchema.extend({
          address: z.string().refine(isAddress),
          lamports: z.string().regex(/^\d+$/),
        }),
      )
      .min(2)
      .max(3),
    totalLamports: z.string().regex(/^\d+$/),
    feePolicy: z.literal(FIXED_FEE_POLICY).optional(),
    approvedFeeLamports: z.string().regex(/^\d+$/).optional(),
  })
  .strict();
export type PaymentPlan = z.infer<typeof planSchema>;

export function isAddress(value: string): boolean {
  try {
    address(value);
    return true;
  } catch {
    return false;
  }
}

export function solToLamportsExact(value: string): bigint {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,9})?$/.test(value) || value.length > 24) {
    throw new Error('Use a plain SOL decimal with at most 9 decimal places.');
  }
  const [whole, fraction = ''] = value.split('.');
  const result = BigInt(whole) * LAMPORTS_PER_SOL + BigInt(fraction.padEnd(9, '0'));
  if (result <= 0n) throw new Error('Each amount must be greater than zero.');
  return result;
}

export function lamportsToSolExact(value: bigint | string): string {
  const n = BigInt(value);
  const negative = n < 0n;
  const absolute = negative ? -n : n;
  const fraction = (absolute % LAMPORTS_PER_SOL).toString().padStart(9, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${absolute / LAMPORTS_PER_SOL}${fraction ? `.${fraction}` : ''}`;
}

export function validateContacts(input: unknown): Contact[] {
  const contacts = z.array(contactSchema).max(3).parse(input);
  if (new Set(contacts.map((c) => c.name.toLowerCase())).size !== contacts.length)
    throw new Error('Contact names must be unique.');
  if (new Set(contacts.map((c) => c.address)).size !== contacts.length)
    throw new Error('Each contact must have a different address.');
  if (new Set(contacts.map((c) => c.id)).size !== contacts.length)
    throw new Error('Duplicate contact IDs.');
  return contacts;
}

export function createPlan(
  payer: string,
  draft: DraftItem[],
  book: Contact[],
  now = new Date(),
): PaymentPlan {
  if (!isAddress(payer)) throw new Error('Connect a Solana Devnet wallet before review.');
  const contacts = validateContacts(book);
  if (draft.length < 2 || draft.length > 3)
    throw new Error('Include 2 or 3 recipients in one payment.');
  const items = draft.map((row) => {
    const item = draftItemSchema.parse(row);
    const contact = contacts.find((c) => c.name === item.recipientLabel);
    if (!contact) throw new Error(`Choose a known contact for “${item.recipientLabel}”.`);
    const amount = solToLamportsExact(item.amountSol);
    if (amount > MAX_TRANSFER) throw new Error('Each recipient is capped at 0.1 Devnet SOL.');
    if (contact.address === payer)
      throw new Error('Self-payments are disabled. Choose a different recipient.');
    return { ...item, address: contact.address, lamports: amount.toString() };
  });
  const plan = {
    payer,
    feePolicy: FIXED_FEE_POLICY,
    createdAt: now.toISOString(),
    items,
    totalLamports: items.reduce((n, item) => n + BigInt(item.lamports), 0n).toString(),
  };
  validatePlan(plan);
  return Object.freeze({
    ...plan,
    items: Object.freeze(items.map((item) => Object.freeze(item))),
  }) as unknown as PaymentPlan;
}

export function validatePlan(input: unknown): PaymentPlan {
  const plan = planSchema.parse(input);
  if (new Set(plan.items.map((i) => i.address)).size !== plan.items.length)
    throw new Error('Duplicate destination. Each recipient must be distinct.');
  if (new Set(plan.items.map((i) => i.recipientLabel)).size !== plan.items.length)
    throw new Error('Duplicate recipient label.');
  let total = 0n;
  for (const item of plan.items) {
    const amount = solToLamportsExact(item.amountSol);
    if (amount.toString() !== item.lamports || amount > MAX_TRANSFER)
      throw new Error('Invalid or over-limit transfer amount.');
    if (item.address === plan.payer) throw new Error('Self-payments are disabled.');
    total += amount;
  }
  if (total > MAX_TOTAL) throw new Error('The payment total is capped at 0.2 Devnet SOL.');
  if (total.toString() !== plan.totalLamports)
    throw new Error('The payment total does not match its transfers.');
  return plan;
}

export function assertAffordable(plan: PaymentPlan, balance: bigint, fee: bigint): void {
  validatePlan(plan);
  if (fee < 0n) throw new Error('A valid RPC fee estimate is required.');
  if (BigInt(plan.totalLamports) + fee > balance)
    throw new Error('Insufficient Devnet SOL for transfers and the estimated network fee.');
}

export function shortAddress(value: string): string {
  return `${value.slice(0, 5)}…${value.slice(-5)}`;
}
export function explorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=devnet`;
}
