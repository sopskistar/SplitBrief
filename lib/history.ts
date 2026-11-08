import { z } from 'zod';
import { planSchema, validatePlan, type PaymentPlan } from './payments';
import { signatureSchema } from './verification';

export const HISTORY_KEY = 'splitbrief.receipts.v1';
export const CONTACTS_KEY = 'splitbrief.contacts.v1';
const entrySchema = z
  .object({
    signature: signatureSchema,
    plan: planSchema.optional(),
    submittedAt: z.string().datetime(),
    source: z.enum(['submitted', 'verified', 'recovered']).default('submitted'),
  })
  .strict();
export type HistoryEntry = z.infer<typeof entrySchema>;
export function readHistory(storage: Pick<Storage, 'getItem'>): HistoryEntry[] {
  try {
    const raw: unknown = JSON.parse(storage.getItem(HISTORY_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    return raw
      .slice(0, 100)
      .flatMap((value) => {
        const parsed = entrySchema.safeParse(value);
        if (!parsed.success || seen.has(parsed.data.signature)) return [];
        try {
          if (parsed.data.plan) validatePlan(parsed.data.plan);
        } catch {
          return [];
        }
        seen.add(parsed.data.signature);
        return [parsed.data];
      })
      .slice(0, 20);
  } catch {
    return [];
  }
}
export function rememberSubmission(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  signature: string,
  plan: PaymentPlan,
): HistoryEntry[] {
  const entry = entrySchema.parse({
    signature,
    plan: validatePlan(plan),
    submittedAt: new Date().toISOString(),
    source: 'submitted',
  });
  const entries = [
    entry,
    ...readHistory(storage).filter((item) => item.signature !== signature),
  ].slice(0, 20);
  storage.setItem(HISTORY_KEY, JSON.stringify(entries));
  return entries;
}

export function rememberVerifiedSignature(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  signature: string,
  source: 'verified' | 'recovered' = 'verified',
): HistoryEntry[] {
  signatureSchema.parse(signature);
  const existing = readHistory(storage);
  const previous = existing.find((entry) => entry.signature === signature);
  const entry =
    previous ?? entrySchema.parse({ signature, submittedAt: new Date().toISOString(), source });
  const entries = [entry, ...existing.filter((item) => item.signature !== signature)].slice(0, 20);
  storage.setItem(HISTORY_KEY, JSON.stringify(entries));
  return entries;
}
