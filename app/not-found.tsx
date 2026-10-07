import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { CHECK_CTA } from "@/components/site/cta";
import { RouteMark } from "@/components/brand/route-mark";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line/70">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <Wordmark />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-20 sm:px-6 sm:py-28">
        <RouteMark variant="lost" className="w-60" />
        <p className="tnum mt-10 font-mono text-sm text-fg-3">404</p>
        <h1 className="mt-3 text-4xl leading-tight text-fg">
          This route doesn&apos;t lead anywhere
        </h1>
        <p className="mt-4 text-lg text-fg-2">
          The link may be old or mistyped. Nothing about any case has changed. Search with{" "}
          <kbd className="rounded-[5px] border border-line px-1.5 py-px font-sans text-sm text-fg-2">
            Ctrl K
          </kbd>{" "}
          or start from one of these.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Go to the home page</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/check">{CHECK_CTA}</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
