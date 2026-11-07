import { readFile, writeFile } from 'node:fs/promises';
import { fetchReceipt, rpcClient } from '../lib/solana';
import { validatePlan, type PaymentPlan } from '../lib/payments';
import { signatureSchema } from '../lib/verification';

// Input is a PUBLIC signature or a downloaded receipt. No wallet signing occurs here.
const input = process.argv[2];
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
const success =
  ['confirmed', 'finalized'].includes(receipt.state) &&
  receipt.transfers.length >= 2 &&
  receipt.transfers.length <= 3 &&
  receipt.issues.length === 0 &&
  receipt.matchesPlan !== false;
const evidence = {
  checkedAt: new Date().toISOString(),
  network: 'devnet',
  source: 'User-provided public transaction, independently reverified',
  success,
  signature,
  payer: receipt.payer,
  receipt,
  ...(expected ? { plan: expected } : {}),
  walletApproval: 'Not observed by this script. Signing must be personally approved in the wallet.',
};
await writeFile('public/evidence/devnet.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
if (!success) process.exitCode = 1;
