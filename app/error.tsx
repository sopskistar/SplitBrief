'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="not-found">
      <h1>The workspace couldn’t load.</h1>
      <p>
        No payment is sent automatically. Reload the workspace, then check any submitted signature
        before paying again.
      </p>
      <button className="button button-primary" onClick={reset}>
        Try loading again
      </button>
    </div>
  );
}
