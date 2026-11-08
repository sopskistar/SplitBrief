import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { WalletControl } from './wallet-control';

export function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="wordmark" aria-label="SplitBrief home">
          <Image
            src="/branding/splitbrief-wordmark.png"
            alt="SplitBrief"
            width={1950}
            height={450}
            className="brand-wordmark"
            priority
            unoptimized
          />
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/">New payment</Link>
          <Link href="/verify">Verify receipt</Link>
          <Link href="/how-it-works">How it works</Link>
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
        <Image src="/branding/splitbrief-icon.png" alt="" width={27} height={27} unoptimized />
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
