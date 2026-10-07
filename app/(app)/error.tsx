"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RouteMark } from "@/components/brand/route-mark";

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
    <div role="alert" className="mx-auto max-w-2xl px-4 py-20 sm:px-6 sm:py-28">
      <RouteMark variant="lost" className="w-56" />
      <p className="mt-10 flex items-center gap-2 text-sm font-medium text-fg-2">
        <CircleAlertIcon className="size-4 text-blocker" aria-hidden="true" />
        Something went wrong on our side
      </p>
      <h1 className="mt-3 text-3xl leading-tight text-fg sm:text-4xl">
        This page didn&apos;t load properly
      </h1>
      <p className="mt-4 text-lg text-fg-2">
        Nothing on your case has changed. Try again. If it keeps happening, your case lead can see
        the same information.
      </p>
      {error.digest && (
        <p className="tnum mt-3 text-sm text-fg-3">
          Reference for support: <span className="font-mono text-fg-2">{error.digest}</span>
        </p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/cases">Back to cases</Link>
        </Button>
      </div>
    </div>
  );
}
