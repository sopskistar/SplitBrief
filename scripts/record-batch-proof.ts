import { readFile, copyFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { address } from '@solana/kit';
import { assertDevnet, fetchReceipt, rpcClient } from '../lib/solana';
import { evaluatePaymentEvidence } from '../lib/payment-evidence';
const payer = '9NTebUUdiqDzZDrBARaopnaN78YWeDbkM452Jb2EoZkR';
const contacts = JSON.parse(await readFile('public/demo-recipients.json', 'utf8')).recipients as {
  name: string;
  address: string;
}[];
const rpc = rpcClient();
await assertDevnet(rpc);
const signatures = await rpc
  .getSignaturesForAddress(address(payer), { limit: 12, commitment: 'finalized' })
  .send();
let found;
for (const item of signatures) {
  const receipt = await fetchReceipt(rpc, item.signature);
  const profile = evaluatePaymentEvidence(receipt, payer, true);
  const exact =
    receipt.transfers.length === 3 &&
    receipt.transfers.every(
      (transfer, index) =>
        transfer.destination === contacts[index].address &&
        transfer.lamports === ['2000000', '1000000', '3000000'][index],
    );
  if (
    profile.success &&
    exact &&
    receipt.feeLamports === '5000' &&
    receipt.instructionCount === 5 &&
    receipt.feeControls.length === 2
  ) {
    found = { receipt, profile };
    break;
  }
}
if (!found)
  throw new Error(
    'No finalized outgoing transaction matches the published three-recipient demo; no evidence invented.',
  );
const previous = JSON.parse(await readFile('public/evidence/devnet.json', 'utf8'));
let screenshot;
if (
  previous.signature === found.receipt.signature &&
  previous.reportedApplicationReceipt?.screenshot
) {
  const candidate = previous.reportedApplicationReceipt.screenshot;
  const bytes = await readFile('public/evidence/successful-devnet-receipt.webp');
  if (createHash('sha256').update(bytes).digest('hex') !== candidate.cropSha256)
    throw new Error(
      'Previously inspected receipt crop changed; inspect it again before publishing.',
    );
  screenshot = candidate;
}
if (
  previous.signature ===
  'iyxcjE2BWwJkmbHQiUcyeit6UTzhQwKq9zrdYXwJFubN94haGLKqaWYPx85eFYeLBrH3avgEjR2vPCim9XV15gh'
)
  await copyFile('public/evidence/devnet.json', 'public/evidence/devnet-funding.json');
const evidence = {
  checkedAt: new Date().toISOString(),
  network: 'devnet',
  source: 'Independently retrieved full finalized transaction from public Solana Devnet RPC',
  success: true,
  signature: found.receipt.signature,
  payer,
  networkTransactionVerified: true,
  appPaymentVerified: true,
  totalLamports: '6000000',
  totalSol: '0.006',
  feeLamports: found.receipt.feeLamports,
  checks: {
    ...found.profile.checks,
    matchesPublishedDemoRecipients: true,
    exactTransferOrderAndAmounts: true,
    exactReviewedFeeControls: true,
  },
  recipients: contacts.map((contact, index) => ({
    ...contact,
    lamports: ['2000000', '1000000', '3000000'][index],
  })),
  receipt: found.receipt,
  originalPlanEvidence: {
    available: false,
    independentlyMatched: false,
    description:
      'No original frozen review snapshot or exported receipt is present in this repository. Comparison is with the published demo address book and requested amounts, not independent proof of original intent.',
  },
  reportedApplicationReceipt: {
    source: screenshot
      ? 'Owner report and inspected genuine production screenshot'
      : 'Wallet owner report in task instructions',
    status: 'Payment completed',
    verification: 'Finalized & matched',
    independentSnapshotAvailable: false,
    ...(screenshot ? { screenshot } : {}),
  },
  walletApproval:
    'Owner reports personally approving in Phantom on the deployed app. No approval popup footage was supplied to this workspace.',
  fundingEvidence: '/evidence/devnet-funding.json',
};
await writeFile('public/evidence/devnet-batch.json', JSON.stringify(evidence, null, 2) + '\n');
await writeFile(
  'public/evidence/devnet.json',
  JSON.stringify({ ...evidence, canonicalBatchEvidence: '/evidence/devnet-batch.json' }, null, 2) +
    '\n',
);
console.log(
  JSON.stringify({
    signature: evidence.signature,
    state: evidence.receipt.state,
    transfers: evidence.receipt.transfers,
    feeLamports: evidence.feeLamports,
    matchedPublishedDemo: true,
    originalPlanMatch: null,
  }),
);
