# MLH submission material

**Project:** SplitBrief

**Short description:** Pay multiple people in one Solana transaction. SplitBrief turns everyday payment instructions into an editable plan, maps names to saved public addresses, and verifies the real transfers after one human wallet approval.

**Live app:** https://splitbrief-zeta.vercel.app

**Narrated demo:** https://splitbrief-zeta.vercel.app/demo

**Direct MP4:** https://splitbrief-zeta.vercel.app/demo/splitbrief-final-narrated.mp4

**Repository:** https://github.com/sopskistar/SplitBrief

**Judges:** https://splitbrief-zeta.vercel.app/judges

**Real finalized payment:** https://splitbrief-zeta.vercel.app/verify?signature=5mfAUjRWXLVDRjV74L9nL8Uk5heLW9NMiJyKpPoHVQmKRjen7DAcEh66DDTJGYDFj72zqRr3zfvzEzkPD5wdxfu

**MLH form:** https://www.mlh.com/events/solana-hackathon/submissions/new — requires the team's sign-in. No entry has been submitted by this agent.

## Long description

A small business needs to pay a designer, delivery partner and project reserve. The instructions arrive in one message, but preparing separate wallet transfers repeats work and creates more opportunities for mistakes.

SplitBrief turns that everyday message into an editable payment plan. Google Gemini extracts known recipient labels, exact SOL amounts and purposes. Destinations come only from the user's saved, reviewed public-address book. AI never invents an address, holds a private key, signs or sends. The payer checks every recipient, amount, total and fee before approving once in Phantom. Deterministic bigint validation enforces precision, transfer limits, distinct recipients, balance and fee requirements.

Solana does real work: all three native transfers share one atomic transaction. Their transfer effects succeed together or roll back together; fees can still apply on failure. SplitBrief independently retrieves and inspects the actual transaction, then presents a public receipt with destinations, amounts, network fee, signature, status and Explorer link. Local saved plans enable matching; a public transaction without that original snapshot is described as decoded chain data.

The owner completed the genuine Phantom Devnet payment: Ada 0.002 SOL, Chidi 0.001 SOL, Reserve 0.003 SOL; total 0.006 SOL, fee 0.000005 SOL, one finalized transaction with three System Program transfers and two reviewed zero-priority fee controls. Independent RPC inspection confirms payer, order, destinations, amounts, instructions and finalization against the published demo configuration. The genuine application screenshot shows “Finalized & matched”; the original frozen snapshot was not recovered, so independent original-plan matching is not claimed.

Gemini genuinely returned the exact three amounts locally and through the deployed API. Measured response times were 117.2 and 147.9 seconds; Manual Mode remains available when demand causes long waits or errors. The narrated product film clearly labels recorded Gemini evidence and uses real product footage, the genuine successful receipt and a fresh chain lookup. It never fabricates the unrecorded Phantom approval popup.

This is a Devnet hackathon MVP with no mainnet funds, custom contract, custody service or database. Real Surfpool tests separately verify execution, balance deltas and atomic rollback. Automated quality checks cover core validation, signing safety, verification, responsive UI and video playback. Contacts/history stay browser-local and never substitute for RPC evidence.

## Applicable categories

| Category           | Explanation                                                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Top 3 Overall      | A complete payment workflow: ordinary instruction, editable draft, human review, one atomic transaction and independently inspectable receipt. The public finalized three-recipient payout is verified. Eligible entries are automatically considered. |
| DeFi Track         | Noncustodial native SOL payments with multi-recipient atomic settlement and public verification. One signature settles the entire reviewed batch. No custody or payroll-compliance claims.                                                             |
| AI Track           | Genuine Gemini interpretation makes payment preparation easier; deterministic code resolves reviewed addresses and validates exact amounts. Solana supplies atomic settlement and verifiability. The real response and measured latency are disclosed. |
| Best Beginner Hack | Eligibility is not established. Select only if more than half the team meets the organizer's first-time-hacker requirement.                                                                                                                            |

## Technology and disclosure

Next.js 16.4.3, React, TypeScript, Tailwind CSS, Geist, Lucide; Solana Kit 8.6.0, Wallet Standard and supported wallet plugins, `@solana-program/system`; Google GenAI 3.0.0, `gemini-3.8-flash`, Zod; Vitest, Testing Library, Playwright, Surfpool; Node 24 and Vercel. Video: FFmpeg, genuine Playwright recordings and Google's prebuilt Sulafat neural narration (`gemini-3.8-flash-tts`); no voice cloning or third-party music.

**AI coding assistance:** OpenAI Codex. The implementation session's inspected runtime metadata recorded **`gpt-6.1-sol`** on November 7, 2026. Codex assisted with implementation, UI, debugging, verification, tests, documentation, deployment and video production. Gemini is the application's interpreter and has its own genuine provider evidence. The public Solana Foundation Kit Next.js starter and permitted open-source dependencies are credited; repository history and MIT license are preserved. Branding is the owner's supplied artwork.

## Evidence and final human actions

- [Public batch JSON](../public/evidence/devnet-batch.json), [genuine receipt screenshot](../public/evidence/successful-devnet-receipt.webp), [proof boundaries](DEVNET_PROOF.md)
- [Genuine Gemini response](../public/evidence/gemini.json), [separate local-chain proof](../public/evidence/local-chain.json), [test results](TESTING.md)
- [Film export manifest](../demo/EXPORT_MANIFEST.json), [script](DEMO_SCRIPT.md), [source shot list](DEMO_SHOTLIST.md)
- Review the final narrated MP4. Upload it to an unlisted video service if the form requires a platform URL; no invented YouTube link is supplied. The working public `/demo` and downloadable MP4 are available meanwhile.
- Sign in to MLH, submit one entry per team, paste these descriptions and actual links, select applicable tracks and confirm eligibility. No further payment is required.

The [official organizer schedule](https://events.mlh.com/events/15200-solana-hackathon), rechecked November 8, lists **10:00 AM ET initial submission** and **11:45 AM ET final submission** today. Use those earlier deadlines and submit promptly. Review the [standard MLH rules](https://github.com/MLH/mlh-policies/blob/main/standard-hackathon-rules.md).
