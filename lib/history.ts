import { z } from 'zod';
import { planSchema, validatePlan, type PaymentPlan } from './payments';
import { signatureSchema } from './verification';

export const HISTORY_KEY = 'splitbrief.receipts.v1';
export const CONTACTS_KEY = 'splitbrief.contacts.v1';
const entrySchema = z
  .object({ signature: signatureSchema, plan: planSchema, submittedAt: z.string().datetime() })
  .strict();
export type HistoryEntry = z.infer<typeof entrySchema>;
export function readHistory(storage: Pick<Storage, 'getItem'>): HistoryEntry[] {
  try {
    return z
      .array(entrySchema)
      .max(20)
      .parse(JSON.parse(storage.getItem(HISTORY_KEY) ?? '[]'))
      .filter((entry) => {
        try {
          validatePlan(entry.plan);
          return true;
        } catch {
          return false;
        }
      });
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
  });
  const entries = [
    entry,
    ...readHistory(storage).filter((item) => item.signature !== signature),
  ].slice(0, 20);
  storage.setItem(HISTORY_KEY, JSON.stringify(entries));
  return entries;
}
