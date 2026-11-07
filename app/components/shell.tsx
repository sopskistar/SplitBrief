import Link from 'next/link';
import { ArrowUpRight, GitBranch, Layers3, ShieldCheck } from 'lucide-react';
import { WalletControl } from './wallet-control';

export function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="wordmark" aria-label="SplitBrief home">
          <span className="brand-symbol">
            <GitBranch size={21} strokeWidth={2.2} />
          </span>
          SplitBrief
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/">Workspace</Link>
          <Link href="/verify">Verify receipt</Link>
          <Link href="/judges">
            For judges <ArrowUpRight size={13} />
          </Link>
        </nav>
        <div className="header-actions">
          <span className="badge devnet-badge">
            <ShieldCheck size={13} />
            Devnet
          </span>
          <WalletControl />
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <Layers3 size={15} />
        <span>Built for the MLH Solana Hackathon 2026</span>
      </div>
      <nav aria-label="Footer">
        <Link href="/how-it-works">How it works</Link>
        <Link href="/privacy">Privacy</Link>
        <a href="https://github.com/sopskistar/SplitBrief" target="_blank" rel="noreferrer">
          Source code <ArrowUpRight size={12} />
        </a>
      </nav>
      <p>Solana Devnet. Test tokens have no real financial value.</p>
    </footer>
  );
}
