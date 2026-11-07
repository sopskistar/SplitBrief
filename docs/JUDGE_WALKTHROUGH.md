# Two-minute judge walkthrough

Open the actual deployed origin when available, or the locally running app at `http://localhost:3001`. No public live URL or Devnet signature is claimed in this build. [Current evidence](../public/evidence) distinguishes successful local execution from pending external proof.

| Time      | Action and what to assess                                                                                                                                               |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:15 | Open `/`. SplitBrief turns collaborator payment messages into one reviewed Solana transaction. The workspace is the product, not a marketing detour.                    |
| 0:15–0:35 | Open Address book; load disposable test recipients or add three reviewed public addresses for Ada, Chidi, Reserve. Observe local persistence and full address previews. |
| 0:35–0:55 | Use the sample brief and Interpret. If live Gemini is unavailable, show the real error and explicitly select Manual Mode. Do not describe manual output as AI proof.    |
| 0:55–1:15 | Review 0.002 + 0.001 + 0.003 SOL. Check exact amounts, full recipients, real RPC fee estimate, payer balance, and the frozen review.                                    |
| 1:15–1:40 | With Phantom set to Devnet, personally approve the single transaction. Never ask Codex or browser automation to approve it.                                             |
| 1:40–2:00 | Inspect Confirmed/Finalized & matched, three decoded transfers, one signature, and Explorer. Open `/verify` with that signature for a fresh independent check.          |

If wallet approval is unavailable during judging, show the actual offline Surfpool evidence on `/judges`: one successful atomic payment plus one failed transaction with zero recipient balance changes. Call this **local** evidence, not a public Devnet payment or Phantom approval.

After the manual test, run:

```bash
npm run proof:record -- YOUR_PUBLIC_DEVNET_SIGNATURE
```

Pass a downloaded receipt JSON instead to include a supplied reviewed-plan comparison. The script rechecks RPC; it never signs. Rebuild/redeploy so `/judges` contains the fresh real signature.
