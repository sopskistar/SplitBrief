import { writeFile } from 'node:fs/promises';
import {
  address,
  compileTransaction,
  createSolanaRpc,
  devnet,
  generateKeyPairSigner,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  lamports,
  partiallySignTransaction,
} from '@solana/kit';
import { assertDevnet, buildPaymentMessage, waitForReceipt } from '../lib/solana';
import { createPlan, type Contact } from '../lib/payments';

// Never loads, accepts, or imports the user's Phantom keys. Public Devnet only.
const rpc = createSolanaRpc(
  devnet(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'),
);
const evidence: Record<string, unknown> = {
  checkedAt: new Date().toISOString(),
  network: 'devnet',
  success: false,
  maxTotalTransferSol: '0.006',
  privateKeys: 'In-memory disposable signers only; never persisted or uploaded.',
};
try {
  await assertDevnet(rpc);
  const payer = await generateKeyPairSigner();
  const recipients = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);
  const contacts: Contact[] = recipients.map((recipient, index) => ({
    id: `devnet-${index}`,
    name: ['Ada', 'Chidi', 'Reserve'][index],
    address: recipient.address,
    description: 'Disposable Devnet test recipient, no retained private key',
  }));
  Object.assign(evidence, { payer: payer.address, recipients: contacts });
  let funding: string;
  try {
    funding = await rpc
      .requestAirdrop(payer.address, lamports(100_000_000n), { commitment: 'confirmed' })
      .send({ abortSignal: AbortSignal.timeout(15_000) });
    evidence.airdropSignature = funding;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    evidence.error = `Official Devnet RPC airdrop unavailable: ${message.slice(0, 500)}. No public payment was sent. Use faucet.solana.com for manual funding; local Surfpool evidence is separate.`;
    throw new Error('FUNDING_UNAVAILABLE');
  }
  for (let count = 0; count < 20; count++) {
    const balance = (await rpc.getBalance(payer.address, { commitment: 'confirmed' }).send()).value;
    if (balance >= 10_000_000n) break;
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  const plan = createPlan(
    payer.address,
    contacts.map((contact, index) => ({
      recipientLabel: contact.name,
      amountSol: ['0.002', '0.001', '0.003'][index],
      purpose: 'Public Devnet smoke test',
    })),
    contacts,
  );
  if (BigInt(plan.totalLamports) > 10_000_000n) throw new Error('Public test hard cap exceeded.');
  const before = await Promise.all(
    contacts.map((contact) =>
      rpc
        .getBalance(address(contact.address), { commitment: 'confirmed' })
        .send()
        .then((result) => result.value),
    ),
  );
  const message = buildPaymentMessage(
    plan,
    (await rpc.getLatestBlockhash({ commitment: 'confirmed' }).send()).value,
  );
  const signed = await partiallySignTransaction([payer.keyPair], compileTransaction(message));
  const signature = getSignatureFromTransaction(signed);
  evidence.signature = signature;
  // Exactly one broadcast attempt. Always inspect the known signature on errors.
  try {
    await rpc
      .sendTransaction(getBase64EncodedWireTransaction(signed), {
        encoding: 'base64',
        preflightCommitment: 'confirmed',
        skipPreflight: false,
        maxRetries: 0n,
      })
      .send({ abortSignal: AbortSignal.timeout(12_000) });
  } catch {
    evidence.submissionResponse = 'Uncertain; checking original signature only.';
  }
  const receipt = await waitForReceipt(rpc, signature, plan);
  if (!receipt.matchesPlan)
    throw new Error('Public Devnet transaction did not match the reviewed plan.');
  const after = await Promise.all(
    contacts.map((contact) =>
      rpc
        .getBalance(address(contact.address), { commitment: 'confirmed' })
        .send()
        .then((result) => result.value),
    ),
  );
  if (after.some((value, index) => value - before[index] !== BigInt(plan.items[index].lamports)))
    throw new Error('Public recipient balance delta mismatch.');
  Object.assign(evidence, {
    success: true,
    receipt,
    plan,
    recipientBalanceDeltasLamports: after.map((value, index) => (value - before[index]).toString()),
  });
} catch (error) {
  if (!evidence.error)
    evidence.error = error instanceof Error ? error.message.slice(0, 600) : 'Devnet test failed.';
  process.exitCode = 1;
} finally {
  await writeFile('public/evidence/devnet.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
}
