import { readFile, writeFile } from 'node:fs/promises';
import {
  blockhash,
  compileTransaction,
  generateKeyPairSigner,
  getTransactionCodec,
  partiallySignTransaction,
  setTransactionMessageComputeUnitLimit,
  setTransactionMessageComputeUnitPrice,
} from '@solana/kit';
import { createPlan, validateContacts, SAMPLE_BRIEF } from '../lib/payments';
import { buildPaymentMessage, validateSignedTransaction } from '../lib/solana';
import { compareTransactionMessages, WalletMessageMismatchError } from '../lib/signing-diagnostics';
const contacts = validateContacts(
  JSON.parse(await readFile('public/demo-recipients.json', 'utf8')).recipients,
);
const payer = await generateKeyPairSigner(); // Memory only; never output/export the keypair.
const plan = createPlan(
  payer.address,
  contacts.map((contact, index) => ({
    recipientLabel: contact.name,
    amountSol: ['0.002', '0.001', '0.003'][index],
    purpose: '',
  })),
  contacts,
);
const lifetime = {
  blockhash: blockhash('11111111111111111111111111111111'),
  lastValidBlockHeight: 500n,
};
const oldMessage = buildPaymentMessage({ ...plan, feePolicy: undefined }, lifetime);
const unsigned = compileTransaction(oldMessage);
const enhanced = compileTransaction(
  setTransactionMessageComputeUnitPrice(
    1000n,
    setTransactionMessageComputeUnitLimit(200_000, oldMessage),
  ),
);
const returned = getTransactionCodec().decode(
  getTransactionCodec().encode(await partiallySignTransaction([payer.keyPair], enhanced)),
);
let failure;
try {
  await validateSignedTransaction(unsigned, returned, payer.address);
  throw new Error('Changed transaction incorrectly accepted.');
} catch (error) {
  if (!(error instanceof WalletMessageMismatchError)) throw error;
  failure = error.diagnostic;
}
const fixedUnsigned = compileTransaction(buildPaymentMessage(plan, lifetime));
const fixedReturned = getTransactionCodec().decode(
  getTransactionCodec().encode(await partiallySignTransaction([payer.keyPair], fixedUnsigned)),
);
await validateSignedTransaction(fixedUnsigned, fixedReturned, payer.address);
const result = {
  checkedAt: new Date().toISOString(),
  node: process.version,
  source:
    'Disposable in-memory reproduction of documented Phantom priority-fee enhancement, through the SDK wire codec. NOT captured original Phantom transaction bytes.',
  userObservedFailure:
    'Wallet changed the reviewed transaction. Nothing was broadcast. Review a fresh draft.',
  instruction: SAMPLE_BRIEF,
  failureReproduced: true,
  documentedFeeInjection: failure,
  fixedPolicy: {
    computeUnitLimit: 10000,
    unitPriceMicroLamports: '0',
    bytesUnchanged: compareTransactionMessages(fixedUnsigned, fixedReturned).bytesEqual,
    signatureVerified: true,
  },
  actualUserMessageDifferences:
    'Unavailable from the error recording alone. A repeated mismatch can export the exact public message comparison from the app.',
  broadcast: false,
  privateKeys: 'In-memory disposable signer only; discarded at process exit; never exported.',
  references: [
    'https://docs.phantom.com/developer-powertools/solana-priority-fees',
    'https://github.com/anza-xyz/kit/blob/main/packages/wallet-account-signer/src/wallet-account-transaction-signer.ts',
  ],
};
await writeFile('public/evidence/signing.json', JSON.stringify(result, null, 2) + '\n');
console.log(
  JSON.stringify({
    failureReproduced: result.failureReproduced,
    changedFields: failure.differences,
    signatureOnChangedMessageValid: failure.returnedSignatureValid,
    originalMessageLength: failure.before.messageLength,
    returnedMessageLength: failure.after.messageLength,
    fixedPolicy: result.fixedPolicy,
    broadcast: false,
  }),
);
