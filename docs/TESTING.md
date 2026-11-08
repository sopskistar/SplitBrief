# Reproducible verification and actual results

Final-delivery checks run with **Node v24.22.2**. The exact public-chain exception is intentional, not a failed unit suite.

| Command                                                                     | Observed result                                                                                                                  |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                                              | Passed                                                                                                                           |
| `npm run typecheck`                                                         | Passed                                                                                                                           |
| `npm run test`                                                              | **168 passed in 9 files**, up from 157                                                                                           |
| `npm run test:e2e`                                                          | **15 Chromium tests passed**, up from 12                                                                                         |
| `npm run build`                                                             | Production build passed                                                                                                          |
| `npm run test:local`                                                        | **8 Surfpool assertions passed**, including actual successful settlement and failed-transaction rollback                         |
| `npm run test:ai`                                                           | Genuine full application interpreter succeeded in **117,180 ms** using `gemini-3.8-flash`; production HTTP 200 in **147,892 ms** |
| `npm run proof:record -- SUPPLIED_SIGNATURE --expected-payer OWNER_ADDRESS` | Exit **1**, correctly rejecting supplied funding as SplitBrief batch proof; transaction itself is finalized and succeeded        |
| `node --import tsx scripts/check-production.ts`                             | Actual public browser acceptance; [latest evidence](../public/evidence/deployment.json)                                          |

Run a local server at port 3001 before E2E; `PLAYWRIGHT_BASE_URL` can select another origin. Browser tests deliberately use QA RPC fixtures and a simulated QA wallet. Those tests do not prove human Phantom approval or public-chain payments. Genuine screenshots, capture scripts, production checks, and public evidence do not mock RPC or AI traffic.

## Core coverage

Exact bigint lamports, precision rejection, malformed addresses, duplicate/self-payment prevention, transfer caps, fees/balance, immutable review, exactly one message with the correct System Program transfers, wallet capabilities/chains, cryptographic signing, changed-wallet/modified-message rejection, wallet rejection, review cancellation, blockhash expiry, and duplicate-submission guards.

The verifier decodes full transaction fixtures and rejects failed execution, wrong payer/source/destination/amount/order/count, extra signers, unrelated instructions, inner transfers, absent metadata, unsafe integer amounts, missing signatures, and RPC failure. A status alone is never proof. New evidence tests specifically reject the supplied funding shape, a different transfer source, and extra signatures.

AI tests cover strict request/output schemas, known labels and literal amounts, missing amounts, unsupported currency, prompt injection, absent key, AI toggle, request-size limits, timeout/429/503, invalid output, SDK cancellation options, and best-effort throttling. New contact-setup tests preserve the load action with saved contacts, require explicit replacement, and reject incomplete demo data without erasing the book. New browser coverage proves Manual Mode cancels a slow wait and late output cannot overwrite it.

History tests preserve valid references when a neighboring entry is corrupt, bookmark verified signatures without inventing a plan, and retain an existing submitted plan. Browser checks cover refresh persistence, desktop/mobile routes, exact supplied logo aspect ratio, navigation, empty states, fallback, review, and receipts.

## Actual local chain execution

`npm run test:local` starts the official offline Surfpool runtime with fresh **in-memory disposable signers**. It funds a payer locally, submits one signed three-transfer transaction, retrieves the real transaction, compares all decoded fields with the plan, and checks each recipient's balance delta and the payer's fee-inclusive debit. It then executes an underfunded transaction and verifies that all recipient balances remain unchanged. See [local-chain.json](../public/evidence/local-chain.json). Local signatures are not Devnet evidence.

## External evidence and limits

[Gemini diagnostics](GEMINI_DIAGNOSTICS.md) distinguish supported model access, temporary provider 503/504 errors, and the genuine successful structured response. No quota exhaustion or bad key is inferred from latency. Requests remain bounded at 270 seconds, no automatic retries, with explicit Manual Mode.

[Devnet proof](DEVNET_PROOF.md) records the exact supplied finalized transaction: a different payer sends **2.5 SOL** into the owner's wallet, with a **5,495-lamport** fee, one native transfer and two ComputeBudget instructions. It does not prove a multi-recipient payout or original-plan match. The automated disposable-wallet public airdrop previously returned HTTP 410; no autonomous public payment was sent.

The existing Vercel account is now authenticated and production is deployed at [splitbrief-zeta.vercel.app](https://splitbrief-zeta.vercel.app). [Deployment details](DEPLOYMENT.md) replace the old logged-out blocker. Human Phantom approval and a genuine public batch payout still need the owner's browser. Follow [manual acceptance](TEST_WALLETS.md); automatic QA approval is never claimed as Phantom evidence.
