import {
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
  type Transaction,
} from '@solana/kit';
import { bytesEqual } from './transaction-policy';

// Public message fields only. Never include signature bytes or a rebroadcastable signed wire transaction.
export function inspectTransaction(transaction: Transaction) {
  const [message, consumed] = getCompiledTransactionMessageDecoder().read(
    transaction.messageBytes,
    0,
  );
  if (message.version !== 0 && message.version !== 'legacy')
    throw new Error('Unsupported message version.');
  const canonical = getCompiledTransactionMessageEncoder().encode(message);
  return {
    messageLength: transaction.messageBytes.length,
    canonicalEncoding:
      consumed === transaction.messageBytes.length &&
      bytesEqual(canonical, transaction.messageBytes),
    version: message.version,
    payer: message.staticAccounts[0],
    blockhash: message.lifetimeToken,
    header: message.header,
    accountKeys: message.staticAccounts,
    addressTableLookups: message.version === 0 ? (message.addressTableLookups ?? []) : [],
    instructions: message.instructions.map((instruction) => ({
      programIndex: instruction.programAddressIndex,
      programAddress: message.staticAccounts[instruction.programAddressIndex] ?? 'unresolved',
      accountIndices: instruction.accountIndices ?? [],
      accounts: (instruction.accountIndices ?? []).map(
        (index) => message.staticAccounts[index] ?? 'unresolved',
      ),
      dataHex: Array.from(instruction.data ?? [])
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join(''),
    })),
    signatures: Object.entries(transaction.signatures).map(([signer, value]) => ({
      signer,
      present: value !== null,
    })),
  };
}
function safeInspect(transaction: Transaction) {
  try {
    return inspectTransaction(transaction);
  } catch {
    return {
      messageLength: transaction.messageBytes.length,
      decodeError: 'Malformed or unsupported transaction message.',
    };
  }
}
export function compareTransactionMessages(
  unsigned: Transaction,
  returned: Transaction,
  returnedSignatureValid: boolean | null = null,
) {
  const before = safeInspect(unsigned);
  const after = safeInspect(returned);
  const fields = [
    'messageLength',
    'version',
    'payer',
    'blockhash',
    'header',
    'accountKeys',
    'addressTableLookups',
    'instructions',
    'canonicalEncoding',
  ] as const;
  const differences = fields.filter(
    (field) =>
      JSON.stringify((before as Record<string, unknown>)[field]) !==
      JSON.stringify((after as Record<string, unknown>)[field]),
  );
  return {
    format: 'splitbrief-signing-diagnostic-v1',
    checkedAt: new Date().toISOString(),
    bytesEqual: bytesEqual(unsigned.messageBytes, returned.messageBytes),
    differences,
    returnedSignatureValid,
    before,
    after,
    note: 'Public message comparison only. No private keys, signature bytes, or broadcastable signed transaction. Nothing was submitted by this diagnostic.',
  };
}
export type SigningDiagnostic = ReturnType<typeof compareTransactionMessages>;
export class WalletMessageMismatchError extends Error {
  readonly diagnostic: SigningDiagnostic;
  constructor(unsigned: Transaction, returned: Transaction, signatureValid: boolean | null = null) {
    const diagnostic = compareTransactionMessages(unsigned, returned, signatureValid);
    super(
      `Wallet changed the reviewed transaction (${diagnostic.differences.join(', ') || 'message bytes'}). Nothing was broadcast. Cancel and review a fresh draft.`,
    );
    this.name = 'WalletMessageMismatchError';
    this.diagnostic = diagnostic;
  }
}
