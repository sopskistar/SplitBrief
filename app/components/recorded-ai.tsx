import { recordedAi as ai } from '@/lib/demo-content';
import { Sparkles } from 'lucide-react';
export function RecordedAiResult() {
  return (
    <section className="panel recorded-ai" id="ai-evidence" aria-labelledby="recorded-ai-title">
      <div className="panel-heading">
        <div className="heading-with-icon">
          <Sparkles size={18} />
          <h2 id="recorded-ai-title">Recorded Gemini result</h2>
        </div>
        <span className="badge">Genuine provider response</span>
      </div>
      <div className="recorded-ai-intro">
        <p>“{ai.instruction}”</p>
        <span className="small muted">
          {ai.model} · recorded API evidence · no wallet addresses generated
        </span>
      </div>
      <table>
        <thead>
          <tr>
            <th scope="col">Recipient</th>
            <th scope="col">Purpose</th>
            <th scope="col">SOL</th>
          </tr>
        </thead>
        <tbody>
          {ai.response.items.map((item) => (
            <tr key={item.recipientLabel}>
              <td>{item.recipientLabel}</td>
              <td>{item.purpose || 'Not specified'}</td>
              <td className="tabular">{item.amountSol}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="proof-provenance small muted">
        Recorded output, not a live request on this page.{' '}
        <a href="/evidence/gemini.json">Read the verified API record.</a>
      </p>
    </section>
  );
}
