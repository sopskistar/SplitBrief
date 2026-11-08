<h1><img src="public/branding/splitbrief-wordmark.png" alt="SplitBrief" width="340" /></h1>

**Pay multiple people in one Solana transaction.**

[Live application](https://splitbrief-zeta.vercel.app) · [Judge evidence](https://splitbrief-zeta.vercel.app/judges) · [MLH submission material](docs/SUBMISSION.md)

Built during the November 6–8, 2026 MLH Solana Hackathon. SplitBrief is a Devnet payment workspace for people paying several collaborators: turn a messy message into a reviewable draft, resolve names against a local address book, sign one atomic transaction, and independently inspect what the chain recorded.

![Actual SplitBrief workspace](docs/screenshots/production-workspace-desktop.png)

## What works, and what remains unverified

The application includes a responsive workspace, three-contact address book, manual composer, server-only Gemini interpreter, exact bigint validation, Wallet Standard connection, RPC balance and fee checks, a frozen review, one version 0 transaction with 2–3 native SOL transfers, independent receipt matching, refreshed local history, `/verify`, `/judges`, privacy/help pages, metadata, OG image, favicon, robots, and sitemap.

| Evidence                                            | Actual result                                                                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit, route, signing, verification, component tests | **168 passing tests in 9 files**                                                                                                                  |
| Chromium UI suite                                   | **15 passing browser tests**, including mobile and receipt persistence                                                                            |
| Actual local atomic execution                       | **8 Surfpool assertions passed**, including balance deltas and rollback after failed execution                                                    |
| Production build, lint, TypeScript                  | Passed                                                                                                                                            |
| Live Gemini                                         | **Genuine structured response verified** in 117.2 seconds locally; deployed HTTP 200 in **147.9 seconds** with the exact three amounts            |
| Supplied public Devnet signature                    | **Finalized incoming funding**, 2.5 SOL into the owner's wallet; one transfer, fee 5,495 lamports. **Not a batch payout**                         |
| Original payment-plan match                         | Unavailable for the supplied signature; no match claimed                                                                                          |
| Human Phantom approval                              | User reported a test; supplied signature does not establish an outgoing batch. Approval footage was not captured                                  |
| Vercel                                              | **Deployed and anonymously checked:** https://splitbrief-zeta.vercel.app                                                                          |
| Demo video                                          | **104.27-second captioned MP4 exported and inspected.** Source provenance: [demo materials](docs/DEMO_SHOTLIST.md). No simulated Phantom approval |

Machine-readable evidence is in [`public/evidence`](public/evidence). Local Surfpool signatures are **not** public Devnet signatures and have no public Explorer proof. QA fixtures never appear as public payment evidence.

## The workflow

1. Save Ada, Chidi, and Reserve with three distinct public Solana addresses. The visible **Set up recipients** action loads disposable demo recipients; replacing saved contacts requires confirmation. You can also add your own reviewed test addresses.
2. Enter: “Pay Ada 0.002 SOL for design, Chidi 0.001 SOL for delivery, and send 0.003 SOL to Reserve.”
3. Interpret with Gemini when available, or explicitly select **Manual Mode**. Unknown labels, missing amounts, unsupported currencies, and ambiguous instructions need correction. Editing or failing to interpret a brief blocks the previous draft until you reinterpret or select Manual Mode. During high provider demand, a real request can take several minutes; Manual Mode cancels the browser wait.
4. Connect Phantom on Devnet. Review every full address, exact amount, RPC-estimated fee, balance, and debit. Choose **Approve & open Phantom**, then personally approve once in the wallet.
5. SplitBrief submits one transaction, retrieves its actual instructions, and compares them against the frozen plan. **Payment completed** appears only for a successful match. The receipt exposes the full signature, source/destinations, amounts, total, actual fee, network state, Explorer, download, and copy/share controls.
6. Recent receipts store references and available reviewed plans in this browser. Reloading refreshes chain verification. Localhost and production have separate storage; Verify can bookmark a known signature, and **Find my payments** can recover recent outgoing batches from the connected wallet without inventing an original plan.

## Run locally: Node 24

The official starter requires Node 24+. This build used **Node v24.22.2** and `.nvmrc` contains `24`.

```bash
cd ~/projects/SplitBrief
source "$HOME/.nvm/nvm.sh"
nvm install 24
nvm alias default 24
nvm use 24
node -v
npm ci
test -e .env.local || cp .env.example .env.local
```

Keep your existing `.env.local`. Add the Gemini key locally; never paste it in chat or use a `NEXT_PUBLIC_` key variable. The app and Manual Mode can run without a key.

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash
AI_REQUESTS_ENABLED=true
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SITE_URL=
```

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Open `http://localhost:3001`. Normal future interactive WSL shells already load NVM and use default 24. Existing Codex or noninteractive processes can retain Node 22: run `source "$HOME/.nvm/nvm.sh"` and `nvm use 24` **in the actual process** running npm. Check `command -v node`, `type -a node`, and `node -v` if versions disagree. No system Node installation was overwritten.

In Phantom, enable Testnet Mode under Settings and select **Solana Devnet**, not Solana Testnet. They have distinct balances. Use the [official faucet](https://faucet.solana.com/) for free test SOL. See [test wallets and manual acceptance](docs/TEST_WALLETS.md).

## Why AI, why Solana

Gemini interprets the payment language into strict JSON. It sees contact names, not the address book. The server uses the maintained Google GenAI SDK's documented **Interactions API**, `response_format` JSON schema, `store:false`, disabled automatic continuation, a 1,024-token output cap, no automatic provider retries, Zod validation, and a 270-second application deadline (285 seconds in the browser and 300 seconds on Vercel). It does not choose addresses or execute payments.

Solana supplies native transfers in **one** transaction. Each recipient gets a System Program transfer instruction, all sharing one fee payer, message, signature, blockhash, and submission. All state effects succeed or roll back together; fees can still be charged on a failed transaction. A separate decoder checks the full RPC transaction, not just the signature status.

See [architecture and trust boundaries](docs/ARCHITECTURE.md).

## Limits and safety

- Devnet genesis hash is checked before balance preparation, signing, recovery, and verification. Wallet signing requests specify `solana:devnet`; the product has no cluster switch.
- Exactly 2–3 distinct recipients. Positive SOL decimals with at most 9 decimal places. No exponent notation, rounding, duplicate destinations, or self-payments. At most 0.1 SOL per transfer and 0.2 SOL total.
- No backend signer, private-key import, custody, smart contract, database, swaps, token minting, scheduled execution, or mainnet path.
- Wallet-returned bytes must equal the reviewed message, and its payer signature is cryptographically checked before broadcast. User rejection and cancellation do not send a transaction.
- A lost submission response triggers checks of the original signature, never another payment. An expired absent submission can be retired only after network checks and an explicit new-review action. Missing/pruned history does not prove it never landed.
- Contacts/history are untrusted browser-local references. Google and RPC/hosting providers have their own privacy policies. The app includes no analytics.
- Serverless rate limiting is best-effort per process: cold starts, multiple instances, proxies, and spoofed identifiers limit its effectiveness. Set **Google project quota/billing controls** and disable `AI_REQUESTS_ENABLED` when needed; this app is not a global spending cap.

## Test and evidence commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e       # requires running app on port 3001
npm run test:local     # actual offline Surfpool; in-memory disposable signers
npm run test:ai        # genuine provider call; failure is reported truthfully
npm run test:devnet    # optional free-airdrop smoke; at most 0.006 SOL, disposable addresses only
```

After your manual public Devnet transaction:

```bash
npm run proof:record -- YOUR_PUBLIC_DEVNET_SIGNATURE
# Or pass the receipt JSON downloaded from the app, including its reviewed plan.
npm run build
```

That script independently rechecks RPC. A signature alone proves decoded chain activity, not a match to an unknown brief or who clicked the wallet approval. No private key is accepted. See [testing results and limitations](docs/TESTING.md).

## Deployment and judging

The existing Vercel project runs **Node 24** at [splitbrief-zeta.vercel.app](https://splitbrief-zeta.vercel.app). The server-only Gemini secret is configured in production; no client API key is used. Anonymous Playwright checks verified routes, supplied wordmark, metadata, mobile fit, actual Devnet receipt decoding, and persisted references. See [deployment details](docs/DEPLOYMENT.md) and [browser evidence](public/evidence/deployment.json).

The supplied signature was independently verified as incoming funding, with a different fee payer, one 2.5 SOL transfer, and two ComputeBudget instructions. It does not prove the requested payout. See [the exact chain result](docs/DEVNET_PROOF.md). Public multi-recipient proof still requires the wallet owner’s genuine approval; local atomic execution is already proven. Gemini’s supported model and successful responses are documented in [diagnostics](docs/GEMINI_DIAGNOSTICS.md).

- [Two-minute judge walkthrough](docs/JUDGE_WALKTHROUGH.md)
- [Submission text and category eligibility](docs/SUBMISSION.md)
- [105-second demo script](docs/DEMO_SCRIPT.md) and [shot list](docs/DEMO_SHOTLIST.md)
- [Actual desktop/mobile screenshots](docs/screenshots)

The [event schedule](https://events.mlh.com/events/15200-solana-hackathon) lists initial submission **November 8 at 10:00 AM ET** and final submission **11:45 AM ET**. Submit one entry per team early. The AI Track now has genuine structured provider evidence. Public batch proof and Phantom recording remain incomplete; disclose them. The MLH form separately shows a later close, so use the earlier organizer deadlines.

## Attribution and hackathon disclosure

Project-specific implementation was written during the hackathon. The scaffold/configuration and wallet integration patterns come from the public [Solana Foundation Kit Next.js template](https://github.com/solana-foundation/templates/tree/main/kit/nextjs); an original starter README is retained at [docs/OFFICIAL_STARTER.md](docs/OFFICIAL_STARTER.md). Dependencies retain their own licenses. The repository's original MIT [LICENSE](LICENSE), identity, and initial history are preserved.

AI coding assistance: **OpenAI Codex, model `gpt-6.1-sol`**, verified from this session's runtime `turn_context.model` metadata on November 7, 2026. Codex assisted implementation, documentation, debugging, tests, and demo preparation. Gemini is the application interpreter; its genuine local and production responses are separately recorded in public evidence.
