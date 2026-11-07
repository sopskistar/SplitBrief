'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { CircleAlert, Fingerprint, LoaderCircle, Search, ShieldCheck } from 'lucide-react';
import { fetchReceipt, rpcClient } from '@/lib/solana';
import { readHistory } from '@/lib/history';
import { signatureSchema, type Receipt } from '@/lib/verification';
import { ReceiptView } from '../components/receipt';

export function VerifyWorkspace() {
  const params = useSearchParams();
  const initial = params.get('signature') ?? '';
  const [signature, setSignature] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const rpc = useMemo(() => rpcClient(), []);
  const started = useRef(false);
  const verify = useCallback(
    async (value: string) => {
      setLoading(true);
      setError('');
      setReceipt(null);
      try {
        const sig = signatureSchema.parse(value.trim());
        const expected = readHistory(localStorage).find((entry) => entry.signature === sig)?.plan;
        const result = await fetchReceipt(rpc, sig, expected);
        setReceipt(result);
      } catch (error) {
        setError(
          error instanceof Error && !error.message.startsWith('[')
            ? error.message.slice(0, 300)
            : 'Enter a valid base58 Solana transaction signature.',
        );
      } finally {
        setLoading(false);
      }
    },
    [rpc],
  );
  useEffect(() => {
    if (initial && !started.current) {
      started.current = true;
      void verify(initial);
    }
  }, [initial, verify]); // One fresh lookup of a URL signature; the URL never supplies a payment plan.
  function submit(event: FormEvent) {
    event.preventDefault();
    void verify(signature);
  }
  return (
    <>
      <div className="page-intro">
        <h1>A receipt you can check.</h1>
        <p>
          Inspect the actual transaction on Solana Devnet. Every displayed transfer comes from RPC
          transaction data.
        </p>
      </div>
      <section className="panel">
        <form className="verify-form" onSubmit={submit}>
          <div className="section-heading">
            <label htmlFor="signature-input">Transaction signature</label>
            <span className="badge devnet-badge">
              <ShieldCheck size={12} />
              Solana Devnet
            </span>
          </div>
          <div className="input-row">
            <input
              id="signature-input"
              value={signature}
              onChange={(event) => setSignature(event.target.value)}
              placeholder="Paste a Devnet transaction signature"
              maxLength={88}
              required
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="none"
            />
            <button
              className="button button-primary"
              disabled={loading || !signature.trim()}
              type="submit"
            >
              {loading ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />}
              {loading ? 'Checking Devnet…' : 'Verify transaction'}
            </button>
          </div>
          <p className="small muted">
            A saved plan is used for matching only if this browser has one. Local storage never
            proves settlement.
          </p>
        </form>
        {!receipt && !error && (
          <div className="verify-empty">
            <Fingerprint size={30} />
            <div>
              <h2>{loading ? 'Reading the chain transaction…' : 'Independent by design.'}</h2>
              <p>
                {loading
                  ? 'Checking the Devnet genesis hash, execution status, and full decoded instructions.'
                  : 'See the fee payer, native transfers, actual fee, and confirmation state. Extra instructions and mismatches are called out.'}
              </p>
            </div>
          </div>
        )}
      </section>
      {error && (
        <p role="alert" className="notice error">
          <CircleAlert size={18} />
          {error}
        </p>
      )}
      {receipt && <ReceiptView receipt={receipt} />}
    </>
  );
}
