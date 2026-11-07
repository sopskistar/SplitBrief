import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyWorkspace } from './verify-workspace';
export const metadata: Metadata = {
  title: 'Verify a receipt',
  description:
    'Independently decode a real Solana Devnet transaction and inspect every native SOL transfer.',
};
export default function VerifyPage() {
  return (
    <Suspense fallback={<p className="loading-preview">Opening the Devnet verifier…</p>}>
      <VerifyWorkspace />
    </Suspense>
  );
}
