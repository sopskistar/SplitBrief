import { ImageResponse } from 'next/og';
export const runtime = 'nodejs';
export const alt = 'SplitBrief: From payment instructions to one Solana transaction.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#F7F8F5',
        color: '#171B23',
        padding: '68px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, marginBottom: 85 }}>
        SplitBrief
      </div>
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
        From payment instructions to one Solana transaction.
      </div>
      <div style={{ display: 'flex', marginTop: 50, gap: 28, fontSize: 23 }}>
        <span style={{ color: '#534CE8' }}>AI drafts. You decide.</span>
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
          background: '#C8F36A',
        }}
      />
    </div>,
    size,
  );
}
