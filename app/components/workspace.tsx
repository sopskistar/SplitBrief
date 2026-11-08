'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { address, blockhash } from '@solana/kit';
import { useConnectedWallet } from '@solana/kit-plugin-wallet/react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  Clock3,
  FileText,
  Fingerprint,
  Layers3,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { z } from 'zod';
import { useWalletClient } from './providers';
import { Contacts } from './contacts';
import { DemoRecipientSetup } from './demo-recipient-setup';
import { ReceiptView } from './receipt';
import {
  broadcastStorage,
  PENDING_KEY,
  useContacts,
  useHistory,
  useStoredValue,
  useHydrated,
} from './browser-storage';
import { rememberSubmission, rememberVerifiedSignature } from '@/lib/history';
import {
  assertWalletReady,
  assertDevnet,
  canRetirePendingSubmission,
  fetchReceipt,
  findRecentPayments,
  preparePayment,
  rpcClient,
  signAndSubmit,
  SubmissionGate,
  type PreparedPayment,
} from '@/lib/solana';
import {
  createPlan,
  draftItemSchema,
  lamportsToSolExact,
  SAMPLE_BRIEF,
  solToLamportsExact,
  type DraftItem,
  type PaymentPlan,
} from '@/lib/payments';
import type { Receipt } from '@/lib/verification';

const SAMPLE_ITEMS: DraftItem[] = [
  { recipientLabel: 'Ada', amountSol: '0.002', purpose: 'Design' },
  { recipientLabel: 'Chidi', amountSol: '0.001', purpose: 'Delivery' },
  { recipientLabel: 'Reserve', amountSol: '0.003', purpose: 'Reserve' },
];
const interpretationResponse = z.object({
  items: z.array(draftItemSchema).max(3),
  warnings: z.array(z.string()),
  clarificationNeeded: z.boolean(),
  model: z.string(),
  source: z.enum(['gemini', 'validation']),
});
type Stage = 'draft' | 'preparing' | 'review' | 'awaiting' | 'submitted' | 'receipt';
function errorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : 'The request could not be completed.';
  if (/reject|declin|4001|denied/i.test(text))
    return 'Wallet request rejected. No transaction was broadcast. You can review and try again.';
  if (text.startsWith('[')) return 'Check the recipient labels, addresses, and exact SOL amounts.';
  return text.slice(0, 300);
}

export function Workspace() {
  const client = useWalletClient();
  const connection = useConnectedWallet(client);
  const hydrated = useHydrated();
  const connected = hydrated ? connection : null;
  const rpc = useMemo(() => rpcClient(), []);
  const { contacts, setContacts, corrupted } = useContacts();
  const history = useHistory();
  const pendingRaw = useStoredValue(PENDING_KEY);
  const pendingRecord = useMemo(() => {
    try {
      return z
        .object({
          signature: z.string(),
          blockhash: z.string(),
          lastValidBlockHeight: z.string().regex(/^\d+$/),
        })
        .parse(JSON.parse(pendingRaw ?? 'null'));
    } catch {
      return null;
    }
  }, [pendingRaw]);
  const pending = pendingRecord?.signature ?? pendingRaw;
  const [instruction, setInstruction] = useState('');
  const [items, setItems] = useState<DraftItem[]>(SAMPLE_ITEMS);
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [source, setSource] = useState('Example draft');
  const [parsing, setParsing] = useState(false);
  const [draftBlocked, setDraftBlocked] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [stage, setStage] = useState<Stage>('draft');
  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceError, setBalanceError] = useState('');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [prepared, setPrepared] = useState<PreparedPayment | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptPlan, setReceiptPlan] = useState<PaymentPlan | undefined>();
  const [submittedSignature, setSubmittedSignature] = useState('');
  const [historyStates, setHistoryStates] = useState<Record<string, string>>({});
  const [historyTotals, setHistoryTotals] = useState<Record<string, string>>({});
  const [recovering, setRecovering] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [checkingPending, setCheckingPending] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const gate = useRef(new SubmissionGate());
  const cancel = useRef(false);
  const parseAbort = useRef<AbortController | null>(null);
  const reviewRef = useRef<HTMLElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const frozen = stage !== 'draft';
  const payer = connected?.account.address;
  useEffect(() => {
    if (receipt) {
      const frame = requestAnimationFrame(() => {
        receiptRef.current?.focus();
        receiptRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [receipt]);

  const refreshBalance = useCallback(async () => {
    if (!payer) {
      setBalance(null);
      setBalanceError('');
      return;
    }
    setBalanceLoading(true);
    setBalanceError('');
    try {
      await assertDevnet(rpc);
      const result = await rpc
        .getBalance(address(payer), { commitment: 'confirmed' })
        .send({ abortSignal: AbortSignal.timeout(10_000) });
      setBalance(result.value);
    } catch {
      setBalance(null);
      setBalanceError('Unable to load Devnet balance. Refresh to retry.');
    } finally {
      setBalanceLoading(false);
    }
  }, [payer, rpc]);
  useEffect(() => {
    const id = setTimeout(() => {
      void refreshBalance();
    }, 0);
    return () => clearTimeout(id);
  }, [refreshBalance]);
  useEffect(() => {
    let active = true;
    void (async () => {
      const results: Record<string, string> = {};
      const totals: Record<string, string> = {};
      for (const entry of history.slice(0, 3)) {
        try {
          const checked = await fetchReceipt(rpc, entry.signature, entry.plan);
          if (checked.state === 'confirmed' || checked.state === 'finalized')
            totals[entry.signature] = checked.transfers
              .reduce((sum, transfer) => sum + BigInt(transfer.lamports), 0n)
              .toString();
          if (checked.state === 'failed') totals[entry.signature] = '0';
          results[entry.signature] = checked.matchesPlan
            ? `${checked.state} & matched`
            : checked.state === 'failed'
              ? 'Failed on-chain'
              : checked.matchesPlan === null
                ? `${checked.state} / decoded`
                : 'Mismatch / unverified';
          if (checked.state !== 'unverified') {
            try {
              const stored = localStorage.getItem(PENDING_KEY);
              if (
                stored === entry.signature ||
                (stored && JSON.parse(stored).signature === entry.signature)
              ) {
                localStorage.removeItem(PENDING_KEY);
                broadcastStorage();
              }
            } catch {
              /* Non-authoritative browser storage may be unavailable. */
            }
          }
        } catch {
          results[entry.signature] = 'Unable to reverify';
        }
      }
      if (active) {
        setHistoryStates(results);
        setHistoryTotals(totals);
      }
    })();
    return () => {
      active = false;
    };
  }, [history, rpc]);
  async function recoverPayments() {
    if (!payer) {
      setRecoveryMessage(
        'Connect your wallet to search its public Devnet history, or verify a signature directly.',
      );
      return;
    }
    setRecovering(true);
    setRecoveryMessage('Checking the latest five public wallet transactions…');
    try {
      const recovered = await findRecentPayments(rpc, payer);
      for (const result of recovered)
        rememberVerifiedSignature(localStorage, result.signature, 'recovered');
      broadcastStorage();
      setRecoveryMessage(
        recovered.length
          ? `Recovered ${recovered.length} verified native payment reference(s). Original brief matching is not claimed without its saved plan.`
          : 'No outgoing batch payments found in the latest five transactions. Incoming funding transfers are not SplitBrief payouts. You can still verify any signature.',
      );
    } catch {
      setRecoveryMessage(
        'Wallet history could not be checked. Saved receipts are preserved; retry or verify a known signature.',
      );
    } finally {
      setRecovering(false);
    }
  }
  const total = useMemo(() => {
    try {
      return items.reduce((sum, item) => sum + solToLamportsExact(item.amountSol), 0n);
    } catch {
      return null;
    }
  }, [items]);
  const matchedCount = items.filter((item) =>
    contacts.some((contact) => contact.name === item.recipientLabel),
  ).length;

  function changeItem(index: number, field: keyof DraftItem, value: string) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
    setSource('Manually edited draft');
    setError('');
    setMode('manual');
    setDraftBlocked(false);
  }
  function chooseManual() {
    parseAbort.current?.abort();
    parseAbort.current = null;
    setParsing(false);
    setMode('manual');
    setSource('Manual Mode');
    setError('');
    setDraftBlocked(false);
  }
  async function parseBrief() {
    setError('');
    setWarnings([]);
    setParsing(true);
    setDraftBlocked(true);
    const controller = new AbortController();
    parseAbort.current = controller;
    try {
      if (contacts.length < 2)
        throw new Error('Add at least two named recipients to your address book first.');
      const response = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction,
          recipientNames: contacts.map((contact) => contact.name),
        }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(285_000)]),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Gemini is unavailable. Use Manual Mode.',
        );
      const result = interpretationResponse.parse(data);
      setWarnings(result.warnings);
      if (result.clarificationNeeded) {
        setError('Clarify the brief before continuing, or compose the payment in Manual Mode.');
        return;
      }
      if (
        result.items.some(
          (item) => !contacts.some((contact) => contact.name === item.recipientLabel),
        )
      )
        throw new Error('Gemini returned an unknown label. Choose a known contact manually.');
      setItems(result.items);
      setSource(`Gemini draft (${result.model})`);
      setDraftBlocked(false);
    } catch (error) {
      if (controller.signal.aborted) return;
      setError(
        error instanceof Error && error.name === 'TimeoutError'
          ? 'Gemini timed out. Use Manual Mode or try again.'
          : errorMessage(error),
      );
    } finally {
      if (parseAbort.current === controller) {
        parseAbort.current = null;
        setParsing(false);
      }
    }
  }
  async function review() {
    setError('');
    setStage('preparing');
    try {
      if (pending)
        throw new Error(
          'An earlier submission still needs verification. Recheck its original signature before making another payment.',
        );
      if (draftBlocked)
        throw new Error(
          'The brief changed or needs clarification. Interpret it again or explicitly choose Manual Mode.',
        );
      if (!connected || !payer)
        throw new Error('Connect Phantom with Solana Devnet enabled to review this payment.');
      assertWalletReady(
        connected.signer,
        connected.account.chains,
        connected.supportedTransactionVersions,
        payer,
      );
      const plan = createPlan(payer, items, contacts);
      const result = await preparePayment(rpc, plan);
      setPrepared(result);
      setBalance(result.balance);
      setStage('review');
      gate.current = new SubmissionGate();
      requestAnimationFrame(() => {
        reviewRef.current?.focus();
        reviewRef.current?.scrollIntoView({ behavior: 'instant', block: 'center' });
      });
    } catch (error) {
      setError(errorMessage(error));
      setStage('draft');
    }
  }
  async function approve() {
    setError('');
    cancel.current = false;
    setCancelRequested(false);
    if (!prepared || !connected) {
      setError('Wallet disconnected. Connect again and refresh the review.');
      setStage('draft');
      return;
    }
    try {
      const signer = assertWalletReady(
        connected.signer,
        connected.account.chains,
        connected.supportedTransactionVersions,
        prepared.plan.payer,
      );
      const result = await signAndSubmit(rpc, prepared, signer, gate.current, {
        onAwaiting: () => setStage('awaiting'),
        isCurrentWallet: () =>
          !cancel.current &&
          client.wallet.getState().connected?.account.address === prepared.plan.payer,
        onSubmitted: (signature) => {
          setSubmittedSignature(signature);
          setStage('submitted');
          // A reload can only recheck this known signature; it never submits a saved plan.
          try {
            localStorage.setItem(
              PENDING_KEY,
              JSON.stringify({
                signature,
                blockhash: prepared.blockhash,
                lastValidBlockHeight: prepared.lastValidBlockHeight.toString(),
              }),
            );
            rememberSubmission(localStorage, signature, prepared.plan);
            broadcastStorage();
          } catch {
            setWarnings([
              'Payment was submitted, but browser history could not be saved. Copy the signature now.',
            ]);
          }
        },
      });
      setReceipt(result);
      setReceiptPlan(prepared.plan);
      setStage('receipt');
      if (result.state !== 'unverified') {
        localStorage.removeItem(PENDING_KEY);
        broadcastStorage();
      }
      void refreshBalance();
    } catch (error) {
      setError(errorMessage(error));
      if (!gate.current || !localStorage.getItem(PENDING_KEY))
        setStage((current) => (current === 'submitted' ? 'submitted' : 'review'));
    }
  }
  async function recheck(signature: string) {
    setCheckingPending(true);
    setError('');
    try {
      const expected = history.find((entry) => entry.signature === signature)?.plan;
      const checked = await fetchReceipt(rpc, signature, expected);
      setReceipt(checked);
      setReceiptPlan(expected);
      setStage('receipt');
      if (checked.state !== 'unverified') {
        localStorage.removeItem(PENDING_KEY);
        broadcastStorage();
      }
    } catch (error) {
      setError(errorMessage(error));
      if (pendingRecord?.signature === signature) {
        try {
          const expired = await canRetirePendingSubmission(rpc, {
            signature,
            blockhash: blockhash(pendingRecord.blockhash),
            lastValidBlockHeight: BigInt(pendingRecord.lastValidBlockHeight),
          });
          setRecoveryReady(expired);
          if (expired)
            setWarnings([
              'RPC found no record of the original signature, and its blockhash has expired. Missing history cannot prove it never landed. Check Explorer before explicitly starting a new review.',
            ]);
        } catch {
          setRecoveryReady(false);
        }
      }
    } finally {
      setCheckingPending(false);
    }
  }

  return (
    <>
      <div className="workspace-intro">
        <div>
          <h1>Pay multiple people in one Solana transaction.</h1>
          <p>
            Describe who needs to be paid, let AI organize the amounts, review every recipient, and
            approve one atomic transaction in Phantom.
          </p>
        </div>
        <div className="intro-actions">
          <a
            className="button button-primary"
            href="#payment-editor"
            onClick={() =>
              requestAnimationFrame(() => document.getElementById('payment-brief')?.focus())
            }
          >
            Create payment <ArrowRight size={15} />
          </a>
          <a className="text-button" href="#history">
            Find a receipt
          </a>
        </div>
      </div>
      <div className="workspace-toolbar">
        <div className="workspace-label">
          <Layers3 size={17} />
          <span>New payment</span>
          <span className="badge">Native SOL</span>
        </div>
        <a className="text-button" href="#contacts">
          <Users size={15} />
          Address book <span className="count">{contacts.length}</span>
        </a>
      </div>
      {draftBlocked && !parsing && !error && (
        <p className="notice">
          The brief changed. Interpret it again or choose Manual Mode before review.
        </p>
      )}
      {corrupted && (
        <p role="alert" className="notice warning">
          The saved address book is invalid. Add and verify your contacts again.
        </p>
      )}
      {pending && (
        <div className="notice warning">
          <CircleAlert size={18} />
          <div>
            <strong>One submission needs a fresh chain check.</strong>
            <p className="small address">{pending}</p>
            <button
              className="text-button"
              onClick={() => recheck(pending)}
              disabled={checkingPending}
            >
              {checkingPending ? 'Checking original signature…' : 'Recheck original signature'}
            </button>
            {recoveryReady && (
              <button
                className="button"
                onClick={() => {
                  localStorage.removeItem(PENDING_KEY);
                  broadcastStorage();
                  setRecoveryReady(false);
                  setPrepared(null);
                  setStage('draft');
                  setSubmittedSignature('');
                  setError('');
                  gate.current = new SubmissionGate();
                }}
              >
                Start a new review
              </button>
            )}
          </div>
        </div>
      )}
      <DemoRecipientSetup
        contacts={contacts}
        onChange={setContacts}
        disabled={frozen || !hydrated}
      />
      <div className="workspace-grid" id="payment-editor">
        <div className="composer-column">
          <section className="panel brief-panel" aria-labelledby="brief-title">
            <div className="panel-heading">
              <div className="heading-with-icon">
                <FileText size={18} />
                <h2 id="brief-title">Payment instructions</h2>
              </div>
              <div className="mode-switch" aria-label="Composer mode">
                <button
                  aria-pressed={mode === 'ai'}
                  disabled={frozen}
                  onClick={() => {
                    setMode('ai');
                    if (instruction) setDraftBlocked(true);
                  }}
                >
                  <Sparkles size={13} />
                  AI brief
                </button>
                <button aria-pressed={mode === 'manual'} disabled={frozen} onClick={chooseManual}>
                  Manual Mode
                </button>
              </div>
            </div>
            {mode === 'ai' ? (
              <div className="brief-content">
                <label className="sr-only" htmlFor="payment-brief">
                  Payment instruction
                </label>
                <textarea
                  id="payment-brief"
                  maxLength={500}
                  value={instruction}
                  onChange={(event) => {
                    setInstruction(event.target.value);
                    setDraftBlocked(true);
                  }}
                  disabled={frozen || parsing}
                  placeholder={SAMPLE_BRIEF}
                  rows={4}
                />
                <div className="brief-bottom">
                  <button
                    className="text-button"
                    disabled={frozen || parsing}
                    onClick={() => {
                      setInstruction(SAMPLE_BRIEF);
                      setDraftBlocked(true);
                    }}
                  >
                    <Plus size={14} />
                    Use sample brief
                  </button>
                  <span className="small muted">{instruction.length}/500</span>
                </div>
                <div className="brief-actions">
                  <p className="small muted">
                    <ShieldCheck size={14} />
                    AI cannot approve payments.
                  </p>
                  <button
                    className="button button-primary"
                    onClick={parseBrief}
                    disabled={frozen || parsing || !instruction.trim()}
                  >
                    {parsing ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}
                    {parsing ? 'Interpreting…' : 'Interpret brief'}
                    <ArrowRight size={15} />
                  </button>
                </div>
                {parsing && (
                  <p className="small muted ai-wait-note" role="status">
                    Gemini can take up to 4½ minutes during high demand. You can switch to Manual
                    Mode at any time. No payment is being sent.
                  </p>
                )}
              </div>
            ) : (
              <div className="manual-note">
                <PencilMark />
                <div>
                  <strong>You are composing this payment.</strong>
                  <p className="small muted">
                    Choose known contacts and enter exact native SOL amounts below. No AI request is
                    made in Manual Mode.
                  </p>
                </div>
              </div>
            )}
          </section>
          <div className="flow-connector">
            <ArrowDown size={15} />
            <span>
              {parsing
                ? 'Gemini is extracting a structured draft…'
                : source.startsWith('Gemini')
                  ? 'Real Gemini output. Review every field below.'
                  : 'Every recipient resolves to your address book.'}
            </span>
          </div>
          <section className="panel draft-panel" aria-labelledby="draft-title">
            <div className="panel-heading">
              <div className="heading-with-icon">
                <h2 id="draft-title">Payment draft</h2>
                <span className="badge">
                  {source.startsWith('Gemini')
                    ? 'Gemini'
                    : source === 'Example draft'
                      ? 'Example'
                      : 'Manual'}
                </span>
              </div>
              <span className="small muted">
                {matchedCount}/{items.length} contacts matched
              </span>
            </div>
            <div className="payment-table">
              <div className="payment-table-head">
                <span>Recipient / purpose</span>
                <span>Amount in SOL</span>
                <span className="sr-only">Remove</span>
              </div>
              {items.map((item, index) => {
                const contact = contacts.find((contact) => contact.name === item.recipientLabel);
                return (
                  <div className="payment-row" key={index}>
                    <div className="recipient-cell">
                      <span className={`avatar avatar-${index}`}>
                        {item.recipientLabel.slice(0, 1) || '?'}
                      </span>
                      <div className="recipient-fields">
                        <label className="sr-only" htmlFor={`recipient-${index}`}>
                          Recipient {index + 1}
                        </label>
                        <select
                          id={`recipient-${index}`}
                          value={item.recipientLabel}
                          disabled={frozen || parsing}
                          onChange={(event) =>
                            changeItem(index, 'recipientLabel', event.target.value)
                          }
                        >
                          {!contact && (
                            <option value={item.recipientLabel}>
                              {item.recipientLabel || 'Choose a contact'}
                            </option>
                          )}
                          {contacts.map((contact) => (
                            <option key={contact.id} value={contact.name}>
                              {contact.name}
                            </option>
                          ))}
                        </select>
                        <label className="sr-only" htmlFor={`purpose-${index}`}>
                          Purpose {index + 1}
                        </label>
                        <input
                          className="purpose-input"
                          id={`purpose-${index}`}
                          value={item.purpose}
                          maxLength={100}
                          disabled={frozen || parsing}
                          placeholder="Purpose (optional)"
                          onChange={(event) => changeItem(index, 'purpose', event.target.value)}
                        />
                        <span
                          className={`recipient-address small ${contact ? 'muted' : 'unresolved'}`}
                        >
                          {contact ? (
                            <>
                              <Check size={11} />
                              <span className="address">{contact.address}</span>
                            </>
                          ) : (
                            <>
                              <CircleAlert size={11} />
                              Add a public address below
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="amount-cell">
                      <label className="sr-only" htmlFor={`amount-${index}`}>
                        Amount SOL {index + 1}
                      </label>
                      <input
                        id={`amount-${index}`}
                        inputMode="decimal"
                        autoComplete="off"
                        maxLength={24}
                        value={item.amountSol}
                        disabled={frozen || parsing}
                        onChange={(event) => changeItem(index, 'amountSol', event.target.value)}
                      />
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`Remove payment ${index + 1}`}
                      disabled={frozen || parsing}
                      onClick={() => {
                        setItems((current) => current.filter((_, i) => i !== index));
                        setSource('Manually edited draft');
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
              {items.length === 0 && (
                <p className="empty-draft">Add a recipient to begin your manual payment draft.</p>
              )}
            </div>
            <div className="draft-footer">
              <button
                className="text-button"
                disabled={frozen || parsing || items.length >= 3}
                onClick={() => {
                  setItems((current) => [
                    ...current,
                    {
                      recipientLabel:
                        contacts.find(
                          (contact) =>
                            !current.some((item) => item.recipientLabel === contact.name),
                        )?.name ?? '',
                      amountSol: '',
                      purpose: '',
                    },
                  ]);
                  setSource('Manual Mode');
                }}
              >
                <Plus size={14} />
                Add recipient
              </button>
              <span className="small muted">2 or 3 recipients per transaction</span>
            </div>
          </section>
          <div aria-live="polite">
            {warnings.map((warning, index) => (
              <p className="notice warning" key={index}>
                {warning}
              </p>
            ))}
            {error && (
              <p role="alert" className="notice error">
                <CircleAlert size={18} />
                {error}
              </p>
            )}
          </div>
        </div>
        <aside className="summary-column">
          <section className="payment-summary" aria-labelledby="summary-title">
            <div className="summary-heading">
              <h2 id="summary-title">Payment summary</h2>
              <Layers3 size={18} />
            </div>
            <div className="total-label">Total to recipients</div>
            <div className="summary-total tabular">
              {total === null ? '—' : lamportsToSolExact(total)} <span>SOL</span>
            </div>
            <div className="summary-detail">
              <span>{items.length} recipients</span>
              <span>1 atomic transaction</span>
            </div>
            <div className="summary-divider" />
            <dl className="summary-facts">
              <div>
                <dt>Network</dt>
                <dd>Solana Devnet</dd>
              </div>
              <div>
                <dt>Wallet balance</dt>
                <dd>
                  {!payer
                    ? 'Connect to view'
                    : balanceLoading
                      ? 'Checking…'
                      : balance !== null
                        ? `${lamportsToSolExact(balance)} SOL`
                        : 'Unavailable'}
                </dd>
              </div>
              <div>
                <dt>Network fee</dt>
                <dd>
                  {prepared && frozen
                    ? `${lamportsToSolExact(prepared.fee)} SOL (est.)`
                    : 'Calculated at review'}
                </dd>
              </div>
              <div>
                <dt>Estimated debit</dt>
                <dd>
                  {prepared && frozen
                    ? `${lamportsToSolExact(BigInt(prepared.plan.totalLamports) + prepared.fee)} SOL`
                    : 'Transfers + RPC fee'}
                </dd>
              </div>
            </dl>
            {balanceError && <p className="small summary-error">{balanceError}</p>}
            {payer && (
              <button
                className="summary-refresh"
                onClick={refreshBalance}
                disabled={balanceLoading}
              >
                <RefreshCw size={12} />
                Refresh Devnet balance
              </button>
            )}
            <button
              className="button button-lime review-button"
              onClick={review}
              disabled={frozen || parsing || draftBlocked || items.length < 2 || !!pending}
            >
              {stage === 'preparing' ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Fingerprint size={18} />
              )}
              {stage === 'preparing' ? 'Preparing review…' : 'Review payment'}
              <ArrowRight size={17} />
            </button>
            <p className="summary-disclaimer">
              <ShieldCheck size={13} />
              Nothing moves until you review and sign.
            </p>
          </section>
          <section className="atomic-explainer">
            <div className="heading-with-icon">
              <Layers3 size={16} />
              <h3>One atomic payment</h3>
            </div>
            <p>
              All transfer effects succeed together or fail together. A failed transaction may still
              incur a network fee.
            </p>
            <div className="limits">
              <span>Per recipient ≤ 0.1 SOL</span>
              <span>Total ≤ 0.2 SOL</span>
            </div>
          </section>
          <a
            className="faucet-link"
            href="https://faucet.solana.com/"
            target="_blank"
            rel="noreferrer"
          >
            <Wallet size={15} />
            <span>Need test tokens? Devnet faucet</span>
            <ArrowUpRight size={14} />
          </a>
        </aside>
      </div>
      <ol className="workflow-steps" aria-label="Payment progress">
        {[
          ['Draft', FileText],
          ['Review', ShieldCheck],
          ['Sign once', Fingerprint],
          ['Verify on-chain', Check],
        ].map(([label, Icon], index) => {
          const StepIcon = Icon as typeof Check;
          const step =
            stage === 'draft' || stage === 'preparing'
              ? 0
              : stage === 'review'
                ? 1
                : stage === 'awaiting'
                  ? 2
                  : 3;
          return (
            <li className={index <= step ? 'current' : ''} key={String(label)}>
              <span>
                <StepIcon size={14} />
              </span>
              {String(label)}
            </li>
          );
        })}
      </ol>
      {(stage === 'review' || stage === 'awaiting') && prepared && (
        <section
          className="panel final-review"
          ref={reviewRef}
          tabIndex={-1}
          aria-labelledby="review-title"
        >
          <div className="panel-heading">
            <div className="heading-with-icon">
              <ShieldCheck size={20} />
              <h2 id="review-title">Check every address before signing</h2>
            </div>
            <span className="badge">Frozen review plan</span>
          </div>
          <div className="review-content">
            <p className="small">
              One version 0 transaction with exactly {prepared.plan.items.length} System Program SOL
              transfers. AI cannot modify this snapshot.
            </p>
            <dl className="review-payer">
              <dt>From your wallet</dt>
              <dd className="address">{prepared.plan.payer}</dd>
            </dl>
            {prepared.plan.items.map((item) => (
              <div className="review-row" key={item.address}>
                <div>
                  <strong>{item.recipientLabel}</strong>
                  <p className="address">{item.address}</p>
                  <span className="small muted">{item.purpose}</span>
                </div>
                <strong className="tabular">{item.amountSol} SOL</strong>
              </div>
            ))}
            <div className="review-debit">
              <span>Estimated wallet debit, including RPC fee</span>
              <strong>
                {lamportsToSolExact(BigInt(prepared.plan.totalLamports) + prepared.fee)} SOL
              </strong>
            </div>
            <p className="small muted">
              Select Solana Devnet in Phantom. Review its simulation and all addresses. Test tokens
              have no real value.
            </p>
            <div className="button-row">
              {stage === 'review' ? (
                <>
                  <button className="button button-primary" onClick={approve}>
                    <Fingerprint size={17} />
                    Approve & open Phantom
                  </button>
                  <button
                    className="button"
                    onClick={() => {
                      setPrepared(null);
                      setStage('draft');
                      setError('');
                    }}
                  >
                    Cancel review
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      setStage('draft');
                      void review();
                    }}
                  >
                    Refresh fee & blockhash
                  </button>
                </>
              ) : (
                <>
                  <span className="signing-status" role="status">
                    <LoaderCircle size={17} className="spin" />
                    {cancelRequested
                      ? 'Canceled in app. Close the wallet request.'
                      : 'Awaiting your approval in the wallet…'}
                  </span>
                  <button
                    className="button"
                    disabled={cancelRequested}
                    onClick={() => {
                      cancel.current = true;
                      setCancelRequested(true);
                    }}
                  >
                    Cancel request
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}
      {stage === 'submitted' && (
        <section className="notice submitted-state">
          <Clock3 size={24} />
          <div>
            <h2>Payment submitted. Verifying on-chain.</h2>
            <p className="small">Do not send again while confirmation is uncertain.</p>
            <p className="address small">{submittedSignature}</p>
            <button
              className="button"
              onClick={() => recheck(submittedSignature)}
              disabled={checkingPending}
            >
              Recheck on Devnet
            </button>
          </div>
        </section>
      )}
      {receipt && (
        <>
          <div ref={receiptRef} tabIndex={-1} className="receipt-anchor">
            <ReceiptView receipt={receipt} reviewedPlan={receiptPlan} />
          </div>
          {stage === 'receipt' && (
            <button
              className="button new-payment"
              onClick={() => {
                setReceipt(null);
                setPrepared(null);
                setSubmittedSignature('');
                setStage('draft');
                setError('');
                gate.current = new SubmissionGate();
              }}
            >
              Start another payment <ArrowRight size={15} />
            </button>
          )}
        </>
      )}
      <section className="how-panel" aria-labelledby="how-title">
        <div>
          <h2 id="how-title">How SplitBrief works</h2>
          <p>AI organizes the brief. You control the wallet.</p>
        </div>
        <ol>
          {[
            'Save the public wallet addresses of your recipients.',
            'Describe who to pay and how much in ordinary language.',
            'AI creates an editable payment draft.',
            'Check every recipient, address, amount and fee.',
            'Approve one transaction with Phantom.',
            'Inspect the verified on-chain receipt.',
          ].map((text, index) => (
            <li key={text}>
              <span>{index + 1}</span>
              {text}
            </li>
          ))}
        </ol>
        <p className="how-safety">
          AI never controls private keys or approves payments. Solana executes multiple native
          transfers in one atomic transaction: if an instruction fails, transfer effects are rolled
          back, although network fees may still be charged.
        </p>
      </section>
      <Contacts
        contacts={contacts}
        disabled={frozen || parsing}
        onChange={(updated) => {
          try {
            setContacts(updated);
          } catch {
            setError(
              'Browser storage is unavailable. Enable local storage to save your reviewed contacts.',
            );
          }
        }}
      />
      <section className="panel history-panel" id="history" aria-labelledby="history-title">
        <div className="panel-heading">
          <div className="heading-with-icon">
            <Clock3 size={18} />
            <h2 id="history-title">Recent receipts</h2>
          </div>
          <div className="button-row">
            <button className="text-button" onClick={recoverPayments} disabled={recovering}>
              {recovering ? 'Finding payments…' : 'Find my payments'}
            </button>
            <Link href="/verify" className="text-button">
              Verify any signature <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
        <p className="history-note small muted">
          Saved on this site and browser. Changing from localhost to a deployed URL uses separate
          storage. A fresh chain check verifies every reference.
        </p>
        {recoveryMessage && (
          <p className="notice" role="status">
            {recoveryMessage}
          </p>
        )}
        {history.length === 0 ? (
          <div className="empty-history">
            <Clock3 size={23} />
            <p>Your first submitted payment will appear here.</p>
            <span className="small muted">Saved locally. Network checks provide the evidence.</span>
          </div>
        ) : (
          <div className="history-list">
            {history.map((entry) => (
              <Link
                href={`/verify?signature=${encodeURIComponent(entry.signature)}`}
                key={entry.signature}
                className="history-row"
              >
                <div>
                  <strong>
                    {entry.plan
                      ? entry.plan.items.map((item) => item.recipientLabel).join(', ')
                      : entry.source === 'recovered'
                        ? 'Recovered native payment'
                        : 'Verified Devnet transaction'}
                  </strong>
                  <p className="small muted address">{entry.signature}</p>
                </div>
                <strong className="tabular">
                  {historyTotals[entry.signature]
                    ? `${lamportsToSolExact(historyTotals[entry.signature])} SOL`
                    : entry.plan
                      ? `${lamportsToSolExact(entry.plan.totalLamports)} SOL (plan)`
                      : 'Check amount'}
                </strong>
                <span className="badge">
                  {historyStates[entry.signature] ??
                    (history.indexOf(entry) < 3 ? 'Checking network…' : 'Open to reverify')}
                </span>
                <ArrowUpRight size={15} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function PencilMark() {
  return <FileText size={23} />;
}
