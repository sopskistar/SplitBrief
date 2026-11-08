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
  const total = receipt.transfers.reduce((sum, transfer) => sum + BigInt(transfer.lamports), 0n);
  const title =
    receipt.state === 'failed'
      ? 'Transaction failed'
      : receipt.state === 'unverified'
        ? 'Transaction unverified'
        : receipt.matchesPlan === true
          ? 'Payment completed'
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
  const summary = `SplitBrief receipt\nSolana Devnet. Test tokens have no real financial value.\n${title}\nSignature: ${receipt.signature}\nFee payer: ${receipt.payer}\n${receipt.transfers.map((transfer) => `${transfer.source} → ${transfer.destination}: ${lamportsToSolExact(transfer.lamports)} SOL (${transfer.lamports} lamports)`).join('\n')}\n${success ? 'Total transferred' : 'Decoded instruction total (not proof of settlement)'}: ${lamportsToSolExact(total)} SOL\nActual fee: ${receipt.state === 'unverified' ? 'unavailable' : `${receipt.feeLamports} lamports`}\nState: ${receipt.state}\nSaved plan match: ${receipt.matchesPlan === null ? 'No expected plan supplied' : receipt.matchesPlan}\nSlot: ${receipt.slot}\n${explorerUrl(receipt.signature)}`;
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
        <div className="receipt-overview">
          <div>
            <span className="small muted">
              {success ? 'Total transferred on-chain' : 'Decoded instruction total'}
            </span>
            <p className="receipt-total tabular">
              {lamportsToSolExact(total)} <span>SOL</span>
            </p>
            <span className="small muted">
              {receipt.transfers.length} native transfer{receipt.transfers.length === 1 ? '' : 's'}{' '}
              in this transaction
            </span>
          </div>
          <div className="receipt-status">
            {success && receipt.matchesPlan !== false ? (
              <ShieldCheck size={18} />
            ) : (
              <CircleAlert size={18} />
            )}
            <strong>
              {receipt.state === 'finalized'
                ? 'Finalized'
                : receipt.state === 'confirmed'
                  ? 'Confirmed'
                  : receipt.state === 'failed'
                    ? 'Execution failed'
                    : 'Unverified'}
              {receipt.matchesPlan === true ? ' & matched' : ''}
            </strong>
            <span className="small muted">
              {receipt.matchesPlan === true
                ? 'Every transfer matches your saved review.'
                : 'Full transaction decoded from Devnet RPC.'}
            </span>
          </div>
        </div>
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
            <dd>
              {receipt.state === 'unverified'
                ? 'Not available'
                : `${lamportsToSolExact(receipt.feeLamports)} SOL`}
            </dd>
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
        {receipt.otherInstructions?.length > 0 && (
          <details className="receipt-instructions">
            <summary>Other program instructions ({receipt.otherInstructions.length})</summary>
            <p className="small muted">
              These are reported separately from native SOL transfers. They are not part of a
              transfer-only SplitBrief review.
            </p>
            {receipt.otherInstructions.map((instruction, index) => (
              <p className="address small" key={`${instruction.programId}-${index}`}>
                Instruction {instruction.index + 1}: {instruction.programId}
              </p>
            ))}
          </details>
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
            Copy receipt summary
          </button>
          <button
            className="button"
            onClick={() =>
              copy(
                'link',
                `${window.location.origin}/verify?signature=${encodeURIComponent(receipt.signature)}`,
              )
            }
          >
            <Copy size={15} />
            Copy receipt link
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
          {copied === 'signature'
            ? 'Signature copied. '
            : copied === 'link'
              ? 'Receipt link copied. '
              : copied === 'receipt'
                ? 'Receipt summary copied. '
                : copied.startsWith('Clipboard')
                  ? copied
                  : ''}
          Solana Devnet. Test tokens have no real financial value.
        </p>
        <p className="small muted">
          A shared link verifies the transaction. Your locally saved review plan is not included in
          the URL.
        </p>
      </div>
    </section>
  );
}
