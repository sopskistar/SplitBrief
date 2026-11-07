# Authentic recording and assembly

## Captured material

`npm run demo:capture` records the actual local app using installed Playwright Chromium. It does not mock an API, chain, or wallet. Raw footage is ignored by Git and deployment.

| File                              | Target | Current content                                                                                                       |
| --------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| `demo/raw/01-opening.webm`        | 10s    | Event/title slate, then actual workspace                                                                              |
| `demo/raw/02-product.webm`        | 40s    | Real contact onboarding, typed brief, explicitly labeled Manual Mode, editable payment draft; **not live AI success** |
| `demo/raw/03-phantom-receipt.mp4` | 45s    | **Missing. User must record genuine review, wallet approval, receipt, and Explorer**                                  |
| `demo/raw/04-close.webm`          | 10s    | Real judges/evidence screen and closing title                                                                         |

The exact source origins, recording times, and caveats are in [demo/CAPTURE_MANIFEST.json](../demo/CAPTURE_MANIFEST.json). Screenshots in [docs/screenshots](screenshots) are actual screens and never use fixture confirmations. E2E QA traces are separate and must not be reused as proof footage.

## The user-controlled clip

1. Open the actual app in the browser that has Phantom. Use a full-desktop recorder or extension-capable capture so the real Phantom window is included. A tab-only browser recording may omit extension prompts.
2. Follow [TEST_WALLETS.md](TEST_WALLETS.md). Frame the full frozen review and total. Keep Phantom on **Solana Devnet** and personally approve only the expected 0.006 SOL plus real fee.
3. Film Submitted, then Confirmed/Finalized & matched. If a request fails, do not cut in a fake confirmation. Recheck the original signature before any new payment.
4. Show Explorer with `?cluster=devnet` and the actual transaction's three transfers under one signature. Show `/verify` with that same signature.
5. Save the genuine 45-second source clip to `demo/raw/03-phantom-receipt.mp4`. Do not record the recovery phrase, private-key export, API-key settings, or other sensitive tabs.

Once live Gemini succeeds, rerun `npm run test:ai` and replace/re-record `02-product.webm` with actual interpretation footage. The capture script only attempts to film live AI when its recorded smoke evidence reports success; otherwise it clearly shows Manual Mode.

## Assemble when proof is complete

```bash
npm run proof:record -- YOUR_PUBLIC_DEVNET_SIGNATURE
npm run test:ai
npm run demo:capture
# Place genuine user-recorded 03-phantom-receipt.mp4 under demo/raw/.
npm run demo:assemble
```

The assembly script checks for every real input and requires successful public AI/chain evidence before creating the intended final submission cut. It does not invent missing clips. It uses a full `ffmpeg` and `ffprobe` installation (`sudo apt install ffmpeg` on Ubuntu if absent). Playwright has its own recording helper, but a full system FFmpeg binary was not installed in this environment. Remotion was not installed and is not required.

Intended output: `demo/output/splitbrief-105s.mp4`, or `splitbrief-105s-narrated.mp4` if an optional narration WAV is present. **No final video is currently claimed.** Watch the entire assembled cut, check its actual duration with ffprobe, and keep it between 90 and 115 seconds. Upload only after reviewing it; no video publication was performed.
