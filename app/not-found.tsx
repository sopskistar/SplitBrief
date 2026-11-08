import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="not-found">
      <h1>Page not found</h1>
      <p>The payment workspace and signature verifier are ready when you are.</p>
      <div className="button-row">
        <Link href="/" className="button button-primary">
          New payment
        </Link>
        <Link href="/verify" className="button">
          Verify a receipt
        </Link>
      </div>
    </div>
  );
}
