"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="eyebrow flex items-center gap-2 text-alert">
        <CircleAlert className="size-4" aria-hidden="true" />
        Something went wrong
      </p>
      <h1 className="mt-2 font-display text-3xl font-medium text-ink">
        This page didn&apos;t load properly
      </h1>
      <p className="mt-3 text-lg text-ink/85">
        Nothing on your case has changed. Try again — if it keeps happening, your case lead can see
        the same information.
      </p>
      {error.digest && (
        <p className="tnum mt-2 text-sm text-slate">Reference for support: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/cases">Back to cases</Link>
        </Button>
      </div>
    </div>
  );
}
