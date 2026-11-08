<p align="center"><img src="public/branding/splitbrief-wordmark.png" width="325" alt="SplitBrief"></p>

# Pay multiple people in one Solana transaction.

Turn everyday payment instructions into an editable plan. Review every recipient, approve once with Phantom, and verify the result on Solana.

**[Try SplitBrief](https://splitbrief-zeta.vercel.app) · [Watch the narrated demo](https://splitbrief-zeta.vercel.app/demo) · [Verified payment](https://splitbrief-zeta.vercel.app/verify?signature=5mfAUjRWXLVDRjV74L9nL8Uk5heLW9NMiJyKpPoHVQmKRjen7DAcEh66DDTJGYDFj72zqRr3zfvzEzkPD5wdxfu) · [For judges](https://splitbrief-zeta.vercel.app/judges)**

![The SplitBrief payment workspace](docs/screenshots/production-workspace-desktop.png)

A small business owner needs to pay a designer, delivery partner and project reserve. SplitBrief puts the whole payment in front of them before anything moves.

1. Save names and reviewed public wallet addresses in the browser-local address book.
2. Describe the payments. Gemini extracts labels, exact amounts and purposes into an editable draft. Explicit Manual Mode is also available.
3. Check every full address, amount, total and fee. Approve one transaction in Phantom.
4. Inspect the real transaction: payer, recipients, amounts, fee, finality, signature and Explorer link.

**AI organizes. You approve. Solana verifies.** Gemini never chooses destinations, controls private keys or approves payments. Solana puts two or three native transfers in one atomic transaction: their transfer effects succeed together or roll back together, although network fees can still apply on failure.

## Real evidence

- **Public Devnet batch:** finalized, three recipients, **0.006 SOL**, actual fee **0.000005 SOL**. [Inspect the receipt](https://splitbrief-zeta.vercel.app/verify?signature=5mfAUjRWXLVDRjV74L9nL8Uk5heLW9NMiJyKpPoHVQmKRjen7DAcEh66DDTJGYDFj72zqRr3zfvzEzkPD5wdxfu) or [Explorer](https://explorer.solana.com/tx/5mfAUjRWXLVDRjV74L9nL8Uk5heLW9NMiJyKpPoHVQmKRjen7DAcEh66DDTJGYDFj72zqRr3zfvzEzkPD5wdxfu?cluster=devnet). Addresses, order, amounts and reviewed fee controls independently match the published demo configuration. [Machine-readable proof](public/evidence/devnet-batch.json).
- **Genuine application receipt:** the owner's [successful screenshot](public/evidence/successful-devnet-receipt.webp) displays “Finalized & matched.” The original frozen review snapshot is unavailable, so we do not claim an independent original-plan match.
- **Gemini:** genuine structured interpretation succeeded locally and through the deployed API. Recorded response: Ada 0.002, Chidi 0.001, Reserve 0.003 SOL. Measured waits were 117.2s and 147.9s; demand can make AI slow. [Provider evidence](public/evidence/gemini.json).
- **Local chain:** Surfpool proves actual three-recipient execution, exact balance changes and atomic rollback. [Separate local proof](public/evidence/local-chain.json).

The older 2.5 SOL transaction is separately labeled [incoming funding](public/evidence/devnet-funding.json), never batch-payment proof. All payments use **Solana Devnet** and valueless test SOL. This is a hackathon MVP, not a production payroll or custody service.

## Run locally

Requires **Node.js 24** and npm. In an existing checkout:

```bash
nvm use 24
npm ci
test -e .env.local || cp .env.example .env.local
npm run dev
```

Set `GEMINI_API_KEY` only in ignored `.env.local`; `GEMINI_MODEL=gemini-3.8-flash`. No key is needed for Manual Mode. In Phantom, enable Testnet Mode and select **Solana Devnet**, which is different from Solana Testnet. Use the [official faucet](https://faucet.solana.com/) for test SOL. The visible **Load disposable demo recipients** action configures three public demo addresses.

```bash
npm run lint
npm run typecheck
npm run test
npm run build
# With the local app running at port 3001:
npm run test:e2e
npm run test:local
```

[Actual test results](docs/TESTING.md) · [Architecture](docs/ARCHITECTURE.md) · [Wallet safety](docs/TEST_WALLETS.md) · [Deployment](docs/DEPLOYMENT.md)

## Demo and hackathon

The narrated product film is available at **[/demo](https://splitbrief-zeta.vercel.app/demo)** with native video controls, English captions and a transcript. Its downloadable MP4 is [here](https://splitbrief-zeta.vercel.app/demo/splitbrief-final-narrated.mp4). Source footage, narration provenance and export measurements are recorded in [the manifest](demo/EXPORT_MANIFEST.json). No Phantom approval popup is fabricated.

Built for the **MLH Solana Hackathon, November 6–8, 2026**. [Judge walkthrough](docs/JUDGE_WALKTHROUGH.md) · [Submission descriptions and tracks](docs/SUBMISSION.md).

Next.js, React, TypeScript, Tailwind CSS, Geist, Solana Kit, Wallet Standard, Google Gemini, Zod and Vercel. No custom contract, backend custody or database. Built with OpenAI Codex assistance; the recorded implementation-session model was `gpt-6.1-sol`. Uses the public Solana Foundation Kit Next.js starter and permitted open-source dependencies. Branding supplied by the owner. [MIT license](LICENSE).
