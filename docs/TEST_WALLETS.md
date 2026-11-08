# Test wallets and manual Phantom acceptance

## Two different wallet roles

The owner's Phantom test wallet is exclusively for **manual browser approval**. Its public address was used for a Devnet balance lookup: 2.5 SOL was observed during this build. It is not a mandatory payer, a default recipient, a backend signer, or an automated test key. No private key or recovery phrase is requested.

Automated tests generate **separate disposable signers in memory**. Surfpool locally funds a payer, three recipients, and a separate underfunded payer for rollback testing. All private keys disappear when the process exits. The public Devnet smoke test also generates separate in-memory addresses and attempts a free airdrop. That airdrop returned HTTP 410, so it sent no public payment.

Public disposable recipient addresses are recorded separately in [demo-recipients.json](../public/demo-recipients.json), so refreshing transaction evidence cannot erase the onboarding contacts. The workspace's optional **Load disposable demo recipients** button copies those public addresses into a local address book only after an explicit click. No private keys are retained for them. Send only valueless Devnet test tokens; these are not recoverable receiving accounts for real funds.

No persistent test key files were needed. `.local-test-keys/`, `.env.local`, raw video, local evidence, and Vercel state are ignored. If a future harness needs persistent disposable keys, use only `.local-test-keys/`, set files to mode 600, and never commit, upload, print, deploy, or film them.

## Devnet is not Testnet

Solana Devnet: `https://api.devnet.solana.com`. Solana Testnet is a separate ledger and its balance is irrelevant to this app. The product rejects non-Devnet genesis hashes. Use the [official faucet](https://faucet.solana.com/) for free Devnet SOL when available. Never buy tokens for this test and never switch to mainnet.

## Exact manual acceptance clicks

1. Open the running workspace ([production](https://splitbrief-zeta.vercel.app), or `http://localhost:3001` locally) in the browser where Phantom is installed.
2. In Phantom, open Settings, enable Testnet Mode, and choose **Solana Devnet**. Select the separate hackathon wallet.
3. In SplitBrief, use **Set up recipients** beside the editor and click **Load disposable demo recipients**. If contacts already exist, explicitly confirm **Replace saved contacts with demo recipients**. Alternatively use **Review address book** to add three of your own. Read all full addresses.
4. For a reliable payment acceptance test independently of Gemini availability, click **Manual Mode**. Confirm Ada `0.002`, Chidi `0.001`, Reserve `0.003` SOL, total `0.006` SOL.
5. Click **Connect wallet → Phantom** and approve the connection in Phantom. Confirm the connected public address and fresh Devnet balance.
6. Click **Review payment**. Check payer, every full destination, amounts, RPC fee estimate, zero priority fee, and estimated debit. New payments contain three native transfers plus two explicitly reviewed fee controls. Cancel review once to confirm that no signature is requested.
7. Review again, then click **Approve & open Phantom**. Read the wallet's transaction details and personally approve once. Automation must not approve it for you.
8. Wait for **Payment completed**, with **Confirmed & matched** or **Finalized & matched** status. Open Explorer and confirm the Devnet signature and three transfers. Paste the same signature into **Verify receipt**.
9. Download receipt JSON. Run `npm run proof:record -- /path/to/receipt.json` to independently refresh public evidence. A signature alone also works, with no brief-match claim.

Also manually test rejecting a wallet request. A rejection should produce no broadcast. If submission is uncertain, recheck its **original signature**; do not simply click pay again.

The supplied public signature was independently verified as incoming funding, not an outgoing SplitBrief batch. See [exact proof results](DEVNET_PROOF.md). No Phantom approval footage was captured by the automated browser.

For the recorded Phantom message-change failure, use the deployed [signing fix and acceptance steps](WALLET_SIGNING.md). A repeated mismatch exposes a public diagnostic without private keys or signature bytes.
