# Reproducible verification and actual results

Final-delivery checks run with **Node v24.22.2**. Public batch evidence is now independently verified; the earlier funding rejection remains an intentional safety check.

| Command                                                                     | Observed result                                                                                                                  |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                                              | Passed                                                                                                                           |
| `npm run typecheck`                                                         | Passed                                                                                                                           |
| `npm run test`                                                              | **192 passed in 9 files**, up from 157                                                                                           |
| `npm run test:e2e`                                                          | **21 Chromium tests passed**, up from 17                                                                                         |
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

[Devnet proof](DEVNET_PROOF.md) now records the genuine finalized **0.006 SOL outgoing batch**, three recipients and a **5,000-lamport** fee. A separate incoming **2.5 SOL funding** record is retained. The owner’s genuine successful receipt screenshot is archived with crop provenance. The original frozen snapshot is unavailable, so independent original-plan matching is not claimed. No additional payments were sent during final delivery. The earlier disposable-wallet airdrop returned HTTP 410; automated public payment is not claimed.

The existing Vercel account is now authenticated and production is deployed at [splitbrief-zeta.vercel.app](https://splitbrief-zeta.vercel.app). [Deployment details](DEPLOYMENT.md) replace the old logged-out blocker. The owner personally completed the genuine Phantom payment and supplied its receipt screenshot; RPC independently verified the outgoing transaction. The approval popup was not recorded. Automatic QA approval is never claimed as Phantom evidence.

## Phantom signing regression pass

The documented priority-fee insertion reproduces the reported rejection (message 250→302 bytes); this is a disposable-signer reproduction, not the original wallet bytes. The fixed message includes two reviewed fee controls before its native transfers and retains strict byte/signature checks. The complete suite now passes **192 unit tests and 21 browser tests**, including an actual SDK adapter signing round trip and malicious-fee rejection with zero broadcasts. Actual Surfpool again passes eight assertions with the five-instruction message. See [WALLET_SIGNING.md](WALLET_SIGNING.md) and [signing.json](../public/evidence/signing.json). Generated Playwright trace bundles are explicitly excluded from source linting.

## Final narrated-film and website pass — November 8

Node **v24.22.2**: lint, TypeScript, **192 tests in nine files**, production build and all **21 Playwright tests** passed. Surfpool was rerun: **eight assertions passed**, with fresh in-memory signers, actual settlement and rollback; no additional public payment. Four new browser tests cover homepage navigation, a real playable 108-second H.264/AAC asset with narration signal, 320/390px mobile fit, accessible captions/transcript, judge evidence and original-plan boundaries. Headless Linux uses an explicit null audio sink to keep the audio clock running while measuring actual decoded AAC samples. This is an audio-signal check, not a human listening claim.

The genuine public batch was independently reverified through RPC. The owner-supplied production screenshot displays the same signature and the application's successful plan match; its original frozen snapshot remains unavailable. See [DEVNET_PROOF.md](DEVNET_PROOF.md). No new Phantom approval recording is claimed.

`node scripts/qa-final-demo.mjs` checks the actual finished MP4: H.264, AAC, 1920×1080, 30fps, **108 seconds**, **3,240 frames**, full decode, no black interval ≥0.25 seconds and no frozen interval ≥12 seconds. Integrated audio was **−16.55 LUFS**, true peak **−0.90 dBTP**. Full narration transcription ends with “today.” at **106.4s**, leaving a complete ending and pause. A contact sheet spanning the film and full-size UI/proof/end frames were visually inspected; captions were moved below the product annotations. [Actual export manifest](../demo/EXPORT_MANIFEST.json). Final production playback and browser checks are recorded in [deployment.json](../public/evidence/deployment.json).
