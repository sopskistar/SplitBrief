# MLH submission material

## Project

**SplitBrief**

**Short pitch:** From payment instructions to one Solana transaction.

**Repository:** https://github.com/sopskistar/SplitBrief

**Live demo:** Not deployed yet; Vercel sign-in is required. Add only a verified deployed URL.

**Video:** Final video is not assembled. Genuine non-wallet clips exist locally; Phantom approval, public Devnet receipt footage, and successful live AI footage are pending.

## Long summary

Small teams often receive collaborator payments as unstructured messages. Re-entering names, amounts, and addresses across separate wallet approvals creates repeated work and opportunities for mistakes.

SplitBrief turns an ordinary-language payment brief into an editable draft. Gemini returns structured recipient labels, exact SOL strings, purposes, warnings, and clarification states. Public addresses come only from a reviewed local address book. Deterministic code checks decimal precision, duplicate and unknown recipients, self-payment, spending caps, balance, and fees before freezing a human-readable review.

The payer signs one Solana version 0 transaction containing two or three native System Program transfers. All transfer effects succeed or roll back together, although failed transactions may still charge fees. After submission, SplitBrief independently retrieves and decodes the full chain transaction and compares payer, destinations, amounts, order, count, and unexpected instructions against the frozen plan. A standalone verifier inspects any Devnet signature and makes a brief-match claim only when an expected plan exists.

The app is Devnet-only, noncustodial, database-free, and intentionally small. Contacts and recent receipt references stay in the browser. Manual Mode remains usable during provider failures and is never presented as AI output.

## Technology and attribution

- Next.js 16.4.3 App Router, React, TypeScript, Tailwind CSS, Geist, Lucide
- Solana Kit 8.6.0, supported wallet plugin and React bindings, Wallet Standard, `@solana-program/system`
- Google GenAI 3.0.0, `gemini-3.8-flash`, Interactions structured JSON, Zod
- Vitest, Testing Library, Playwright, offline Surfpool 1.7.0
- Vercel deployment configuration; browser-local storage; no custom contract or database

AI coding assistance: **OpenAI Codex with `gpt-6.1-sol`**, verified from the current session's runtime `turn_context.model` metadata on November 7, 2026. Used for implementation, UI, test authoring/execution, debugging, documentation, and demo preparation. The public Solana Foundation Kit Next.js starter and permitted open-source dependencies are credited in README. Project-specific code was written during the event. The original repository and MIT license were preserved.

## Applicable categories

| Category           | Rationale and current evidence                                                                                                                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top 3 Overall      | A useful working payment workspace centered on Solana's native multi-instruction atomic transactions. Actual local-chain success and rollback are proven; public wallet proof is pending. Event information says eligible entries are automatically considered.                  |
| AI Track           | Natural-language interpretation makes payment preparation easier while deterministic review and wallet approval retain control. **Select only after live Gemini access is verified and show genuine model output.** Current API requests time out; do not claim AI proof passed. |
| DeFi Track         | A financial payment application using open native SOL transfers and independently inspectable receipts. Explain the payment use case without custody, payroll-compliance, mainnet, or sophisticated DeFi claims.                                                                 |
| Best Beginner Hack | **Eligibility not established. Leave unselected unless the team confirms that more than half its members meet the event's first-time hacker criterion.** Do not infer eligibility from this being a new repo.                                                                    |

## Evidence and submission checklist

- Unit/component/route suite: 157 passing tests; current details in [TESTING.md](TESTING.md)
- Actual local atomic execution and rollback: [local-chain.json](../public/evidence/local-chain.json)
- Actual live Gemini status: [gemini.json](../public/evidence/gemini.json), currently timeout/unverified
- Actual public Devnet status: [devnet.json](../public/evidence/devnet.json), currently airdrop blocked/no payment
- Screenshots: [actual app captures](screenshots)
- Human Phantom approval: pending
- Verified live URL and final video URL: pending; never invent links

Submit **one entry per team**, select only applicable tracks, credit tools and libraries, and disclose current limitations. The [official event schedule](https://events.mlh.com/events/15200-solana-hackathon) lists initial submissions on **November 8, 2026 at 10:00 AM ET**, then final submission at **11:45 AM ET**. Create the initial entry early rather than waiting for the final cutoff. Review the [standard MLH rules](https://github.com/MLH/mlh-policies/blob/main/standard-hackathon-rules.md) and event-specific submission instructions before publishing.
