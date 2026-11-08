import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Play } from 'lucide-react';
import { DemoVideo } from '../components/demo-video';
import { BatchProof } from '../components/batch-proof';
import { demoStory } from '@/lib/demo-content';
export const metadata: Metadata = {
  title: 'Watch the SplitBrief demo',
  description:
    'Watch a narrated product demo: turn a payment brief into a reviewed draft and inspect a real finalized three-recipient Solana Devnet transaction.',
};
export default function DemoPage() {
  return (
    <>
      <div className="page-intro demo-intro">
        <span className="badge">
          <Play size={12} />
          MLH Solana Hackathon 2026
        </span>
        <h1>SplitBrief, in under two minutes.</h1>
        <p>
          See a payment message become an editable draft, a human-approved transaction and a real
          Solana Devnet receipt.
        </p>
      </div>
      <DemoVideo id="full-demo" />
      <div className="demo-followup">
        <div>
          <h2>What you’ll see</h2>
          <p>
            A small-business payment brief, genuine Gemini interpretation evidence, reviewed
            recipient addresses and a finalized 0.006 SOL payment. Wallet approval remains
            human-controlled.
          </p>
        </div>
        <div className="button-row">
          <Link className="button button-primary" href="/">
            Create payment <ArrowUpRight size={15} />
          </Link>
          <a
            className="button"
            href="https://github.com/sopskistar/SplitBrief"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ArrowUpRight size={15} />
          </a>
        </div>
      </div>
      <BatchProof detailed />
      <section className="demo-transcript" aria-labelledby="transcript-title">
        <h2 id="transcript-title">Accessible transcript</h2>
        <p className="small muted">
          English narration generated with Google Gemini’s prebuilt neural voice. Recorded AI
          results are labeled in the film; no Phantom approval popup is simulated.
        </p>
        {demoStory.scenes.map((scene) => (
          <details key={scene.id}>
            <summary>{scene.heading}</summary>
            <p>{scene.text}</p>
          </details>
        ))}
      </section>
    </>
  );
}
