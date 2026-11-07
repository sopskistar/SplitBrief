import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="not-found">
      <span className="badge">404</span>
      <h1>This page didn’t settle here.</h1>
      <p>The payment workspace and signature verifier are ready when you are.</p>
      <div className="button-row">
        <Link href="/" className="button button-primary">
          Back to workspace
        </Link>
        <Link href="/verify" className="button">
          Verify a receipt
        </Link>
      </div>
    </div>
  );
}
