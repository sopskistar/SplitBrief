# Build report

Built November 7, 2026 in the original `sopskistar/SplitBrief` clone. No new repo, smart contract, database, custody service, or mainnet transaction was created.

Implemented the full product path, safe Devnet Kit transaction construction, independently decoded receipts, local contacts/history, strict Gemini server integration, responsive UI, judge/help/privacy routes, metadata, tests, deployment configuration, and demo tooling.

Verified Node 24.22.2 in actual install/test processes, an actual offline Surfpool payment and atomic failure rollback, the unit/component suite, browser QA, and production build. Inspect [TESTING.md](TESTING.md) and [`public/evidence`](../public/evidence) for exact current results.

Final checks: `npm run ci` passed lint, TypeScript, **157 tests in 8 files**, and the production build. All **12 Playwright tests passed**, each also asserting zero uncaught browser errors. Offline Surfpool passed **8 actual-chain assertions**. Formatting, shell syntax, Git whitespace checks, and the static design check passed. The design render helper lacked puppeteer-core; actual Playwright captures and browser QA supplied visual checks instead.

The local production preview served the workspace, verifier, judges, privacy, help, robots, sitemap, OG image, and favicon with HTTP 200. A request for `.env.local` returned 404; invalid interpretation input returned 400 without a model call. The actual local Gemini key was absent from all **21 built client asset files** and all Git-eligible source files. No persistent disposable key files exist. Final screenshots and three non-wallet clips were captured from this production preview, without simulated provider/wallet/RPC responses or development overlays.

External actions still needed:

- Genuine Gemini success: current 20-second calls time out; API secret is present and ignored, never printed. Check the model/account in Google AI Studio and retry the supplied smoke script.
- Human Phantom approval and a public Devnet signature: free official RPC airdrop returned 410. The owner's separate Phantom had 2.5 SOL on Devnet at balance check. Approval must happen in the owner's browser.
- Vercel sign-in and deployment: CLI reports Logged out; production source/config is ready.
- Final demo clip and assembly: three genuine non-wallet clips exist; wallet/receipt and live AI success footage remain missing.
- MLH account entry/submission: content is prepared in SUBMISSION.md; no entry was submitted automatically.

Codex model attribution was verified from current-session metadata as `gpt-6.1-sol`; no underlying model was guessed from branding or a global default.
