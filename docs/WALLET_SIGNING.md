# Phantom signing mismatch: investigation and fix

The owner recorded the pre-broadcast error “Wallet changed the reviewed transaction. Nothing was broadcast. Review a fresh draft.” That error proves the app rejected unequal message bytes; a recording of the error alone does not expose the exact two messages or original wallet-selected fees. No public batch settlement is inferred from that failure. After the fix, the owner completed a genuine outgoing 0.006 SOL batch; its finalized transaction is independently verified in [DEVNET_PROOF.md](DEVNET_PROOF.md).

## What the installed SDK does

The project uses `@solana/kit` 8.6.0 and `@solana/kit-plugin-wallet` 0.20.0. The plugin creates the official Wallet Standard transaction modifying signer. Its installed `@solana/wallet-account-signer` bridge encodes the unsigned transaction with `getTransactionCodec`, calls `solana:signTransaction`, then decodes each wallet-returned signed wire transaction with that codec. It retains the original blockhash lifetime when the message token is unchanged. It does not recompile or reorder account keys.

The original comparison is between **message bytes**, not the complete wire transaction or signature section. Adding the expected payer signature alone does not change the message. A wire-codec round trip and an actual SDK adapter browser test with an in-memory QA signer confirm that unchanged messages pass. Byte offsets/views and the transaction signatures section do not explain the reproduced mismatch.

## Documented Phantom mutation, reproduced safely

[Phantom's official priority-fee documentation](https://docs.phantom.com/developer-powertools/solana-priority-fees) says it automatically enhances unsigned dapp transactions lacking compute-budget/limit instructions. SplitBrief's old three-transfer message met those conditions. Wallet Standard explicitly permits a wallet to return a modified signed transaction; this is why the SDK exposes a modifying signer.

`node --import tsx scripts/signing-repro.ts` creates a disposable payer in memory, constructs the old 0.006 SOL message, applies one documented fee-enhancement shape, signs it locally, and exercises the same wire codec as the SDK. It **never broadcasts**.

Observed reproduction:

- Message length changes **250 → 302 bytes**.
- Version remains **0**, payer and blockhash remain identical, and the three native transfer instructions retain the same destinations and amounts.
- Header read-only account count changes **1 → 2**.
- The ComputeBudget program is added to the account list; two compiled instructions set a compute limit and unit price.
- The expected payer signature verifies over the **changed** message. The original strict guard correctly rejects it.

[signing.json](../public/evidence/signing.json) contains the exact decoded public fields from this **reproduction**, with no private keys or signature bytes. The reproduction uses 200,000 CU and 1,000 micro-lamports/CU as sample wallet additions; these values are **not claimed to be the owner's actual returned settings**. The original wallet bytes remain unavailable unless a future mismatch is exported from the app.

## Fix and retained safety

New plans carry `feePolicy: fixed-zero-priority-v1`. Before review, Kit's supported helpers add exactly these two instructions, followed by the two or three native transfers:

1. `SetComputeUnitLimit(10_000)`.
2. `SetComputeUnitPrice(0)`.

The explicit controls make Phantom's documented auto-enhancement conditions false. The review explains **zero priority fee**, the RPC-estimated network fee, and the two fee controls. The actual native transfer count remains three for the sample; Explorer now shows **five outer instructions**, not five transfers. Offline Surfpool successfully executes the exact new message and verifies balance deltas and atomic rollback.

No wallet change is accepted. The implementation still requires byte-for-byte message equality, canonical encoding, version 0, the reviewed payer/blockhash/account keys/instructions, no lookup tables, one signer, and a valid Ed25519 payer signature. It reconstructs the message from the frozen plan before signing and gives the external signer a separate byte copy so in-place mutation cannot change the comparison baseline.

The fee is re-estimated before opening the wallet; a changed quote requires a fresh human review. The approved fee is stored in the frozen snapshot. Chain verification accepts only the exact two known fee-control byte sequences, in their reviewed positions, with no accounts, and rejects duplicates, changed values, unknown programs, inner instructions, and extra transfers. Actual fees exceeding the approved estimate prevent a plan match. Historical plans without the policy retain their transfer-only expectations.

A mismatch displays changed field names and offers **Download signing diagnostic**. This browser-only report includes version, payer, blockhash, headers, public account keys, compiled instruction indices/data, signer presence, and payer-signature validity. It omits private keys, signature bytes, and a broadcastable signed wire transaction. It is never automatically uploaded. Unknown or malformed wallet messages remain blocked.

## Regression evidence

Unit tests reproduce fee insertion and reject validly signed changes to amount, recipient, payer, blockhash, version, priority fee, compute limit, extra transfers, instruction order, account ordering, header privileges, lookup tables, and trailing bytes. They also reject invalid/extra signatures, a tampered prepared message, mutation of the external signer's input, and a changed RPC fee estimate.

Browser tests exercise the **actual installed Wallet Standard adapter** with a clearly named simulated QA wallet and an in-memory disposable signer. One test signs once, submits one QA RPC transaction, verifies the receipt, and downloads its reviewed plan; another returns a changed fee instruction and verifies **zero broadcasts** plus the safe diagnostic. These tests do not claim an observed human Phantom approval or public Devnet payment.

## One real 0.006 SOL acceptance test

1. Refresh [the production app](https://splitbrief-zeta.vercel.app) to load the signing fix. Keep Phantom on **Solana Devnet** and use the separate hackathon wallet.
2. Under **Set up recipients**, load the disposable demo recipients. Confirm replacement only if you want to replace existing saved contacts. Read the full addresses.
3. Select **Manual Mode**. Confirm Ada **0.002**, Chidi **0.001**, Reserve **0.003 SOL**, total **0.006 SOL**.
4. **Connect wallet → Phantom**, then **Review payment**. Check the payer, three destinations, amounts, zero priority fee, and actual RPC fee estimate.
5. Choose **Approve & open Phantom** and personally approve once. Complete the prompt promptly; refresh the review if its blockhash expires. Do not change wallet fee settings after reviewing the zero-priority policy.
6. Wait for **Payment completed** and **Confirmed/Finalized & matched**. Copy the signature, open Explorer, and download receipt JSON. Film the full review, actual Phantom prompt, approval, and resulting receipt; keep keys and unrelated tabs out of the recording.
7. Open **Verify receipt** with that new signature. Publish batch proof only after the new genuine signature is finalized. The public proof recorder now requires finalized status before its success flag can be true. `npm run proof:record -- /path/to/downloaded-receipt.json` can compare fresh chain data with the supplied review snapshot.

If signing still rejects a changed message, download the new **signing diagnostic** and share that public JSON/error. If already submitted but verification is uncertain, recheck the original signature; never create a second payment automatically. The earlier 2.5 SOL signature remains incoming funding and is not payout proof.

References: [Phantom priority fees](https://docs.phantom.com/developer-powertools/solana-priority-fees), [Wallet Standard signed transaction contract](https://github.com/anza-xyz/wallet-standard/blob/master/packages/core/features/src/signTransaction.ts), [Kit wallet signer source](https://github.com/anza-xyz/kit/blob/main/packages/wallet-account-signer/src/wallet-account-transaction-signer.ts). Exact APIs were checked against the installed source and types.
