# Product-film sources and reproduction

The new narrated edit replaces the old silent evidence cut. Original `demo/raw/` and `demo/raw/delivery/` clips are preserved; the new film does not simply add audio to that earlier sequence.

| Source                                              | Actual content and use                                                                                                                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `demo/raw/final/workspace.webm`                     | Fresh production workspace; sample instruction typed, public demo addresses loaded, Manual Mode editor and actual editable purpose. No transaction is sent.                                                                    |
| `demo/raw/final/recorded-ai.webm`                   | Actual rendered recorded-result component, reading the genuine published Google response; explicitly labeled recorded evidence. Captured from the local preview of the deployed component.                                     |
| `demo/raw/SplitBrief_Successful_Devnet_Receipt.png` | Genuine owner-supplied production receipt with Payment completed, Finalized & matched, 0.006 SOL, all three transfers and actual signature. A rectangular crop removes browser/wallet chrome without changing receipt content. |
| `demo/raw/final/batch-receipt.webm`                 | Fresh production public verification of the actual outgoing 0.006 SOL batch. No original plan injected.                                                                                                                        |
| `demo/raw/final/explorer.webm`                      | Real Explorer capture remained loading; deliberately excluded from the final film. The working receipt includes its genuine Explorer link.                                                                                     |
| `demo/narration/01-…07-*.wav`                       | Genuine Google `gemini-3.8-flash-tts` neural Sulafat narration, generated per scene. Metadata/scripts are committed; raw WAV files stay local.                                                                                 |

No successful approval-popup recording exists. The film uses the real post-approval screenshot and fresh chain data, never a fake prompt. Source SHA256 hashes and origins are in [FINAL_CAPTURE_MANIFEST.json](../demo/FINAL_CAPTURE_MANIFEST.json). The screenshot's original/crop hashes are in [batch evidence](../public/evidence/devnet-batch.json).

## Rebuild

Use Node 24, installed FFmpeg/FFprobe (including libx264, AAC and libass), Playwright Chromium and the existing Geist fonts. Generated speech is governed by [Google Gemini API terms](https://ai.google.dev/gemini-api/terms); the prebuilt voice is not a clone of a person. Original text and recordings belong to this project. No third-party music is used.

```bash
node scripts/capture-final-demo.mjs
# Requires the ignored server-only Gemini key; existing tracks are cached:
node --env-file-if-exists=.env.local scripts/narrate-demo.mjs
node scripts/prepare-demo-narration.mjs
node --env-file-if-exists=.env.local scripts/transcribe-demo-narration.mjs
node scripts/assemble-final-demo.mjs
```

The assembler refuses missing batch verification or an uninspected owner receipt, uses only authenticated source pixels, and creates 1920×1080/30fps H.264 with AAC narration, synchronized captions, restrained zooms, branded scene framing and short dissolves. It writes the public MP4, WebVTT captions, poster, contact sheet and export manifest. Review the complete export and consult the manifest's measured QA results before submission.

Local deliverable: `demo/output/splitbrief-final-narrated.mp4`. Public route: https://splitbrief-zeta.vercel.app/demo. Direct downloadable MP4: https://splitbrief-zeta.vercel.app/demo/splitbrief-final-narrated.mp4. No YouTube upload or MLH submission is claimed.
