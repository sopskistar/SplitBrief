import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
const colors = { paper: '#F7F8F5', ink: '#171B23', accent: '#534CE8', lime: '#C8F36A' };
export const runtime = 'nodejs';
export const alt = 'SplitBrief: From payment instructions to one Solana transaction.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default async function Image() {
  const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), 'public/branding/splitbrief-wordmark.png'))).toString('base64')}`;
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: colors.paper,
        color: colors.ink,
        padding: '68px',
        fontFamily: 'sans-serif',
      }}
    >
      <img src={logo} width={390} height={90} alt="SplitBrief" style={{ marginBottom: 54 }} />
      <div
        style={{
          display: 'flex',
          fontSize: 70,
          fontWeight: 600,
          lineHeight: 1.1,
          letterSpacing: '-3px',
          maxWidth: 1020,
        }}
      >
        Pay multiple people in one Solana transaction.
      </div>
      <div style={{ display: 'flex', marginTop: 50, gap: 28, fontSize: 23 }}>
        <span style={{ color: colors.accent }}>Review every recipient. Approve once.</span>
        <span>Solana Devnet</span>
        <span>MLH Hackathon 2026</span>
      </div>
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          right: 0,
          top: 0,
          height: 14,
          width: '100%',
          background: colors.lime,
        }}
      />
    </div>,
    size,
  );
}
