import type { Receipt } from './verification';

export function evaluatePaymentEvidence(receipt: Receipt, expectedPayer?: string) {
  const checks = {
    confirmedOrFinalized: ['confirmed', 'finalized'].includes(receipt.state),
    expectedPayer: expectedPayer ? receipt.payer === expectedPayer : null,
    singleSignature: receipt.signatureCount === 1,
    twoOrThreeTransfers: receipt.transfers.length >= 2 && receipt.transfers.length <= 3,
    distinctDestinations:
      new Set(receipt.transfers.map((transfer) => transfer.destination)).size ===
      receipt.transfers.length,
    allTransfersFromFeePayer: receipt.transfers.every(
      (transfer) => transfer.source === receipt.payer && !transfer.inner,
    ),
    onlyIntendedNativeTransferInstructions:
      receipt.issues.length === 0 && receipt.instructionCount === receipt.transfers.length,
    withinAppTransferCaps:
      receipt.transfers.every(
        (transfer) => BigInt(transfer.lamports) > 0n && BigInt(transfer.lamports) <= 100_000_000n,
      ) &&
      receipt.transfers.reduce((sum, transfer) => sum + BigInt(transfer.lamports), 0n) <=
        200_000_000n,
    matchesOriginalPlan: receipt.matchesPlan,
  };
  return { success: Object.values(checks).every((value) => value !== false), checks };
}
