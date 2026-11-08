# Recording and export provenance

Original clips under `demo/raw/` are preserved. The final-delivery capture writes new genuine clips under **`demo/raw/delivery/`** and records their timing/provenance in [CAPTURE_MANIFEST.json](../demo/CAPTURE_MANIFEST.json). Raw footage and export files are ignored by Git and deployment.

| New source             | Content                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `01-opening.webm`      | Supplied wordmark and MLH Solana Hackathon opening                                                                                       |
| `02-product.webm`      | Real production onboarding, typed brief, actual bounded model request, actual result or explicit Manual Mode, editable draft and summary |
| `03-verification.webm` | Fresh Devnet RPC lookup of the supplied incoming funding transaction; no unknown-plan match                                              |
| `04-local-proof.webm`  | Production judges page and actual published local Surfpool evidence                                                                      |
| `06-recorded-ai.webm`  | Published genuine Gemini JSON result; clearly labeled recorded evidence after the capture browser network failure                        |
| `05-close.webm`        | Supplied branding, live app, and honest evidence limitations                                                                             |

No fixture wallet, mocked model, or intercepted RPC is used by the capture scripts. The provider wait is shortened in assembly and explicitly labeled. The user-reported Phantom test has **no supplied approval clip**, and its signature is funding, so the video does not claim an observed outgoing wallet approval.

```bash
# A deliberate real provider call can take up to 270 seconds.
npm run demo:capture
FFMPEG_PATH=/tmp/splitbrief-video-tools/ffmpeg \
FFPROBE_PATH=/tmp/splitbrief-video-tools/ffprobe npm run demo:assemble
```

The assembly validates genuine chain and captured API evidence, refuses unsupported wallet/public-batch claims, and emits **`demo/output/splitbrief-105s.mp4`**. [EXPORT_MANIFEST.json](../demo/EXPORT_MANIFEST.json) records the completed **104.266667-second** export and source trims. The maintained static FFmpeg/ffprobe binaries were downloaded to `/tmp` with SHA256 verification; no system runtime was overwritten. Use an installed full FFmpeg instead by omitting those two variables.

The completed 104.27-second cut is 1920×1080 H.264 with large captions and short fades. It is intentionally silent. Watch/inspect the complete export for blanks, clipping, caption legibility, transitions, and duration before uploading. No video account publication or MLH submission is claimed.

To replace the funding section with real payout proof: personally record the full review, Phantom Devnet approval, confirmed/matched receipt, and Explorer. Use a desktop recorder capable of filming the extension prompt. Never record keys, recovery phrases, API-key settings, or sensitive tabs. Save as `demo/raw/03-phantom-receipt.mp4`; independently verify the exported receipt and update the script/narration together. Current assembly intentionally refuses to silently substitute a different transaction.

Export QA decoded **all 3,128 frames** without errors; no black interval of 0.25 seconds or longer was detected. Chapter frames, the complete sampled contact sheet, actual chain details, captions, and the closing title were visually inspected. The current cut honestly shows Manual Mode following the captured browser transport failure and separately shows the genuine published Gemini result. It is a reviewable current-evidence demo, not footage of a completed public batch approval.
