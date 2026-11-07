import type { Metadata } from 'next';
import Link from 'next/link';
export const metadata: Metadata = {
  title: 'How it works',
  description:
    'A brief, a deterministic review, one Solana transaction, and an independent receipt.',
};
export default function HowPage() {
  return (
    <article className="article">
      <div className="page-intro">
        <h1>Plain words. Precise payments.</h1>
        <p>One brief becomes a payment you can inspect at every step.</p>
      </div>
      <section>
        <h2>1. Save the people you pay</h2>
        <p>
          Add two or three named public addresses. Check each full address with its owner. Names
          must be unique, and each destination must be different. The sample uses Ada, Chidi, and
          Reserve.
        </p>
      </section>
      <section>
        <h2>2. Write the payment brief</h2>
        <p>
          State each name and exact SOL amount. Gemini returns a structured draft with purposes and
          warnings. It only receives your brief and contact names; addresses come from your local
          address book. Manual Mode lets you enter the same fields yourself.
        </p>
      </section>
      <section>
        <h2>3. Review, then sign once</h2>
        <p>
          SplitBrief converts decimal amounts into exact integer lamports, checks spending limits,
          fetches a real fee estimate, and freezes the plan. Confirm every full address and amount
          before opening Phantom. The wallet signs one transaction with two or three native SOL
          transfer instructions.
        </p>
      </section>
      <section>
        <h2>4. Check what actually happened</h2>
        <p>
          After submission, SplitBrief retrieves the full transaction and compares the actual fee
          payer, destinations, amounts, count, and order with your review plan. Unexpected
          instructions are flagged. Only a successful decoded match receives “Confirmed & matched.”
        </p>
      </section>
      <details>
        <summary>Are Devnet and Testnet the same?</summary>
        <p>
          No. They have distinct ledgers and balances. This app only accepts Solana Devnet. In
          Phantom, enable Testnet Mode, then choose Solana Devnet. Get free test SOL from the{' '}
          <a href="https://faucet.solana.com/" target="_blank" rel="noreferrer">
            official faucet
          </a>
          .
        </p>
      </details>
      <details>
        <summary>What does atomic mean?</summary>
        <p>
          All instructions run within one transaction. Their state changes succeed together or are
          reverted together. Transaction fees may still be paid if execution fails.
        </p>
      </details>
      <details>
        <summary>What if Gemini is unavailable?</summary>
        <p>
          You will see the provider or configuration error. Select Manual Mode and compose the
          payment yourself. A manually composed draft is never labeled as AI output.
        </p>
      </details>
      <details>
        <summary>What if the wallet or network times out?</summary>
        <p>
          A wallet rejection never triggers a broadcast. A lost RPC response can leave submission
          uncertain, so the original signature is preserved and checked. No second payment is sent
          automatically. Reverify that signature before making another payment.
        </p>
      </details>
      <details>
        <summary>Can I verify without a saved brief?</summary>
        <p>
          Yes. <Link href="/verify">Verify receipt</Link> decodes the on-chain transaction and
          displays its transfers. It says “On-chain transaction decoded,” because it cannot claim a
          match to a brief it has never seen.
        </p>
      </details>
      <details>
        <summary>What can I send?</summary>
        <p>
          Native SOL on Devnet to 2–3 distinct recipients. Each amount must be positive with no more
          than 9 decimal places, capped at 0.1 SOL per recipient and 0.2 SOL total. Self-payments,
          currency conversions, and percentages are not supported.
        </p>
      </details>
      <div className="button-row">
        <Link className="button button-primary" href="/">
          Open the workspace
        </Link>
        <Link className="button" href="/privacy">
          Read privacy details
        </Link>
      </div>
    </article>
  );
}
