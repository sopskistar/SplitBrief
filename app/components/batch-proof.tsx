import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { batchEvidence as batch, BATCH_VERIFY_URL } from '@/lib/demo-content';
import { explorerUrl, lamportsToSolExact } from '@/lib/payments';
export function BatchProof({ detailed = false }: { detailed?: boolean }) {
  return (
    <section
      className="batch-proof"
      aria-labelledby={detailed ? 'demo-proof-title' : 'public-proof-title'}
    >
      <div className="proof-lead">
        <span className="badge devnet-badge">
          <CheckCircle2 size={13} />
          Finalized · Devnet
        </span>
        <h2 id={detailed ? 'demo-proof-title' : 'public-proof-title'}>
          A real payment, independently verified.
        </h2>
        <p>
          One transaction paid all three demo recipients. The amounts and addresses below come from
          Solana Devnet RPC.
        </p>
      </div>
      <dl className="batch-facts">
        <div>
          <dt>Recipients</dt>
          <dd>{batch.receipt.transfers.length}</dd>
        </div>
        <div>
          <dt>Total transferred</dt>
          <dd>
            {lamportsToSolExact(batch.totalLamports)} <span>SOL</span>
          </dd>
        </div>
        <div>
          <dt>Actual network fee</dt>
          <dd>
            {lamportsToSolExact(batch.feeLamports)} <span>SOL</span>
          </dd>
        </div>
      </dl>
      {detailed && (
        <figure className="owner-receipt">
          <Image
            src="/evidence/successful-devnet-receipt.webp"
            width={1024}
            height={747}
            alt="Owner’s genuine production receipt showing Payment completed, Finalized and matched, and three transfers totaling 0.006 SOL."
          />
          <figcaption className="small muted">
            Owner-supplied application receipt. Cropped to the receipt; original content unchanged.
          </figcaption>
        </figure>
      )}
      {detailed && (
        <div className="batch-addresses">
          {batch.recipients.map((recipient) => (
            <div key={recipient.address}>
              <strong>
                {recipient.name} · {lamportsToSolExact(recipient.lamports)} SOL
              </strong>
              <p className="address">{recipient.address}</p>
            </div>
          ))}
          <p className="small muted">Payer</p>
          <p className="address">{batch.payer}</p>
          <p className="small muted">Signature</p>
          <p className="address">{batch.signature}</p>
        </div>
      )}
      <div className="button-row">
        <Link className="button button-primary" href={BATCH_VERIFY_URL}>
          Inspect on-chain receipt <ArrowUpRight size={15} />
        </Link>
        <a className="button" href={explorerUrl(batch.signature)} target="_blank" rel="noreferrer">
          Solana Explorer <ArrowUpRight size={15} />
        </a>
      </div>
      <p className="proof-provenance small muted">
        Archived RPC verification:{' '}
        {new Date(batch.checkedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC. Reverify for a
        fresh network check. Devnet test tokens have no real value.
      </p>
      {detailed && (
        <p className="proof-provenance small muted">
          The owner’s application receipt reported “Finalized &amp; matched.” We independently
          verified the chain transaction against the published demo addresses and amounts. The
          original frozen review snapshot is unavailable here, so an independent original-plan match
          is not claimed.
        </p>
      )}
    </section>
  );
}
