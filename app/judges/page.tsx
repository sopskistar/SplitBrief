import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, ExternalLink, ShieldCheck } from 'lucide-react';
import { readFile } from 'node:fs/promises';
import { explorerUrl } from '@/lib/payments';

export const metadata: Metadata = {
  title: 'For the judges',
  description:
    'The SplitBrief problem, architecture, honest test evidence, and two-minute judge walkthrough.',
};
async function evidence(name: string): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await readFile(`${process.cwd()}/public/evidence/${name}.json`, 'utf8'));
  } catch {
    return { success: false };
  }
}
export default async function JudgesPage() {
  const [ai, local, devnet] = await Promise.all([
    evidence('gemini'),
    evidence('local-chain'),
    evidence('devnet'),
  ]);
  const signature = typeof devnet.signature === 'string' ? devnet.signature : null;
  return (
    <>
      <div className="page-intro">
        <span className="badge">MLH Solana Hackathon 2026</span>
        <h1>SplitBrief for the judges</h1>
        <p>
          SplitBrief turns messy collaborator payment instructions into one reviewed, atomic Solana
          transaction and an independently decoded receipt.
        </p>
      </div>
      <div className="panel">
        <div className="panel-heading">
          <h2>Evidence, with its limits.</h2>
          <ShieldCheck size={19} />
        </div>
        <table className="proof-table">
          <tbody>
            <tr>
              <td>Gemini interpretation</td>
              <td>
                {ai.success
                  ? `Live structured call verified using ${String(ai.model)} in ${(Number(ai.elapsedMs) / 1000).toFixed(1)} seconds. Ada 0.002, Chidi 0.001, Reserve 0.003 SOL; no addresses generated. Provider demand can cause slow responses; Manual Mode remains available.`
                  : 'Live AI proof is unavailable or not yet verified. Manual Mode works independently.'}
                <br />
                <a
                  className="evidence-link"
                  href="/evidence/gemini.json"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read recorded API result <ExternalLink size={12} />
                </a>
              </td>
            </tr>
            <tr>
              <td>Local atomic execution</td>
              <td>
                {local.success
                  ? 'Passed on the local Surfpool runtime with disposable signers. This is local chain evidence.'
                  : 'Local runtime test has not passed yet.'}
                <br />
                <a
                  className="evidence-link"
                  href="/evidence/local-chain.json"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read local test evidence <ExternalLink size={12} />
                </a>
              </td>
            </tr>
            <tr>
              <td>Public Devnet payment</td>
              <td>
                {devnet.success && signature ? (
                  <>
                    <span>Public Devnet transaction independently decoded and checked.</span>
                    <p className="address">{signature}</p>
                    <Link className="evidence-link" href={`/verify?signature=${signature}`}>
                      Reverify the public signature <ArrowUpRight size={12} />
                    </Link>
                    <br />
                    <a
                      className="evidence-link"
                      href={explorerUrl(signature)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Devnet Explorer <ExternalLink size={12} />
                    </a>
                  </>
                ) : (
                  <>
                    The supplied signature is a finalized incoming funding transfer, not a
                    SplitBrief payout. It sends 2.5 SOL from a different payer into the owner’s
                    wallet. Multi-recipient public payment proof remains incomplete.
                  </>
                )}
                {!devnet.success && signature && (
                  <>
                    <p className="address">{signature}</p>
                    <Link className="evidence-link" href={`/verify?signature=${signature}`}>
                      Inspect the actual transaction <ArrowUpRight size={12} />
                    </Link>
                  </>
                )}
                <br />
                <a className="evidence-link" href="/evidence/devnet.json">
                  Read Devnet test evidence
                </a>
              </td>
            </tr>
            <tr>
              <td>Human Phantom approval</td>
              <td>
                The Wallet Standard flow requires the wallet owner’s real browser approval.
                Automated disposable-signer tests do not prove a human Phantom approval.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="judge-grid">
        <section className="judge-section">
          <h2>The problem</h2>
          <p>
            Small teams receive payments as messages: a name here, an amount there, and a purpose
            somewhere else. Re-entering each payment introduces address mistakes and repeated wallet
            approvals.
          </p>
          <p>
            The new part is the trust boundary: the language model drafts labels and amounts;
            reviewed contacts supply addresses; one frozen plan becomes one transaction; decoded
            chain instructions supply the evidence.
          </p>
        </section>
        <section className="judge-section">
          <h2>Why AI belongs here</h2>
          <p>
            Gemini interprets ordinary language into a strict JSON draft with warnings and
            clarification states. It receives contact names, never their addresses. Deterministic
            validation rejects unknown labels and amounts not explicitly supplied in the brief.
          </p>
          <p>
            AI cannot select an address, build a hidden instruction, approve a wallet, or move
            funds. Provider failures visibly offer Manual Mode.
          </p>
        </section>
        <section className="judge-section">
          <h2>Why Solana belongs here</h2>
          <p>
            Two or three native System Program transfers fit in one version 0 transaction and
            require one payer signature. All transfer effects succeed together or fail together; a
            failed transaction can still charge a fee.
          </p>
          <p>
            Public Devnet RPC lets a separate verifier inspect the fee payer, status, actual
            transfer instructions, amounts, and unexpected instructions.
          </p>
        </section>
        <section className="judge-section">
          <h2>Try the two-minute workflow</h2>
          <ol>
            <li>Add Ada, Chidi, and Reserve with three distinct public Devnet addresses.</li>
            <li>Use the sample brief and interpret it with Gemini, or select Manual Mode.</li>
            <li>Review full addresses, exact amounts, fee estimate, and wallet debit.</li>
            <li>Connect Phantom on Devnet and personally approve once.</li>
            <li>Inspect the decoded receipt, then paste its signature into Verify.</li>
          </ol>
          <div className="button-row">
            <Link className="button button-primary" href="/">
              Open the workspace <ArrowUpRight size={15} />
            </Link>
            <Link className="button" href="/verify">
              Verify a signature
            </Link>
          </div>
        </section>
      </div>
      <section className="judge-section">
        <h2>Small architecture, explicit trust.</h2>
        <p>
          Next.js App Router and React render the workspace. A server-only route calls Google GenAI
          with structured JSON and validates it with Zod. Solana Kit and the supported wallet plugin
          discover Wallet Standard wallets. Kit builds one transaction. The browser signs through
          the wallet, submits once, then compares actual RPC instructions to the reviewed plan.
          Contacts and recent signature references stay in local storage.
        </p>
        <p>
          Demo limits: Devnet only, native SOL only, 2–3 recipients, 0.1 SOL per recipient and 0.2
          SOL total. No custody, contract, database, mainnet execution, conversion, or scheduled
          payments. Rate limiting is best-effort per server instance; Google project quotas control
          provider spending.
        </p>
        <div className="button-row">
          <a className="button button-primary" href="https://splitbrief-zeta.vercel.app">
            Live application <ArrowUpRight size={14} />
          </a>
          <a
            className="button"
            href="https://github.com/sopskistar/SplitBrief"
            target="_blank"
            rel="noreferrer"
          >
            GitHub repository <ArrowUpRight size={14} />
          </a>
          <Link className="button" href="/how-it-works">
            How it works
          </Link>
          <Link className="button" href="/privacy">
            Privacy & limitations
          </Link>
        </div>
      </section>
    </>
  );
}
