# Two-minute judge walkthrough

**Live app:** https://splitbrief-zeta.vercel.app · [Source](https://github.com/sopskistar/SplitBrief) · [Evidence page](https://splitbrief-zeta.vercel.app/judges)

| Time      | Action and what to assess                                                                                                                                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:15 | Open New payment. The first screen explains the product and shows the real payment editor.                                                                                                                                             |
| 0:15–0:35 | Use the visible Set up recipients action to load disposable demo recipients, or open Address book and save three reviewed public addresses for Ada, Chidi, Reserve. Addresses stay in this browser. Gemini sees only names.            |
| 0:35–0:55 | Use the sample brief and Interpret. Genuine `gemini-3.8-flash` output has been recorded: 0.002, 0.001, 0.003 SOL. Provider waits can exceed two minutes; use the recorded evidence or explicit Manual Mode during a timed walkthrough. |
| 0:55–1:15 | Inspect editable amounts, full recipient addresses, 0.006 SOL total, and—after connecting—RPC fee estimate and wallet balance. Review freezes the exact plan.                                                                          |
| 1:15–1:40 | A wallet owner with Phantom on Devnet can personally approve once. No automation approves their wallet. If no approval occurs, do not narrate a sent payment.                                                                          |
| 1:40–2:00 | Open Verify receipt and the evidence page. Distinguish a known-plan match, a decoded unknown-plan transaction, and the genuine local atomic execution proof.                                                                           |

## Public evidence, precisely

The supplied signature is [reverified here](https://splitbrief-zeta.vercel.app/verify?signature=iyxcjE2BWwJkmbHQiUcyeit6UTzhQwKq9zrdYXwJFubN94haGLKqaWYPx85eFYeLBrH3avgEjR2vPCim9XV15gh). It is a **finalized incoming funding transfer**, not the application's batch payout: `dev2JBjyB5CshoGsiJCwzdmJYiEUwAXMdqDR7txoFBJ` sends **2.5 SOL** to `9NTebUUdiqDzZDrBARaopnaN78YWeDbkM452Jb2EoZkR`; fee **0.000005495 SOL**. No original plan is available. [Full proof explanation](DEVNET_PROOF.md).

Actual Surfpool evidence proves one transaction containing three transfers, exact recipient balance deltas, and atomic rollback after failed execution. Call it **local** evidence. Live Gemini evidence is a genuine provider response, not a mocked browser fixture. Production availability can vary under Google demand; the successful CLI request took 117.2 seconds.

After personally completing a public batch, download its receipt JSON and run `npm run proof:record -- /path/to/receipt.json`. Rebuild/redeploy to publish fresh evidence. A signature alone cannot establish a match to an unknown original brief.
