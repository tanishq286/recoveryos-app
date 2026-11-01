"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon, RotateCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { callApi } from "@/lib/api/client";

/** Runs a failed import again from its stored file, as a new job. */
export function RetryImportButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      {error && (
        <span role="alert" className="text-xs text-blocker">
          {error}
        </span>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await callApi(`admin/ingestion/${jobId}/retry`, { method: "POST" });
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
        ) : (
          <RotateCwIcon aria-hidden="true" />
        )}
        Retry
      </Button>
    </span>
  );
}
