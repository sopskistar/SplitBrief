'use client';
import { useState } from 'react';
import {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useWallets,
} from '@solana/kit-plugin-wallet/react';
import { Check, Copy, ExternalLink, LogOut, Wallet } from 'lucide-react';
import { useWalletClient } from './providers';
import { shortAddress } from '@/lib/payments';
import { useHydrated } from './browser-storage';

export function WalletControl() {
  const client = useWalletClient();
  const connection = useConnectedWallet(client);
  const hydrated = useHydrated();
  const connected = hydrated ? connection : null;
  const wallets = useWallets(client);
  const { dispatchAsync: connect, isRunning: connecting } = useConnect(client);
  const { dispatchAsync: disconnect } = useDisconnect(client);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="wallet-control"
      data-hydrated={hydrated}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      <button
        className="button button-ink"
        aria-expanded={open}
        aria-controls="wallet-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Wallet size={16} />
        {connected ? shortAddress(connected.account.address) : 'Connect wallet'}
      </button>
      {open && (
        <div className="wallet-menu" id="wallet-menu">
          <div className="section-heading">
            <strong>{connected ? 'Connected wallet' : 'Choose your wallet'}</strong>
            <button className="text-button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <p className="small muted">
            In Phantom, enable Testnet Mode in Settings, then choose Solana Devnet. SplitBrief
            requests the Devnet chain.
          </p>
          {connected ? (
            <>
              <p className="address">{connected.account.address}</p>
              <div className="button-row">
                <button
                  className="button button-small"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(connected.account.address);
                      setCopied(true);
                    } catch {
                      setError('Clipboard unavailable. Select and copy the address.');
                    }
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy address'}
                </button>
                <button
                  className="button button-small"
                  onClick={async () => {
                    try {
                      await disconnect();
                      setOpen(false);
                    } catch {
                      setError('Could not disconnect. Try again.');
                    }
                  }}
                >
                  <LogOut size={14} />
                  Disconnect
                </button>
              </div>
            </>
          ) : wallets.length ? (
            <div className="wallet-list">
              {wallets.map((wallet) => (
                <button
                  className="button"
                  key={wallet.name}
                  disabled={connecting}
                  onClick={async () => {
                    setError('');
                    try {
                      await connect(wallet);
                      setOpen(false);
                    } catch {
                      setError(
                        'Wallet connection was declined or unavailable. Open Phantom and try again.',
                      );
                    }
                  }}
                >
                  <Wallet size={16} />
                  {connecting ? 'Connecting…' : wallet.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="notice">
              No Wallet Standard wallet detected. Install or open Phantom, then refresh this page in
              the same browser.
            </p>
          )}
          {error && (
            <p role="alert" className="error-text small">
              {error}
            </p>
          )}
          <a
            className="inline-link small"
            href="https://faucet.solana.com/"
            target="_blank"
            rel="noreferrer"
          >
            Get free Devnet SOL <ExternalLink size={13} />
          </a>
        </div>
      )}
    </div>
  );
}
