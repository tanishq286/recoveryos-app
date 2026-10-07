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
      <body className="bg-ink-950 text-fg">
        <main className="mx-auto max-w-2xl px-4 py-20" role="alert">
          <h1 className="text-3xl leading-tight">Something went wrong</h1>
          <p className="mt-4 text-lg text-fg-2">
            RecoveryOS couldn&apos;t load. Nothing on any case has changed. Please try again.
          </p>
          {error.digest && (
            <p className="mt-3 text-sm text-fg-3">
              Reference: <span className="font-mono">{error.digest}</span>
            </p>
          )}
          <button
            type="button"
            onClick={() => retry()}
            className="mt-8 min-h-11 rounded-[var(--radius-control)] bg-signal px-5 py-2.5 font-medium text-on-signal transition-transform duration-[160ms] active:scale-[0.97]"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
