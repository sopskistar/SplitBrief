import batch from '@/public/evidence/devnet-batch.json';
import ai from '@/public/evidence/gemini.json';
import story from '@/demo/STORY.json';
export const batchEvidence = batch;
export const recordedAi = ai;
export const demoStory = story;
export const VIDEO_SRC = '/demo/splitbrief-final-narrated.mp4';
export const POSTER_SRC = '/demo/splitbrief-poster.webp';
export const CAPTIONS_SRC = '/demo/splitbrief-captions.vtt';
export const BATCH_VERIFY_URL = `/verify?signature=${batch.signature}`;
export const FAQ = [
  [
    'Does AI control my wallet?',
    'No. Gemini prepares recipient labels and amounts. Your saved address book supplies destinations, and only you approve the transaction in Phantom.',
  ],
  [
    'Can I edit payments before approving?',
    'Yes. Edit the draft, then check every full address, amount, total and estimated network fee in the final review.',
  ],
  [
    'Why use Solana?',
    'Two or three native SOL transfers fit into one atomic transaction with one wallet approval and an independently inspectable receipt.',
  ],
  [
    'What happens if one transfer fails?',
    'The transaction’s transfer effects are rolled back together. A failed transaction can still incur a network fee.',
  ],
  [
    'Does SplitBrief store private keys?',
    'No. The app never collects or stores your private keys or recovery phrase. Signing stays inside your wallet.',
  ],
  [
    'Is this on Mainnet or Devnet?',
    'This hackathon MVP uses Solana Devnet only. Devnet test SOL has no real financial value.',
  ],
  [
    'Can I verify a transaction without signing in?',
    'Yes. Paste its public Devnet signature into Verify receipt. No wallet connection or account is required. Original-plan matching requires a saved review snapshot.',
  ],
] as const;
