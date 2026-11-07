import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What SplitBrief stores locally, sends to Gemini, and reads from Solana Devnet.',
};
export default function PrivacyPage() {
  return (
    <article className="article">
      <div className="page-intro">
        <h1>Your brief, your wallet.</h1>
        <p>SplitBrief is a hackathon prototype for Solana Devnet. Updated November 7, 2026.</p>
      </div>
      <section>
        <h2>What stays in your browser</h2>
        <p>
          Contact labels, public addresses, optional descriptions, recent signatures, and their
          review-plan snapshots are stored in this browser’s local storage. Clear the site’s storage
          in your browser to delete them. Another browser or device will not share that data.
        </p>
        <p>
          Local storage is untrusted and never proves a payment settled. Receipt states come from a
          fresh Solana RPC check. Browser extensions and anyone with access to this browser may be
          able to read local data.
        </p>
      </section>
      <section>
        <h2>What goes to Gemini</h2>
        <p>
          When you choose Interpret brief, the payment instruction and up to three contact names go
          through our server to Google’s Gemini API. Recipient addresses and wallet credentials are
          not included in that request. Do not put confidential or personal information in your
          brief.
        </p>
        <p>
          Manual Mode makes no Gemini request. The Interactions request sets store=false; other
          provider handling follows{' '}
          <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">
            Google’s Gemini API terms
          </a>
          . The API key remains server-side.
        </p>
      </section>
      <section>
        <h2>What is public on Solana</h2>
        <p>
          Solana transactions reveal public addresses, amounts, signatures, and timing. RPC
          providers receive requests for balances and transaction details, along with ordinary
          connection metadata. The app checks the Devnet genesis hash and rejects other clusters
          before executing payments.
        </p>
      </section>
      <section>
        <h2>Wallet control and limits</h2>
        <p>
          Your wallet signs the transaction after your explicit review. SplitBrief never requests,
          stores, or transmits a private key or recovery phrase. Review every destination and amount
          in the app and in your wallet.
        </p>
        <p>
          Test tokens have no real financial value. This prototype is not a custody service or a
          compliance product. Devnet can reset and public RPC history can be missing or
          rate-limited. A network error means unverified, never assumed settled.
        </p>
      </section>
      <section>
        <h2>Hosting, requests, and analytics</h2>
        <p>
          SplitBrief includes no analytics, advertising pixels, tracking cookies, or database. The
          hosting platform, Google, and RPC providers may maintain their own operational logs.
          In-memory request throttling stores a short-lived client network identifier per server
          process and is not a global spending limit.
        </p>
        <p>
          Report concerns through the{' '}
          <a
            href="https://github.com/sopskistar/SplitBrief/issues"
            target="_blank"
            rel="noreferrer"
          >
            public project issue tracker
          </a>
          ; never post secrets or private wallet data there.
        </p>
      </section>
    </article>
  );
}
