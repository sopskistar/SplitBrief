# Final delivery update — November 8

The genuine outgoing 0.006 SOL batch is finalized and independently verified. The owner supplied its successful application receipt screenshot. See [current proof](DEVNET_PROOF.md), [current narrated film](DEMO_SCRIPT.md), [current tests](TESTING.md) and [submission links](SUBMISSION.md). Older notes below describe the earlier implementation checkpoint and are historical.

# Final delivery report

Continued the existing `sopskistar/SplitBrief` repository, preserving its Git history, MIT license, architecture, and Solana Kit payment flow. Fast-forwarded to the supplied branding commit before making changes. Original uploaded PNGs were copied byte-for-byte into public branding, retaining RGBA transparency and aspect ratio; favicon and OG assets derive from that artwork.

The workspace now explains the product immediately, centers the payment editor, uses New payment / Verify receipt / How it works / For judges navigation, offers a six-step guide, and retains the original purple/lime/off-white palette. Receipts prominently expose actual chain details, copy/share/download controls, and honest matching states. Browser history retains valid references across refreshes, salvages valid entries individually, distinguishes origins, and supports public outgoing-payment recovery without inventing an original plan.

**Production:** https://splitbrief-zeta.vercel.app, deployed into the existing authenticated Vercel project on Node **24.x**. Anonymous Chromium checked the workspace, logos, wallet picker, metadata/routes, mobile widths 320–1440px, actual RPC receipt, and persistent reference. The server-only Gemini key was configured as a sensitive production value through stdin; no secret is in client variables or source.

**Genuine Gemini:** the configured account supports `gemini-3.8-flash`. A full application interpretation succeeded in **117,180 ms**, and the deployed HTTP route returned **200 in 147,892 ms** with the three exact sample amounts. Temporary provider demand produced 503/504 responses in other diagnostics; no invalid-key or quota-exhaustion claim is inferred. Timeouts are now bounded at 270s provider/application, 285s browser, and 300s Vercel. Manual Mode can cancel the browser wait. [Diagnostics](GEMINI_DIAGNOSTICS.md).

**Public Devnet:** the supplied signature is finalized, but it is **incoming funding**, not a SplitBrief payout. A different payer sends **2.5 SOL** into the owner's address, with **5,495 lamports fee**, one native transfer, and two ComputeBudget instructions. The proof command correctly rejects it as outgoing batch evidence. No original reviewed plan is available. [Exact results](DEVNET_PROOF.md).

**Checks:** lint, TypeScript, production build, **192 tests in 9 files**, **17 Chromium tests**, and **8 actual Surfpool assertions**. Local execution proves three transfers inside one signed transaction, exact balances, and failed-transaction atomic rollback. Browser fixtures remain separate from genuine public evidence. [Current results](TESTING.md).

Original raw video assets are preserved. New production captures, export provenance, and honest missing-footage handling are documented in [DEMO_SHOTLIST.md](DEMO_SHOTLIST.md). No fake Phantom approval or funding-as-payout claim is permitted. Public batch proof still requires the owner's real browser approval; video publication and the MLH submission require their account interaction. [Submission copy and links](SUBMISSION.md).

OpenAI Codex assisted the build and final delivery; runtime metadata recorded model `gpt-6.1-sol`. Gemini is the application's separately verified interpreter. No mainnet transaction, custom contract, database, backend signer, personal seed, or persistent disposable test key was used.

The current demo was exported to `demo/output/splitbrief-105s.mp4` at **104.266667 seconds**, 1920×1080 H.264, silent/captioned. All 3,128 frames decoded successfully, no black interval >=0.25s was found, and chapter/closing frames were visually inspected. Publication and public payout footage remain human actions.

A subsequent owner-recorded signing rejection was investigated and reproduced against Phantom’s documented automatic priority-fee behavior. Explicit zero-priority fee controls now prevent the documented mutation conditions while retaining strict bytes, payer/signature, snapshot, fee-quote, and chain-matching checks. Public raw-message diagnostics are available on any remaining mismatch. Actual original wallet-selected values were not captured, so no exact original-byte claim is invented. See [signing investigation](WALLET_SIGNING.md). Public batch proof remains incomplete.
