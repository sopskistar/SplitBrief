<p align="center">
  <img src="public/branding/splitbrief-icon.png" width="72" height="72" alt="SplitBrief logo">
</p>

# SplitBrief

**Pay multiple people in one Solana transaction.**

SplitBrief turns an everyday payment message into a clear, reviewable payment plan. Describe who should be paid, confirm the recipients and amounts, then approve **one atomic Solana transaction** in your wallet. SplitBrief verifies the resulting transfers against the blockchain.

**[Live app](https://splitbrief-zeta.vercel.app)** · **[Create a payment](https://splitbrief-zeta.vercel.app/)** · **[Verify a receipt](https://splitbrief-zeta.vercel.app/verify)** · **[Judge walkthrough](docs/JUDGE_WALKTHROUGH.md)**

![SplitBrief payment workspace](docs/screenshots/production-workspace-desktop.png)

## The problem

Paying several collaborators often starts with an unstructured message: names, amounts, and reasons for payment mixed together. Re-entering each transfer individually takes time and makes mistakes harder to spot.

**SplitBrief puts the entire payment in front of you before anything moves.** AI can organize the message, but the user controls the address book, reviews every amount, and approves the wallet transaction.

## How it works

1. **Add recipients** — Save names and their verified public Solana addresses in your browser.
2. **Describe the payments** — For example: “Pay Ada 0.002 SOL for design, Chidi 0.001 SOL for delivery, and 0.003 SOL to Reserve.”
3. **Review the draft** — Gemini can extract payment details into an editable plan. Manual Mode is also available. AI never chooses wallet addresses or signs transactions.
4. **Approve once** — Inspect every destination, total, balance, and estimated fee before approving one transaction in Phantom.
5. **Verify on-chain** — SplitBrief reads the actual Solana Devnet transaction and shows the transfers, status, fee, signature, and Explorer link.

All transfers in the batch are included in a single Solana transaction: the transfer effects succeed together or fail together. A failed transaction may still incur a network fee.

## What’s built

| Area | What it does |
| --- | --- |
| Payment composer | Natural-language brief, Gemini interpretation, Manual Mode, editable recipient amounts |
| Recipient address book | Browser-local names and public addresses; optional disposable Devnet sample recipients |
| Solana payments | Native SOL transfers, exact lamport validation, Devnet-only Phantom wallet flow |
| Review and safety | Balance and fee checks, spending limits, reviewed transaction details, guarded signing |
| Receipt verification | Independent RPC inspection, copy/share links, transfer details, local receipt history |

Built with **Next.js, React, TypeScript, Tailwind CSS, Solana Kit, Wallet Standard, Google Gemini, and Zod**. Hosted on **Vercel**. No custom smart contract, custodial backend wallet, or application database is required.

## Try SplitBrief

**[Open the live application](https://splitbrief-zeta.vercel.app)** or follow the [step-by-step judge walkthrough](docs/JUDGE_WALKTHROUGH.md).

The demo uses **Solana Devnet** and valueless test SOL. In Phantom, enable Testnet Mode and select **Solana Devnet** (not Solana Testnet). You can load disposable sample recipients or add addresses you control.

A working browser wallet is needed to approve a payment. Anyone can explore the public interface and [inspect a Devnet receipt](https://splitbrief-zeta.vercel.app/verify) without sending funds.

### Verified evidence and current limits

- **Gemini:** A genuine structured interpretation of the three sample payments succeeded locally and through the deployed API. Response time can be high; Manual Mode remains available. [AI evidence](public/evidence/gemini.json).
- **Solana local execution:** Surfpool tests exercised an actual three-recipient transfer and an atomic rollback. These are local-chain tests, **not** public Devnet payment proof. [Local-chain evidence](public/evidence/local-chain.json).
- **Public Devnet:** The publicly recorded 2.5 SOL transaction was **incoming wallet funding**, not a SplitBrief batch payout. A public three-recipient Phantom payout and original-plan match have **not yet been verified**. [Devnet evidence](public/evidence/devnet.json).
- **Quality checks:** 168 unit/integration tests, 15 browser tests, and 8 local-chain assertions passed in the latest documented run. [Testing details](docs/TESTING.md).

This is a hackathon MVP, not a production payroll or custody service. Public wallet signing is still being validated with the participant's Phantom version. Never use a mainnet wallet or real funds for this demo.

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

Open [http://localhost:3000](http://localhost:3000), or the port printed by Next.js if 3000 is occupied.

For live AI interpretation, set `GEMINI_API_KEY` in your ignored `.env.local` file and use the configured `GEMINI_MODEL`. Without a key, the payment composer still supports Manual Mode. Never commit API keys or wallet secrets.

**Checks:** `npm run lint` · `npm run typecheck` · `npm run test` · `npm run build`

See [architecture](docs/ARCHITECTURE.md), [test instructions](docs/TESTING.md), and [deployment notes](docs/DEPLOYMENT.md) for technical details.

## For hackathon judges

SplitBrief was built for the **MLH Solana Hackathon, November 6–8, 2026**.

Start with the **[judge walkthrough](docs/JUDGE_WALKTHROUGH.md)** for an ordered tour. The [submission guide](docs/SUBMISSION.md) contains track-specific explanations; [public evidence](public/evidence) separates genuine Gemini responses, local-chain transactions, and public Devnet activity. Claims of a confirmed public batch payout will be added only once independently verified.

Project-specific work was created during the event with assistance from **OpenAI Codex**. The app uses **Google Gemini** at runtime and builds on the public **Solana Foundation Kit Next.js starter** and open-source dependencies.

## License

[MIT](LICENSE).
