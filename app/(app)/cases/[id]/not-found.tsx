import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function CaseNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="eyebrow text-brass-ink">Case not found</p>
      <h1 className="mt-2 font-display text-3xl font-medium text-ink">
        We couldn&apos;t find that case
      </h1>
      <p className="mt-3 text-lg text-ink/85">
        The link may be mistyped, or the case may belong to someone else. For your privacy we
        don&apos;t say which.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/cases">See sample cases</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/check">Start a guided check</Link>
        </Button>
      </div>
    </div>
  );
}
