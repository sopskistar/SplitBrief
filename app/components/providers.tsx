'use client';
import { useMemo, type ReactNode } from 'react';
import { createClient } from '@solana/kit';
import { walletSigner } from '@solana/kit-plugin-wallet';
import { ClientProvider, useClient } from '@solana/react';

function createAppClient() {
  return createClient().use(walletSigner({ chain: 'solana:devnet', autoConnect: false }));
}
export type WalletClient = ReturnType<typeof createAppClient>;
export function Providers({ children }: { children: ReactNode }) {
  const client = useMemo(() => createAppClient(), []);
  return <ClientProvider client={client}>{children}</ClientProvider>;
}
export function useWalletClient() {
  return useClient<WalletClient>();
}
