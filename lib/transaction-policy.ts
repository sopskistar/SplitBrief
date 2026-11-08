import {
  createTransactionMessage,
  getBase58Encoder,
  setTransactionMessageComputeUnitLimit,
  setTransactionMessageComputeUnitPrice,
  type Instruction,
  type TransactionMessage,
} from '@solana/kit';

export const FIXED_FEE_POLICY = 'fixed-zero-priority-v1' as const;
export const COMPUTE_BUDGET_PROGRAM = 'ComputeBudget111111111111111111111111111111';
export const REVIEWED_COMPUTE_UNIT_LIMIT = 10_000;
export function reviewedFeeInstructions(): readonly Instruction[] {
  return setTransactionMessageComputeUnitPrice(
    0n,
    setTransactionMessageComputeUnitLimit(
      REVIEWED_COMPUTE_UNIT_LIMIT,
      createTransactionMessage({ version: 0 }) as TransactionMessage & { version: 0 },
    ),
  ).instructions;
}
export function bytesEqual(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
// jsonParsed RPC represents ComputeBudget instructions as partially decoded base58 data.
export function reviewedFeeInstructionKind(instruction: {
  programId: string;
  data?: unknown;
  accounts?: unknown;
}): 'compute-unit-limit' | 'compute-unit-price' | null {
  if (
    instruction.programId !== COMPUTE_BUDGET_PROGRAM ||
    typeof instruction.data !== 'string' ||
    !Array.isArray(instruction.accounts) ||
    instruction.accounts.length !== 0
  )
    return null;
  try {
    const data = getBase58Encoder().encode(instruction.data);
    const index = reviewedFeeInstructions().findIndex((expected) =>
      bytesEqual(expected.data!, data),
    );
    return index === 0 ? 'compute-unit-limit' : index === 1 ? 'compute-unit-price' : null;
  } catch {
    return null;
  }
}
