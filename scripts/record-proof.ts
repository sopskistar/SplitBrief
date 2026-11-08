import { readFile, writeFile } from 'node:fs/promises';
import { fetchReceipt, rpcClient } from '../lib/solana';
import { validatePlan, type PaymentPlan } from '../lib/payments';
import { signatureSchema } from '../lib/verification';
import { evaluatePaymentEvidence } from '../lib/payment-evidence';

// Input is a PUBLIC signature or a downloaded receipt. No wallet signing occurs here.
const input = process.argv[2];
const payerFlag = process.argv.indexOf('--expected-payer');
const expectedPayer = payerFlag >= 0 ? process.argv[payerFlag + 1] : undefined;
if (!input)
  throw new Error(
    'Usage: npm run proof:record -- <public Devnet signature OR downloaded receipt.json>',
  );
let signature: string;
let expected: PaymentPlan | undefined;
if (input.endsWith('.json')) {
  const file = JSON.parse(await readFile(input, 'utf8'));
  signature = signatureSchema.parse(file.signature);
  if (file.reviewedPlan) expected = validatePlan(file.reviewedPlan);
} else signature = signatureSchema.parse(input);
const receipt = await fetchReceipt(rpcClient(), signature, expected);
const { success, checks } = evaluatePaymentEvidence(receipt, expectedPayer);
const evidence = {
  checkedAt: new Date().toISOString(),
  network: 'devnet',
  source: 'User-provided public transaction, independently reverified',
  success,
  signature,
  payer: receipt.payer,
  expectedPayer: expectedPayer ?? null,
  networkTransactionVerified: checks.confirmedOrFinalized,
  appPaymentVerified: success,
  checks,
  verificationSummary: success
    ? 'Successful native multi-recipient payment decoded from Devnet.'
    : 'Transaction decoded, but it does not meet the supplied SplitBrief payment requirements. Inspect payer, transfer count, amounts, and extra instructions.',
  receipt,
  ...(expected ? { plan: expected } : {}),
  walletApproval:
    'User reported a Phantom test; wallet approval was not observed by this read-only script.',
};
await writeFile('public/evidence/devnet.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
if (!success) process.exitCode = 1;
