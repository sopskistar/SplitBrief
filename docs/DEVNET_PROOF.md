# Supplied public Devnet signature: what it actually proves

The exact supplied signature was independently retrieved from `https://api.devnet.solana.com`, after checking Devnet's genesis hash. `npm run proof:record` intentionally returns exit code **1** because this successful chain transaction does **not** satisfy the requested SplitBrief batch-payment evidence checks.

| Field                                | Actual RPC value                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| Signature                            | `iyxcjE2BWwJkmbHQiUcyeit6UTzhQwKq9zrdYXwJFubN94haGLKqaWYPx85eFYeLBrH3avgEjR2vPCim9XV15gh`    |
| Status                               | Finalized, execution succeeded                                                               |
| Fee payer and native transfer source | `dev2JBjyB5CshoGsiJCwzdmJYiEUwAXMdqDR7txoFBJ`                                                |
| Recipient                            | `9NTebUUdiqDzZDrBARaopnaN78YWeDbkM452Jb2EoZkR`                                               |
| Amount                               | **2,500,000,000 lamports / 2.5 SOL**                                                         |
| Actual network fee                   | **5,495 lamports / 0.000005495 SOL**                                                         |
| Native transfers                     | **1**, not two or three                                                                      |
| Signatures                           | 1                                                                                            |
| Other outer instructions             | 2 ComputeBudget instructions; these are reported separately, not misrepresented as transfers |
| Slot                                 | 519777275                                                                                    |
| Block timestamp                      | 1794082572                                                                                   |
| Original reviewed plan               | Unavailable; no match is claimed                                                             |

This is incoming funding into the owner's wallet. The owner address is **not** the payer of this transaction. It exceeds the application's demo transfer caps and does not prove an outgoing multi-recipient payment, a matching original brief, or who approved a wallet prompt. Compute-budget instructions are common Solana instructions; their presence is reported because the app's expected payment profile contains only the reviewed native transfers.

[Reverify in SplitBrief](https://splitbrief-zeta.vercel.app/verify?signature=iyxcjE2BWwJkmbHQiUcyeit6UTzhQwKq9zrdYXwJFubN94haGLKqaWYPx85eFYeLBrH3avgEjR2vPCim9XV15gh), [open Devnet Explorer](https://explorer.solana.com/tx/iyxcjE2BWwJkmbHQiUcyeit6UTzhQwKq9zrdYXwJFubN94haGLKqaWYPx85eFYeLBrH3avgEjR2vPCim9XV15gh?cluster=devnet), or read [the actual machine-readable evidence](../public/evidence/devnet.json).

To complete public payout proof, personally approve the tiny `0.006 SOL` sample batch in the app using Phantom on Devnet, then download the receipt JSON. Pass that exported JSON to `npm run proof:record -- /path/to/receipt.json --expected-payer YOUR_PUBLIC_ADDRESS`. The script can compare its supplied frozen plan with fresh chain data; a signature alone cannot recover an unknown original plan. A downloaded plan is user-supplied evidence, not a chain-authenticated record of earlier intent.
