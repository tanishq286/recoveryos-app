import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <Wordmark />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
        <p className="eyebrow text-brass-ink">Page not found</p>
        <h1 className="mt-2 font-display text-4xl font-medium text-ink">
          This page isn&apos;t here
        </h1>
        <p className="mt-3 text-lg text-ink/85">
          The link may be old or mistyped. Nothing about any case has changed.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Go to the home page</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/check">Start the guided check</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
