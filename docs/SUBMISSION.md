# MLH submission material

**Project:** SplitBrief

**Short description:** Pay multiple people in one Solana transaction. SplitBrief turns ordinary payment instructions into a reviewed draft, maps names to saved public addresses, and verifies every native SOL transfer after one wallet approval.

**Repository:** https://github.com/sopskistar/SplitBrief

**Verified live app:** https://splitbrief-zeta.vercel.app

**Judge evidence:** https://splitbrief-zeta.vercel.app/judges

**Submission form:** https://www.mlh.com/events/solana-hackathon/submissions/new (requires the team's MLH sign-in)

**Video:** The original `demo/output/splitbrief-105s.mp4` is an accurate but silent prior cut. A **104.27-second narrated 1080p replacement** with the successful public Devnet batch receipt has now been prepared separately for the participant to upload to YouTube. Its rendered file is not yet published or committed to this repository; do not invent a YouTube URL. The new cut uses the participant's actual finalized, plan-matched receipt screenshot rather than mislabeling the earlier 2.5 SOL funding event. Footage of the Phantom approval popup itself was not captured.

## Long description for the form

Small teams receive collaborator payments as messages: a name, an amount, and a purpose spread across ordinary language. Preparing separate transfers repeats work and increases the chance of an address or amount mistake.

SplitBrief turns a payment instruction into an editable draft. A genuine Gemini 3.8 Flash structured response extracts only known recipient labels, exact SOL strings, purposes, warnings, and clarification states. Addresses come from the user's reviewed browser-local address book. AI never chooses an address, holds a key, signs, or sends. Deterministic bigint validation checks precision, known recipients, duplicate destinations, self-payment, spending caps, balance, and fees before the payer reviews a frozen plan.

Solana makes the workflow useful: one version 0 transaction contains two or three native System Program transfers and requires one payer signature. All transfer effects succeed together or roll back together, although fees can still apply on failure. Wallet Standard provides noncustodial Phantom approval on Devnet. SplitBrief then independently retrieves the full actual transaction and compares its payer, sources, destinations, order, amounts, count, signatures, and unexpected instructions against the frozen plan. Receipts show full addresses, actual amounts and fees, copy/share controls, Explorer links, and fresh RPC verification. Without a saved plan, the verifier claims only chain decoding.

The working Vercel application has 192 passing unit/integration tests, 17 browser tests, and 8 actual Surfpool assertions proving successful three-recipient execution and atomic rollback. Live Gemini interpretation succeeded with the exact sample amounts in 117.2 seconds; temporary provider demand can still cause slow responses or failures, and Manual Mode stays explicit. The initial supplied public signature was correctly identified as 2.5 SOL incoming funding, not a batch payout. **After the Phantom signing fix, the participant's live browser displayed `Payment completed` and `Finalized & matched` for three native transfers totaling 0.006 SOL (0.002 + 0.001 + 0.003 SOL), with a 0.000005 SOL fee.** The new screenshot shows the successful on-chain receipt and plan match; its exact signature and independent machine-readable proof still need to be archived in this repository. Phantom-popup approval footage was not captured. All activity is Devnet/local; no mainnet funds, custody, custom contract, or database is involved.

## Track explanations

| Category           | Submission explanation                                                                                                                                                                                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top 3 Overall      | Converts a complex payment message into one inspectable Solana transaction. The editor, human review, atomic execution, and independent receipt form one coherent working product. Local execution and rollback are proven; the participant's live browser now displays a finalized and matched public Devnet batch. Independent archival of the new signature/receipt JSON remains pending. Eligible entries are automatically considered.       |
| DeFi Track         | Real native multi-recipient settlement using a noncustodial wallet and open RPC receipts. Multiple transfers share one transaction, with deterministic review and verification. Describe it as a payment application; do not claim custody, payroll compliance, or a new financial protocol.                            |
| AI Track           | Live Gemini functionality is genuinely verified. AI extracts exact labels/amounts and purposes; deterministic code supplies reviewed addresses and validates output. Solana supplies atomic settlement and verifiability. Disclose measured latency and distinguish local-chain proof from the incomplete public batch. |
| Best Beginner Hack | **Eligibility not established. Leave unselected unless the team confirms that more than half its members meet the event's first-time-hacker requirement.**                                                                                                                                                              |

## Technology and disclosure

Next.js 16.4.3, React, TypeScript, Tailwind CSS, Geist, Lucide; Solana Kit 8.6.0, supported wallet plugins, Wallet Standard, `@solana-program/system`; Google GenAI 3.0.0, `gemini-3.8-flash` Interactions structured output, Zod; Vitest, Testing Library, Playwright, Surfpool 1.7.0; Node 24 and Vercel. Demo tools include Playwright and FFmpeg. Browser-local contacts/history; no database or backend custody.

**AI coding assistance:** OpenAI Codex. The build session's runtime metadata was inspected and recorded as **`gpt-6.1-sol`** on November 7, 2026. Used for implementation, UI, debugging, tests, documentation, deployment, and video preparation. Gemini is the application's payment interpreter and has separate real provider evidence. The Solana Foundation Kit Next.js starter and permitted open-source dependencies are credited in README. The original MIT license, repository identity, and history were preserved; project-specific code was written during the event. Supplied branding is the user's uploaded artwork.

## Evidence and remaining submission actions

- [Genuine Gemini response](../public/evidence/gemini.json) and [diagnostics](GEMINI_DIAGNOSTICS.md)
- [Actual local execution and rollback](../public/evidence/local-chain.json)
- [Supplied Devnet transaction](../public/evidence/devnet.json), correctly classified as funding
- [Production browser checks](../public/evidence/deployment.json), [tests](TESTING.md), and [actual screenshots](screenshots)
- Completed by participant: genuine tiny Phantom-backed public Devnet batch; the live app displays `Finalized & matched` for 0.006 SOL across 3 recipients. Still needed: copy and independently archive the new transaction signature/receipt JSON; never reuse the earlier funding signature as batch proof.
- Human action: review and upload the newly narrated MP4 supplied in the ChatGPT conversation (not stored in the GitHub repo) to YouTube as an unlisted video; add the resulting real video URL to the MLH form. No account publication is claimed.
- Human action: sign in to MLH, submit one entry per team, select applicable tracks, and confirm Beginner eligibility only if true.

The [organizer schedule](https://events.mlh.com/events/15200-solana-hackathon) lists initial submission **November 8 at 10:00 AM ET** and final submission **11:45 AM ET**. The MLH form page separately displays a 1:00 PM EST close; use the earlier organizer deadlines. Submit early. Review the [standard MLH rules](https://github.com/MLH/mlh-policies/blob/main/standard-hackathon-rules.md). No MLH entry has been submitted by this agent.

Signing integration disclosure: the owner recorded a pre-broadcast message mismatch. The documented Phantom fee-insertion behavior was reproduced and the signing policy fixed, with safe diagnostics and successful SDK adapter/local-chain regression tests. A real extension retry and finalized outgoing signature are still required; do not claim public settlement from these automated results.
