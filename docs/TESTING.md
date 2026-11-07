# Reproducible testing and evidence

Build environment: Ubuntu WSL Linux x64, Node **v24.22.2**, Next.js **16.4.3**, Solana Kit **8.6.0**, Google GenAI **3.0.0**, Surfpool **1.7.0**. Actual package resolutions are pinned in `package-lock.json`.

## Current verification

| Command                | Result                                                                            |
| ---------------------- | --------------------------------------------------------------------------------- |
| `npm run lint`         | Passed                                                                            |
| `npm run typecheck`    | Passed                                                                            |
| `npm run test`         | **157 passed**, 8 files, 0 failures                                               |
| `npm run build`        | Passed in the final Node 24 CI run (all application and metadata routes compiled) |
| `npm run test:e2e`     | **12 passed**, 0 failures, including recovery/clarification regressions           |
| `npm run test:local`   | **8 actual local-chain assertions passed**                                        |
| `npm run test:ai`      | Genuine call attempted; **timeout, not verified**                                 |
| `npm run test:devnet`  | **Blocked by official RPC airdrop HTTP 410 Gone**; no payment sent                |
| `npm audit --omit=dev` | **0 production vulnerabilities**                                                  |

The first browser attempts stopped because the matching Chromium executable was absent. After `npx playwright install chromium`, the initial 10 browser tests passed. Selectors were corrected to distinguish app errors from Next.js's route announcer. Regression tests then added stale-draft blocking and explicit pending-submission recovery. A hydration timing issue found during real capture inspection was corrected by keeping wallet-dependent initial render state stable. Every browser scenario now also asserts zero uncaught runtime/hydration errors. No automatic Phantom approval is claimed.

Final local production smoke: all nine app/metadata asset routes returned HTTP 200; the secret-file path returned 404 and invalid API input returned 400 without invoking Gemini. The actual local key was absent from 21 built client asset files. Final screenshots and non-wallet video clips were captured from the production preview with zero uncaught browser exceptions.

## Run the checks

```bash
source "$HOME/.nvm/nvm.sh"
nvm use 24
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run dev -- --hostname 127.0.0.1 --port 3001
# In a second Node 24 shell:
npx playwright install chromium
npm run test:e2e
npm run test:local
```

Use `PLAYWRIGHT_BASE_URL` for a different running origin. Browser tests use clearly named QA fixtures and a **simulated QA wallet**, never the owner's Phantom. Fixture confirmations are not public proof and their traces/screenshots remain under ignored test output. The screenshot/demo scripts do not intercept RPC or model traffic.

## What is exercised

Core tests validate exact lamports, precision rejection, malformed addresses, duplicate and self-payment protection, caps, fees/balance, immutable review data, exactly one message with the correct System Program transfers, wallet capabilities/chains, cryptographic signing, changed-wallet/modified-message rejection, user rejection, cancellation, blockhash expiry, and duplicate-submission guards.

Verifier tests decode full transaction fixtures and reject failed execution, wrong payer/source/destination/amount/order/count, unrelated instructions, inner transfers, absent metadata, unsafe integer amounts, missing signatures, and RPC failure. Missing status alone never becomes proof.

AI/route tests cover strict request/output schemas, names and literal amounts, missing amounts, unsupported currency, prompt-injection guards, absent key, AI toggle, oversized/chunked input, provider errors/timeout/429/503, invalid output, and best-effort throttling. Mock provider tests establish application behavior, not live model access.

## Actual Surfpool execution

`test:local` starts the official embedded Surfpool runtime with `offline:true`. It uses fresh in-memory signers, funds a local payer, constructs and signs one three-transfer Kit transaction, submits it, retrieves the actual transaction, matches its decoded instructions, and checks all three recipient balance deltas and the payer's fee-inclusive debit.

It then intentionally submits an underfunded transaction. Execution fails, the decoder marks it failed, and every recipient balance remains unchanged. This proves atomic rollback on the actual local runtime. See [local-chain.json](../public/evidence/local-chain.json) for public addresses, local signatures, actual receipt, and eight assertion labels. These signatures cannot be presented as Devnet Explorer evidence.

## Live external checks and blockers

The owner's public Phantom address had 2.5 SOL on Devnet. That read-only lookup does not prove wallet connection, signing, or a payment.

Google's live API was called with the ignored local key without displaying it. Earlier `generateContent` attempts returned 504 deadline errors; the maintained SDK's documented Interactions route also exceeded the final 20-second bound. A trial minimal thinking level was explicitly rejected by the provider; the current implementation uses supported low thinking. The latest [sanitized Gemini result](../public/evidence/gemini.json) is authoritative. No successful response or quota claim is invented.

The public Devnet smoke test attempted a free official RPC airdrop and got HTTP 410 Gone. It did not broadcast a payment. The user can fund/approve the manual Phantom path; see [TEST_WALLETS.md](TEST_WALLETS.md).

Vercel CLI 65.12.1 reports **Logged out**. Deployment and live acceptance need sign-in. See [DEPLOYMENT.md](DEPLOYMENT.md). GitHub auth was independently checked with network access and was available.
