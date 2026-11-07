import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Providers } from './components/providers';
import { Header, Footer } from './components/shell';
import './globals.css';
import { siteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'SplitBrief — From payment instructions to one Solana transaction',
    template: '%s | SplitBrief',
  },
  description:
    'Turn a payment brief into a reviewed draft, sign one atomic Solana Devnet transaction, and independently verify every transfer.',
  applicationName: 'SplitBrief',
  openGraph: {
    title: 'SplitBrief',
    description: 'From payment instructions to one Solana transaction.',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'SplitBrief: one brief, three recipients, one Solana transaction.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SplitBrief',
    description: 'From payment instructions to one Solana transaction.',
  },
  robots: { index: true, follow: true },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>
          <Header />
          <main id="main" className="main-container">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
