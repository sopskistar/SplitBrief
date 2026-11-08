# Independently verified public Devnet batch

The payer's finalized recent signatures were queried on `https://api.devnet.solana.com`, after verifying Devnet's genesis hash. The full transaction was independently decoded; no payment was sent by the proof script.

**Signature:** `5mfAUjRWXLVDRjV74L9nL8Uk5heLW9NMiJyKpPoHVQmKRjen7DAcEh66DDTJGYDFj72zqRr3zfvzEzkPD5wdxfu`

**Payer:** `9NTebUUdiqDzZDrBARaopnaN78YWeDbkM452Jb2EoZkR`

| Recipient | Actual public destination                      | Actual lamports | SOL   |
| --------- | ---------------------------------------------- | --------------- | ----- |
| Ada       | `EgpR8wT9oSnYxbB3tbAtBzdMCiP1Krez84YJ5id6MRxp` | 2000000         | 0.002 |
| Chidi     | `B5FrY8tQL73E14k4uHvk1GqtpJeBWGhaNy6z8vtnup5d` | 1000000         | 0.001 |
| Reserve   | `5LB7gzK1WFG6hEkeym25r9vjFEDCdBBZFpsVoSGUCBYz` | 3000000         | 0.003 |

**Finalized and succeeded**, one signature, three native System Program transfers, 6,000,000 lamports total, actual fee 5,000 lamports. Five outer instructions comprise two exact fee controls (10,000 CU limit; zero priority fee) followed by the three transfers. No inner transfers, unexpected programs, additional signers or transfers from a different source were found. Slot `519858574`; block timestamp `1794102030`.

Destinations, order, payer, amounts and fee controls match `public/demo-recipients.json` and the explicitly requested demo profile. The owner's genuine production screenshot shows the same signature and “Payment completed / Finalized & matched.” Its untouched original is retained in ignored `demo/raw/SplitBrief_Successful_Devnet_Receipt.png`; a rectangular [receipt crop](../public/evidence/successful-devnet-receipt.webp) excludes browser and wallet account chrome. Hashes and crop provenance are in the evidence record.

**Original-plan boundary:** the original frozen review snapshot/export has not been recovered. The screenshot is evidence of the application-displayed match, not an independently reproducible comparison against the original intent. Therefore the fresh public verifier and archived receipt retain `matchesPlan: null`; independent original-plan matching is not claimed.

[Fresh SplitBrief lookup](https://splitbrief-zeta.vercel.app/verify?signature=5mfAUjRWXLVDRjV74L9nL8Uk5heLW9NMiJyKpPoHVQmKRjen7DAcEh66DDTJGYDFj72zqRr3zfvzEzkPD5wdxfu) · [Solana Explorer](https://explorer.solana.com/tx/5mfAUjRWXLVDRjV74L9nL8Uk5heLW9NMiJyKpPoHVQmKRjen7DAcEh66DDTJGYDFj72zqRr3zfvzEzkPD5wdxfu?cluster=devnet) · [Batch JSON](../public/evidence/devnet-batch.json)

Reproduce the read-only search and verification with Node 24:

```bash
node --env-file-if-exists=.env.local --import tsx scripts/record-batch-proof.ts
```

## Earlier incoming funding, separately preserved

The earlier `iyxcjE2BWwJkmbHQiUcyeit6UTzhQwKq9zrdYXwJFubN94haGLKqaWYPx85eFYeLBrH3avgEjR2vPCim9XV15gh` is **2.5 SOL incoming funding**, from `dev2JBjyB5CshoGsiJCwzdmJYiEUwAXMdqDR7txoFBJ` to the owner's wallet. Its actual fee is 5,495 lamports. It is not the application's outgoing batch. [Separate funding record](../public/evidence/devnet-funding.json).

All values are Devnet test SOL with no real financial value. No private keys or additional payments were needed to verify either transaction.
