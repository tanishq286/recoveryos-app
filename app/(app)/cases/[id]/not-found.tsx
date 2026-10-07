import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CHECK_CTA } from "@/components/site/cta";

export default function CaseNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 sm:py-28">
      <h1 className="text-3xl leading-tight text-fg sm:text-4xl">
        We couldn&apos;t find that case
      </h1>
      <p className="mt-4 text-lg text-fg-2">
        The link may be mistyped, or the case may belong to someone else. For your privacy we
        don&apos;t say which.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/cases">See sample cases</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/check">{CHECK_CTA}</Link>
        </Button>
      </div>
    </div>
  );
}
