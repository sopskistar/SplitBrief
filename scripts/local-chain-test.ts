import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { Surfnet } from '@solana/surfpool';
import {
  address,
  compileTransaction,
  createSolanaRpc,
  generateKeyPairSigner,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  partiallySignTransaction,
  signature as asSignature,
} from '@solana/kit';
import { createPlan, type Contact } from '../lib/payments';
import { buildPaymentMessage } from '../lib/solana';
import { decodeReceipt } from '../lib/verification';

const checks: string[] = [];
let surfnet: Surfnet | undefined;
const evidence: Record<string, unknown> = {
  checkedAt: new Date().toISOString(),
  network: 'local Surfpool (NOT public Devnet)',
  node: process.version,
  success: false,
  checks,
};
async function main() {
  surfnet = Surfnet.startWithConfig({ offline: true, slotTimeMs: 200 });
  const rpc = createSolanaRpc(surfnet.rpcUrl);
  const payer = await generateKeyPairSigner();
  const recipients = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);
  const contacts: Contact[] = recipients.map((recipient, index) => ({
    id: `local-${index}`,
    name: ['Ada', 'Chidi', 'Reserve'][index],
    address: recipient.address,
    description: 'Disposable local test address',
  }));
  const draft = contacts.map((contact, index) => ({
    recipientLabel: contact.name,
    amountSol: ['0.002', '0.001', '0.003'][index],
    purpose: 'Local integration test',
  }));
  const plan = createPlan(payer.address, draft, contacts);
  surfnet.fundSol(payer.address, 1_000_000_000);
  const before = await Promise.all(
    recipients.map((recipient) =>
      rpc
        .getBalance(recipient.address)
        .send()
        .then((result) => result.value),
    ),
  );
  const lifetime = (await rpc.getLatestBlockhash().send()).value;
  const message = buildPaymentMessage(plan, lifetime);
  assert.equal(message.instructions.length, 3);
  checks.push('Exactly 3 System Program transfer instructions in ONE message');
  const signed = await partiallySignTransaction([payer.keyPair], compileTransaction(message));
  const signature = getSignatureFromTransaction(signed);
  const returned = await rpc
    .sendTransaction(getBase64EncodedWireTransaction(signed), {
      encoding: 'base64',
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 0n,
    })
    .send();
  assert.equal(returned, signature);
  checks.push('One signed transaction submitted with the expected signature');
  async function read(signature: string) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const raw = await rpc
        .getTransaction(asSignature(signature), {
          encoding: 'jsonParsed',
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        })
        .send();
      if (raw) return raw;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error('Local transaction was not confirmed.');
  }
  const raw = await read(signature);
  const receipt = decodeReceipt(signature, raw, 'confirmed', plan);
  assert.equal(receipt.matchesPlan, true);
  checks.push(
    'Full decoded chain transaction matches payer, destinations, amounts, order, and count',
  );
  const after = await Promise.all(
    recipients.map((recipient) =>
      rpc
        .getBalance(recipient.address, { commitment: 'confirmed' })
        .send()
        .then((result) => result.value),
    ),
  );
  for (let index = 0; index < 3; index++)
    assert.equal(after[index] - before[index], BigInt(plan.items[index].lamports));
  checks.push('All 3 recipient balance deltas equal their exact bigint lamport amounts');
  const payerAfter = (await rpc.getBalance(payer.address, { commitment: 'confirmed' }).send())
    .value;
  assert.equal(
    1_000_000_000n - payerAfter,
    BigInt(plan.totalLamports) + BigInt(receipt.feeLamports),
  );
  checks.push('Payer debit equals total transfers plus actual network fee');
  const failedPayer = await generateKeyPairSigner();
  surfnet.fundSol(failedPayer.address, 4_000_000);
  const failingPlan = createPlan(failedPayer.address, draft, contacts);
  const failingMessage = buildPaymentMessage(
    failingPlan,
    (await rpc.getLatestBlockhash().send()).value,
  );
  const failingSigned = await partiallySignTransaction(
    [failedPayer.keyPair],
    compileTransaction(failingMessage),
  );
  const failingSignature = getSignatureFromTransaction(failingSigned);
  await rpc
    .sendTransaction(getBase64EncodedWireTransaction(failingSigned), {
      encoding: 'base64',
      skipPreflight: true,
      maxRetries: 0n,
    })
    .send();
  const failedRaw = await read(failingSignature);
  const failedReceipt = decodeReceipt(failingSignature, failedRaw, 'confirmed', failingPlan);
  assert.equal(failedReceipt.state, 'failed');
  assert.equal(failedReceipt.matchesPlan, false);
  checks.push('Underfunded transaction actually executes and reports failed status');
  const afterFailure = await Promise.all(
    recipients.map((recipient) =>
      rpc
        .getBalance(recipient.address, { commitment: 'confirmed' })
        .send()
        .then((result) => result.value),
    ),
  );
  assert.deepEqual(afterFailure, after);
  checks.push('Atomic rollback: no recipient retains any transfer from the failed transaction');
  const wrongPlan = { ...plan, payer: address(failedPayer.address) };
  assert.equal(decodeReceipt(signature, raw, 'confirmed', wrongPlan).matchesPlan, false);
  checks.push('Independent verifier rejects a mismatched expected payer');
  Object.assign(evidence, {
    success: true,
    payer: payer.address,
    recipients: contacts,
    signature,
    failedSignature: failingSignature,
    receipt: { ...receipt, network: 'local Surfpool' },
    assertions: checks.length,
    privateKeys: 'Generated in memory only; discarded when this process exits.',
  });
}
try {
  await main();
} catch (error) {
  evidence.error = error instanceof Error ? error.message.slice(0, 700) : 'Local test failed.';
  process.exitCode = 1;
} finally {
  surfnet?.stop();
  await writeFile('public/evidence/local-chain.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
}
