'use client';
import { useState } from 'react';
import { ArrowUpRight, Check, CircleAlert, Copy, Download, ShieldCheck } from 'lucide-react';
import { explorerUrl, lamportsToSolExact, type PaymentPlan } from '@/lib/payments';
import type { Receipt } from '@/lib/verification';

export function ReceiptView({
  receipt,
  reviewedPlan,
}: {
  receipt: Receipt;
  reviewedPlan?: PaymentPlan;
}) {
  const [copied, setCopied] = useState('');
  const success = receipt.state === 'confirmed' || receipt.state === 'finalized';
  const title =
    receipt.state === 'failed'
      ? 'Transaction failed'
      : receipt.state === 'unverified'
        ? 'Transaction unverified'
        : receipt.matchesPlan === true
          ? `${receipt.state === 'finalized' ? 'Finalized' : 'Confirmed'} & matched`
          : receipt.matchesPlan === false
            ? 'Does not match the saved plan'
            : 'On-chain transaction decoded';
  async function copy(kind: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
    } catch {
      setCopied('Clipboard unavailable. Select the text to copy.');
    }
  }
  const summary = `SplitBrief • SOLANA DEVNET • No real financial value\n${title}\nSignature: ${receipt.signature}\nPayer: ${receipt.payer}\n${receipt.transfers.map((transfer) => `${transfer.source} → ${transfer.destination}: ${lamportsToSolExact(transfer.lamports)} SOL (${transfer.lamports} lamports)`).join('\n')}\nActual fee: ${receipt.feeLamports} lamports\nState: ${receipt.state}\nSlot: ${receipt.slot}\n${explorerUrl(receipt.signature)}`;
  return (
    <section className="panel receipt-panel" aria-labelledby="receipt-title">
      <div
        className={`receipt-heading ${success && receipt.matchesPlan !== false ? 'receipt-success' : 'receipt-warning'}`}
      >
        {success && receipt.matchesPlan !== false ? (
          <ShieldCheck size={27} />
        ) : (
          <CircleAlert size={27} />
        )}
        <div>
          <h2 id="receipt-title">{title}</h2>
          <p className="small">
            {receipt.matchesPlan === true
              ? 'Every decoded transfer matches the frozen review plan.'
              : receipt.matchesPlan === null
                ? 'No expected plan was supplied. Matching to a brief is not claimed.'
                : 'Inspect the differences below before taking any action.'}
          </p>
        </div>
        <span className="badge">Devnet</span>
      </div>
      <div className="receipt-body">
        <dl className="receipt-meta">
          <div>
            <dt>Transaction signature</dt>
            <dd className="address">{receipt.signature}</dd>
          </div>
          <div>
            <dt>Actual fee payer</dt>
            <dd className="address">{receipt.payer}</dd>
          </div>
        </dl>
        <div className="receipt-transfers">
          {receipt.transfers.map((transfer, index) => (
            <div className="receipt-transfer" key={`${transfer.destination}-${index}`}>
              <span className="row-number">{index + 1}</span>
              <div>
                <span className="small muted">
                  {transfer.inner ? 'Inner transfer to' : 'Transfer to'}
                </span>
                <p className="address small">{transfer.destination}</p>
                <p className="small muted address">From {transfer.source}</p>
              </div>
              <strong className="tabular">
                {lamportsToSolExact(transfer.lamports)} <span className="muted small">SOL</span>
              </strong>
            </div>
          ))}
        </div>
        <dl className="receipt-facts">
          <div>
            <dt>Outer instructions</dt>
            <dd>{receipt.instructionCount}</dd>
          </div>
          <div>
            <dt>Actual fee</dt>
            <dd>{lamportsToSolExact(receipt.feeLamports)} SOL</dd>
          </div>
          <div>
            <dt>Network state</dt>
            <dd>{receipt.state}</dd>
          </div>
          <div>
            <dt>Slot</dt>
            <dd>{receipt.slot}</dd>
          </div>
          <div>
            <dt>Block time</dt>
            <dd>
              {receipt.timestamp
                ? new Date(receipt.timestamp * 1000).toLocaleString()
                : 'Not available'}
            </dd>
          </div>
        </dl>
        {receipt.issues.length > 0 && (
          <ul className="notice warning">
            {receipt.issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        )}
        <div className="button-row">
          <a
            className="button button-primary"
            href={explorerUrl(receipt.signature)}
            target="_blank"
            rel="noreferrer"
          >
            Open in Explorer <ArrowUpRight size={16} />
          </a>
          <button className="button" onClick={() => copy('signature', receipt.signature)}>
            {copied === 'signature' ? <Check size={15} /> : <Copy size={15} />}Copy signature
          </button>
          <button className="button" onClick={() => copy('receipt', summary)}>
            <Copy size={15} />
            Copy receipt
          </button>
          <button
            className="icon-button"
            aria-label="Download receipt JSON"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob(
                  [
                    JSON.stringify(
                      { ...receipt, ...(reviewedPlan ? { reviewedPlan } : {}) },
                      null,
                      2,
                    ),
                  ],
                  { type: 'application/json' },
                ),
              );
              const link = document.createElement('a');
              link.href = url;
              link.download = `splitbrief-${receipt.signature.slice(0, 10)}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download size={16} />
          </button>
        </div>
        <p className="small muted" role="status">
          {copied === 'receipt'
            ? 'Receipt summary copied. '
            : copied.startsWith('Clipboard')
              ? copied
              : ''}
          Solana Devnet. Test tokens have no real financial value.
        </p>
      </div>
    </section>
  );
}
