import {
  address,
  appendTransactionMessageInstructions,
  assertIsFullySignedTransaction,
  compileTransaction,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getBase64Decoder,
  getBase64EncodedWireTransaction,
  getPublicKeyFromAddress,
  getSignatureFromTransaction,
  isTransactionModifyingSigner,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  signature as kitSignature,
  verifySignature,
  type Blockhash,
  type Transaction,
  type TransactionSigner,
  type TransactionMessageBytesBase64,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { assertAffordable, validatePlan, type PaymentPlan } from './payments';
import { decodeReceipt, signatureSchema, type Receipt } from './verification';
import { evaluatePaymentEvidence } from './payment-evidence';
import { FIXED_FEE_POLICY, reviewedFeeInstructions, bytesEqual } from './transaction-policy';
import { inspectTransaction, WalletMessageMismatchError } from './signing-diagnostics';

export const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
export const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
export type AppRpc = ReturnType<typeof createSolanaRpc>;

export function rpcClient(url = RPC_URL): AppRpc {
  return createSolanaRpc(url);
}

export async function assertDevnet(rpc: AppRpc): Promise<void> {
  if (process.env.NEXT_PUBLIC_SOLANA_NETWORK && process.env.NEXT_PUBLIC_SOLANA_NETWORK !== 'devnet')
    throw new Error('SplitBrief only supports Solana Devnet. Fix NEXT_PUBLIC_SOLANA_NETWORK.');
  const genesis = await rpc.getGenesisHash().send({ abortSignal: AbortSignal.timeout(10_000) });
  if (genesis !== DEVNET_GENESIS)
    throw new Error('RPC is not Solana Devnet. Mainnet, Testnet, and other clusters are blocked.');
}

export function buildPaymentMessage(
  plan: PaymentPlan,
  lifetime: { blockhash: Blockhash; lastValidBlockHeight: bigint },
) {
  validatePlan(plan);
  const payer = createNoopSigner(address(plan.payer));
  const instructions = plan.items.map((item) =>
    getTransferSolInstruction({
      source: payer,
      destination: address(item.address),
      amount: BigInt(item.lamports),
    }),
  );
  return pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayer(address(plan.payer), tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(lifetime, tx),
    (tx) =>
      appendTransactionMessageInstructions(
        plan.feePolicy === FIXED_FEE_POLICY
          ? [...reviewedFeeInstructions(), ...instructions]
          : instructions,
        tx,
      ),
  );
}

export async function preparePayment(rpc: AppRpc, plan: PaymentPlan) {
  validatePlan(plan);
  await assertDevnet(rpc);
  const [latest, balance] = await Promise.all([
    rpc
      .getLatestBlockhash({ commitment: 'confirmed' })
      .send({ abortSignal: AbortSignal.timeout(10_000) }),
    rpc
      .getBalance(address(plan.payer), { commitment: 'confirmed' })
      .send({ abortSignal: AbortSignal.timeout(10_000) }),
  ]);
  const message = buildPaymentMessage(plan, latest.value);
  const transaction = compileTransaction(message);
  const fee = await rpc
    .getFeeForMessage(
      getBase64Decoder().decode(transaction.messageBytes) as TransactionMessageBytesBase64,
      { commitment: 'confirmed' },
    )
    .send({ abortSignal: AbortSignal.timeout(10_000) });
  if (fee.value === null)
    throw new Error('RPC could not estimate this transaction fee. Refresh the review.');
  assertAffordable(plan, balance.value, fee.value);
  return {
    transaction,
    plan: Object.freeze({ ...plan, approvedFeeLamports: fee.value.toString() }),
    fee: fee.value,
    balance: balance.value,
    blockhash: latest.value.blockhash,
    lastValidBlockHeight: latest.value.lastValidBlockHeight,
    preparedAt: Date.now(),
  };
}
export type PreparedPayment = Awaited<ReturnType<typeof preparePayment>>;

export function assertWalletReady(
  signer: TransactionSigner | null | undefined,
  accountChains: readonly string[],
  versions: ReadonlySet<unknown>,
  payer: string,
) {
  if (!signer) throw new Error('Connect a wallet that supports transaction signing.');
  if (!accountChains.includes('solana:devnet'))
    throw new Error('Wallet does not support Solana Devnet. Select Devnet in Phantom.');
  if (signer.address !== payer)
    throw new Error('The connected wallet changed. Review the payment again.');
  if (!versions.has(0))
    throw new Error(
      'This wallet cannot sign a version 0 transaction. Use Phantom with Devnet enabled.',
    );
  if (!isTransactionModifyingSigner(signer))
    throw new Error(
      'This wallet must support signTransaction so the reviewed message can be checked before broadcast.',
    );
  return signer;
}

export async function validateSignedTransaction(
  unsigned: Transaction,
  signed: Transaction,
  payer: string,
): Promise<void> {
  const sig = signed.signatures[address(payer)];
  let signatureValid = false;
  try {
    signatureValid =
      !!sig &&
      (await verifySignature(
        await getPublicKeyFromAddress(address(payer)),
        sig,
        signed.messageBytes,
      ));
  } catch {
    /* Invalid bytes never pass signature validation. */
  }
  if (!bytesEqual(signed.messageBytes, unsigned.messageBytes))
    throw new WalletMessageMismatchError(unsigned, signed, signatureValid);
  const message = inspectTransaction(signed);
  if (
    !message.canonicalEncoding ||
    message.version !== 0 ||
    message.payer !== payer ||
    message.header.numSignerAccounts !== 1 ||
    message.addressTableLookups.length
  )
    throw new Error('Unexpected message structure or signer. Nothing was broadcast.');
  assertIsFullySignedTransaction(signed);
  const signatures = Object.entries(signed.signatures);
  if (signatures.length !== 1 || signatures[0][0] !== payer)
    throw new Error('Unexpected transaction signer. Nothing was broadcast.');
  if (!signatureValid)
    throw new Error('Wallet returned an invalid signature. Nothing was broadcast.');
}

export class SubmissionGate {
  private locked = false;
  private attempted = false;
  begin() {
    if (this.locked || this.attempted)
      throw new Error(
        'This payment is already signing or submitted. Check its original signature.',
      );
    this.locked = true;
  }
  markAttempted() {
    this.attempted = true;
  }
  releaseBeforeBroadcast() {
    if (!this.attempted) this.locked = false;
  }
}

export async function canRetirePendingSubmission(
  rpc: AppRpc,
  pending: { signature: string; blockhash: Blockhash; lastValidBlockHeight: bigint },
): Promise<boolean> {
  signatureSchema.parse(pending.signature);
  await assertDevnet(rpc);
  const sig = kitSignature(pending.signature);
  const options = { abortSignal: AbortSignal.timeout(12_000) };
  const [status, transaction, height, valid] = await Promise.all([
    rpc.getSignatureStatuses([sig], { searchTransactionHistory: true }).send(options),
    rpc
      .getTransaction(sig, {
        encoding: 'jsonParsed',
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      })
      .send(options),
    rpc.getBlockHeight({ commitment: 'confirmed' }).send(options),
    rpc.isBlockhashValid(pending.blockhash, { commitment: 'confirmed' }).send(options),
  ]);
  return (
    status.value[0] === null &&
    transaction === null &&
    height > pending.lastValidBlockHeight &&
    valid.value === false
  );
}

export async function fetchReceipt(
  rpc: AppRpc,
  signature: string,
  expected?: PaymentPlan,
): Promise<Receipt> {
  signatureSchema.parse(signature);
  await assertDevnet(rpc);
  const sig = kitSignature(signature);
  const [transaction, status] = await Promise.all([
    rpc
      .getTransaction(sig, {
        commitment: 'confirmed',
        encoding: 'jsonParsed',
        maxSupportedTransactionVersion: 0,
      })
      .send({ abortSignal: AbortSignal.timeout(12_000) }),
    rpc
      .getSignatureStatuses([sig], { searchTransactionHistory: true })
      .send({ abortSignal: AbortSignal.timeout(12_000) }),
  ]);
  return decodeReceipt(
    signature,
    transaction,
    status.value[0]?.confirmationStatus ?? null,
    expected,
  );
}

export async function findRecentPayments(rpc: AppRpc, payer: string): Promise<Receipt[]> {
  await assertDevnet(rpc);
  const signatures = await rpc
    .getSignaturesForAddress(address(payer), { limit: 5, commitment: 'confirmed' })
    .send({ abortSignal: AbortSignal.timeout(12_000) });
  const receipts: Receipt[] = [];
  for (const entry of signatures) {
    const receipt = await fetchReceipt(rpc, entry.signature);
    if (evaluatePaymentEvidence(receipt, payer).success) receipts.push(receipt);
  }
  return receipts;
}

export async function waitForReceipt(
  rpc: AppRpc,
  signature: string,
  plan: PaymentPlan,
  timeoutMs = 45_000,
): Promise<Receipt> {
  const end = Date.now() + timeoutMs;
  let lastError = 'Transaction is still pending.';
  while (Date.now() < end) {
    try {
      return await fetchReceipt(rpc, signature, plan);
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'RPC could not verify the transaction.';
    }
    await new Promise((resolve) => setTimeout(resolve, 1800));
  }
  throw new Error(
    `Unable to verify yet. Do not resend. Recheck the original signature. ${lastError}`,
  );
}

export async function signAndSubmit(
  rpc: AppRpc,
  prepared: PreparedPayment,
  signer: TransactionSigner,
  gate: SubmissionGate,
  callbacks: {
    onAwaiting: () => void;
    onSubmitted: (signature: string) => void;
    isCurrentWallet: () => boolean;
  },
): Promise<Receipt> {
  gate.begin();
  let broadcastAttempted = false;
  try {
    validatePlan(prepared.plan);
    if (signer.address !== prepared.plan.payer || !isTransactionModifyingSigner(signer))
      throw new Error('Wallet changed or does not support reviewable signing.');
    const reviewed = compileTransaction(
      buildPaymentMessage(prepared.plan, {
        blockhash: prepared.blockhash,
        lastValidBlockHeight: prepared.lastValidBlockHeight,
      }),
    );
    if (!bytesEqual(reviewed.messageBytes, prepared.transaction.messageBytes))
      throw new Error('Prepared transaction differs from the frozen plan. Nothing was broadcast.');
    await assertDevnet(rpc);
    const quotedFee = await rpc
      .getFeeForMessage(
        getBase64Decoder().decode(reviewed.messageBytes) as TransactionMessageBytesBase64,
        { commitment: 'confirmed' },
      )
      .send({ abortSignal: AbortSignal.timeout(10_000) });
    if (
      quotedFee.value !== prepared.fee ||
      (prepared.plan.approvedFeeLamports !== undefined &&
        prepared.plan.approvedFeeLamports !== prepared.fee.toString())
    )
      throw new Error('The network fee estimate changed. Refresh the review before signing.');
    const [height, balance] = await Promise.all([
      rpc
        .getBlockHeight({ commitment: 'confirmed' })
        .send({ abortSignal: AbortSignal.timeout(10_000) }),
      rpc
        .getBalance(address(prepared.plan.payer), { commitment: 'confirmed' })
        .send({ abortSignal: AbortSignal.timeout(10_000) }),
    ]);
    if (height > prepared.lastValidBlockHeight - 15n)
      throw new Error('The review blockhash is expiring. Refresh the review before signing.');
    assertAffordable(prepared.plan, balance.value, prepared.fee);
    if (!callbacks.isCurrentWallet())
      throw new Error('The connected wallet changed. Review the payment again.');
    callbacks.onAwaiting();
    // Keep the reviewed bytes separate from mutable data supplied to an external signer.
    const walletInput = {
      ...reviewed,
      messageBytes: new Uint8Array(
        reviewed.messageBytes,
      ) as unknown as typeof reviewed.messageBytes,
      signatures: { ...reviewed.signatures },
    };
    const signedTransactions = await signer.modifyAndSignTransactions([walletInput]);
    if (signedTransactions.length !== 1)
      throw new Error('Expected exactly one signed transaction.');
    const signed = signedTransactions[0];
    await validateSignedTransaction(reviewed, signed, prepared.plan.payer);
    if (!callbacks.isCurrentWallet())
      throw new Error('Wallet disconnected or changed during signing. Nothing was broadcast.');
    const currentHeight = await rpc
      .getBlockHeight({ commitment: 'confirmed' })
      .send({ abortSignal: AbortSignal.timeout(10_000) });
    if (currentHeight > prepared.lastValidBlockHeight)
      throw new Error(
        'Blockhash expired during wallet approval. Nothing was broadcast. Review again.',
      );
    const signature = getSignatureFromTransaction(signed);
    gate.markAttempted();
    broadcastAttempted = true;
    // Notify immediately after starting the single submission, including uncertain network responses.
    const submission = rpc
      .sendTransaction(getBase64EncodedWireTransaction(signed), {
        encoding: 'base64',
        preflightCommitment: 'confirmed',
        skipPreflight: false,
        maxRetries: 0n,
      })
      .send({ abortSignal: AbortSignal.timeout(12_000) });
    try {
      callbacks.onSubmitted(signature);
    } catch {
      /* Chain verification still proceeds if local history storage is unavailable. */
    }
    try {
      const returned = await submission;
      if (returned !== signature) throw new Error('RPC returned an unexpected signature.');
    } catch {
      /* Submission can succeed despite a lost response. Only inspect the ORIGINAL signature; never rebroadcast. */
    }
    return await waitForReceipt(rpc, signature, prepared.plan);
  } finally {
    if (!broadcastAttempted) gate.releaseBeforeBroadcast();
  }
}
