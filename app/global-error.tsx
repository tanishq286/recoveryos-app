"use client";

import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en-IN">
      <body className="bg-ivory text-ink">
        <main className="mx-auto max-w-2xl px-4 py-16" role="alert">
          <h1 className="font-display text-3xl font-medium">Something went wrong</h1>
          <p className="mt-3 text-lg">
            RecoveryOS couldn&apos;t load. Nothing on any case has changed. Please try again.
          </p>
          {error.digest && <p className="mt-2 text-sm text-slate">Reference: {error.digest}</p>}
          <button
            type="button"
            onClick={() => retry()}
            className="mt-6 min-h-11 rounded-md bg-ink px-5 py-2.5 text-ivory"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
