# Two-minute judge journey

**[Watch the narrated product film](https://splitbrief-zeta.vercel.app/demo)** · [Live workspace](https://splitbrief-zeta.vercel.app) · [GitHub](https://github.com/sopskistar/SplitBrief)

| Time      | What to inspect                                                                                                                                                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:20 | Open New payment. Read the concrete product explanation and the sample brief. The editor is the centerpiece.                                                                                                                                                                 |
| 0:20–0:40 | Load disposable demo recipients or add reviewed public addresses. Names resolve locally; Gemini receives no destinations.                                                                                                                                                    |
| 0:40–1:00 | Inspect the [genuine recorded Gemini result](https://splitbrief-zeta.vercel.app/judges#ai-evidence): Ada 0.002, Chidi 0.001, Reserve 0.003 SOL. A fresh call can take several minutes; Manual Mode is explicit.                                                              |
| 1:00–1:20 | Edit the draft and inspect every address and the total. Wallet owners can review an RPC fee estimate and personally approve one transaction. No new payment is needed to evaluate the existing proof.                                                                        |
| 1:20–2:00 | Open the [actual finalized batch](https://splitbrief-zeta.vercel.app/verify?signature=5mfAUjRWXLVDRjV74L9nL8Uk5heLW9NMiJyKpPoHVQmKRjen7DAcEh66DDTJGYDFj72zqRr3zfvzEzkPD5wdxfu). Check all three destinations, the 0.006 SOL total, 0.000005 SOL fee, signature and Explorer. |

## What is proven

The independent full-transaction inspection verifies payer `9NTebUUdiqDzZDrBARaopnaN78YWeDbkM452Jb2EoZkR`, three native transfers matching the published disposable addresses and amounts, one signature, five outer instructions (including two reviewed fee controls), successful execution and finalization. [Details](DEVNET_PROOF.md).

The owner's genuine receipt screenshot displays “Finalized & matched.” A fresh public lookup has no original frozen plan, so it truthfully says “On-chain transaction decoded.” Do not confuse those different evidence boundaries. The earlier 2.5 SOL signature is incoming funding and stays separate.

The [AI record](https://splitbrief-zeta.vercel.app/evidence/gemini.json) is a real provider response, not a browser fixture. Surfpool execution and rollback are separately labeled local tests. The film uses authentic product footage and the genuine successful screenshot; the Phantom approval popup was not recorded or reconstructed.
