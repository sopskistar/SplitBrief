<p align="center">
  <img src="public/branding/splitbrief-wordmark.png" width="310" alt="SplitBrief logo">
</p>

# SplitBrief

**One brief. Multiple recipients. One Solana transaction.**

SplitBrief is an AI-assisted payment app for freelancers, small businesses, and teams. Describe who needs to be paid, review an editable plan, then approve **one atomic Solana transaction** with Phantom. A public receipt lets anyone inspect what actually happened on-chain.

**[Live app](https://splitbrief-zeta.vercel.app)** · **[Watch the narrated demo](https://splitbrief-zeta.vercel.app/demo)** · **[YouTube demo](https://youtu.be/WdmFjonqd5E)** · **[Verified transaction](https://splitbrief-zeta.vercel.app/verify?signature=5mfAUjRWXLVDRjV74L9nL8Uk5heLW9NMiJyKpPoHVQmKRjen7DAcEh66DDTJGYDFj72zqRr3zfvzEzkPD5wdxfu)** · **[Judge walkthrough](docs/JUDGE_WALKTHROUGH.md)**

![SplitBrief payment workspace](docs/screenshots/production-workspace-desktop.png)

## The problem

A business owner needs to pay a designer, a delivery partner, and a project reserve. The instructions are in one message, but preparing separate wallet transfers means repeatedly entering addresses and amounts, with more opportunities for mistakes.

**SplitBrief makes the whole payment reviewable before anything moves.** AI helps organize the instructions; the user remains responsible for every destination and approval.

## How it works

1. **Add recipients.** Save names and checked public Solana addresses in a browser-local address book.
2. **Describe the payment.** Write naturally: “Pay Ada 0.002 SOL for design, Chidi 0.001 SOL for delivery, and 0.003 SOL to Reserve.”
3. **Review the draft.** Gemini can extract names, amounts, and purposes. Edit the result or use Manual Mode. Addresses come from the saved contact book, not the AI.
4. **Approve once.** Check the full destinations, exact total, and estimated network fee before authorizing one transaction in Phantom.
5. **Verify on-chain.** Inspect the finalized transaction, actual transfers, fee, signature, and Solana Explorer link.

**AI organizes. You approve. Solana verifies.** Multiple native transfers share one atomic transaction: their transfer effects succeed together or roll back together, although network fees can still apply on failure.

## What's included

| Capability | Implementation |
| --- | --- |
| Payment planning | Natural-language Gemini interpretation, editable drafts, and explicit Manual Mode |
| Recipient management | Reviewed public wallet addresses, local address book, and disposable Devnet demo contacts |
| Atomic settlement | Two or three native SOL transfers in one Phantom-approved transaction |
| Payment safeguards | Exact lamport arithmetic, spending limits, fee review, and protected wallet signing |
| Independent receipts | Fresh Solana RPC checks, transaction detail and status, Explorer links, and local history |
| Guided product demo | Narrated video, accessible transcript, and a read-only judge walkthrough |

## Verified results

<details open>
<summary><strong>Real three-recipient Solana Devnet transaction</strong></summary>

A genuine Phantom-approved payment from the live app was finalized on Devnet: **0.006 SOL sent to three recipients in one transaction**, with a **0.000005 SOL network fee**.

| Recipient | Amount |
| --- | ---: |
| Ada | 0.002 SOL |
| Chidi | 0.001 SOL |
| Reserve | 0.003 SOL |
| **Total** | **0.006 SOL** |

**[View the transaction in SplitBrief](https://splitbrief-zeta.vercel.app/verify?signature=5mfAUjRWXLVDRjV74L9nL8Uk5heLW9NMiJyKpPoHVQmKRjen7DAcEh66DDTJGYDFj72zqRr3zfvzEzkPD5wdxfu)** · **[Solana Explorer](https://explorer.solana.com/tx/5mfAUjRWXLVDRjV74L9nL8Uk5heLW9NMiJyKpPoHVQmKRjen7DAcEh66DDTJGYDFj72zqRr3zfvzEzkPD5wdxfu?cluster=devnet)** · **[RPC evidence](public/evidence/devnet-batch.json)**

Independent RPC verification confirms the payer, three destinations, exact amounts, instruction order, reviewed fee controls, and finalization against the published demo configuration. The app's genuine [receipt screenshot](public/evidence/successful-devnet-receipt.webp) displays “Finalized & matched.” The original frozen review snapshot was not recovered separately, so an independent match to that earlier snapshot is not claimed.

</details>

- **Gemini:** Real structured interpretation succeeded locally and through the deployed API. Provider response times can be long; Manual Mode remains available. [AI evidence](public/evidence/gemini.json).
- **Atomicity:** Surfpool tests proved three transfers in one local transaction, exact balance deltas, and rollback on failure. This is separate from public Devnet evidence. [Local test proof](public/evidence/local-chain.json).
- **Quality:** The latest documented checks passed **192 unit/integration tests, 21 browser tests, and 8 Surfpool assertions**, plus lint, TypeScript, and production build. [Testing details](docs/TESTING.md).

This is a **Devnet hackathon MVP**, using test SOL with no monetary value. It is not a mainnet payment or custodial payroll service.

## Try it

Use the **[live payment app](https://splitbrief-zeta.vercel.app)** to explore the workflow or **[watch the 108-second narrated demo](https://splitbrief-zeta.vercel.app/demo)** without connecting a wallet.

For a live transaction, install Phantom, enable Testnet Mode, choose **Solana Devnet**, and use test SOL. The app can load disposable sample recipients; always review the public addresses before approving. No private keys are collected or stored by SplitBrief.

Judges can start at the **[guided walkthrough](https://splitbrief-zeta.vercel.app/judges)**, inspect the [verified batch receipt](public/evidence/devnet-batch.json), and review the [demo transcript](https://splitbrief-zeta.vercel.app/demo).

## Built with

**Next.js, React, TypeScript, Tailwind CSS, Solana Kit, Wallet Standard, Phantom, Google Gemini, Zod, and Vercel.**

The frontend handles payment review and wallet signing; a server-side route calls Gemini for structured interpretation. Transaction verification independently reads Solana RPC data. Contacts and recent receipts are stored locally in the browser. SplitBrief has no custom smart contract, custodial signing backend, or application database.

## Run locally

Requires **Node.js 24**.

```bash
git clone https://github.com/sopskistar/SplitBrief.git
cd SplitBrief
nvm use 24
npm ci
test -e .env.local || cp .env.example .env.local
npm run dev
```

Add `GEMINI_API_KEY` to your ignored `.env.local` file to enable AI interpretation. Manual Mode works without the key. Do not commit secrets or wallet recovery phrases.

Run checks with `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, and `npm run build`. Local-chain checks use `npm run test:local`.

[Architecture](docs/ARCHITECTURE.md) · [Testing](docs/TESTING.md) · [Wallet safety](docs/TEST_WALLETS.md) · [Deployment](docs/DEPLOYMENT.md)

## Hackathon submission

**Submitted to the MLH Solana Hackathon (November 6–8, 2026).** Built with OpenAI Codex assistance and based on the public Solana Foundation Kit Next.js starter and open-source dependencies.

The [narrated 108-second film](https://splitbrief-zeta.vercel.app/demo) uses genuine application footage and the independently checked public batch. Recorded Gemini output is labeled; no Phantom approval popup is fabricated.

[Submission details](docs/SUBMISSION.md) · [Judge walkthrough](docs/JUDGE_WALKTHROUGH.md) · [MIT License](LICENSE)
