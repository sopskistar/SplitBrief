import { spawn } from 'node:child_process';

// Values go through stdin, never command arguments or logs.
const secret = process.env.GEMINI_API_KEY?.trim();
if (!secret)
  throw new Error('Local server-only Gemini key is missing; no production configuration changed.');
const values = {
  GEMINI_API_KEY: secret,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  AI_REQUESTS_ENABLED: process.env.AI_REQUESTS_ENABLED || 'true',
  NEXT_PUBLIC_SOLANA_NETWORK: 'devnet',
  NEXT_PUBLIC_SOLANA_RPC_URL:
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  NEXT_PUBLIC_SITE_URL: 'https://splitbrief-zeta.vercel.app',
};
for (const [name, value] of Object.entries(values)) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      [
        '--yes',
        'vercel',
        'env',
        'add',
        name,
        '--environment',
        'production',
        '--force',
        '--yes',
        name === 'GEMINI_API_KEY' ? '--sensitive' : '--no-sensitive',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.on('error', reject);
    child.on('exit', (code) => resolve({ code, output }));
    child.stdin.end(value);
  });
  if (result.code !== 0)
    throw new Error(
      `Vercel configuration failed for ${name}: ${result.output.replaceAll(secret, '[REDACTED]').slice(-800)}`,
    );
  console.log(
    `Configured ${name} for SplitBrief production (${name === 'GEMINI_API_KEY' ? 'server-only secret' : 'configuration'}).`,
  );
}
