import Link from 'next/link';
import { ArrowRight, FileText, ShieldCheck, Fingerprint } from 'lucide-react';
import { FAQ } from '@/lib/demo-content';
import { DemoVideo } from './demo-video';
import { BatchProof } from './batch-proof';
export function ProductStory() {
  return (
    <div className="product-story">
      <section className="story-intro" aria-labelledby="problem-title">
        <div>
          <p className="section-kicker">For the people who pay a team</p>
          <h2 id="problem-title">
            Review the whole payment.
            <br />
            Sign once.
          </h2>
        </div>
        <p>
          A small business owner needs to pay a designer, delivery partner and project reserve.
          Instead of repeatedly copying addresses and amounts, they can review the entire payment
          before signing once.
        </p>
      </section>
      <section className="product-demo-section" aria-labelledby="product-demo-title">
        <div>
          <p className="section-kicker">See it in action</p>
          <h2 id="product-demo-title">
            From a payment message
            <br />
            to a verifiable receipt.
          </h2>
          <p>
            Follow the real workflow: a brief, an editable draft, human approval and a finalized
            0.006 SOL Devnet payment.
          </p>
          <Link className="text-button" href="/demo">
            Watch demo and read transcript <ArrowRight size={15} />
          </Link>
        </div>
        <DemoVideo id="homepage-demo" />
      </section>
      <section className="product-benefits" aria-label="Why SplitBrief">
        <div>
          <FileText size={22} />
          <h3>AI organizes the instructions.</h3>
          <p>
            Gemini extracts structured payment details without choosing destinations or controlling
            wallets.
          </p>
        </div>
        <div>
          <Fingerprint size={22} />
          <h3>You remain in control.</h3>
          <p>Review every transfer and approve the final transaction in your own wallet.</p>
        </div>
        <div>
          <ShieldCheck size={22} />
          <h3>Solana verifies the outcome.</h3>
          <p>
            Multiple native payments share one atomic transaction, with an independently inspectable
            result.
          </p>
        </div>
      </section>
      <BatchProof />
      <section className="use-cases" aria-labelledby="use-cases-title">
        <h2 id="use-cases-title">Made for everyday coordination.</h2>
        <ul>
          <li>
            <strong>Freelancers</strong>
            <span>Coordinate payments to project collaborators.</span>
          </li>
          <li>
            <strong>Small teams</strong>
            <span>Split a project’s costs across several recipients.</span>
          </li>
          <li>
            <strong>Community organizers</strong>
            <span>Pay several contributors after an event.</span>
          </li>
        </ul>
        <p className="small muted">Illustrative use cases. SplitBrief is a Devnet hackathon MVP.</p>
      </section>
      <section className="product-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Before your first payment</h2>
        {FAQ.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
