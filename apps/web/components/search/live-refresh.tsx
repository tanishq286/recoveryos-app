"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon, RefreshCwIcon } from "lucide-react";

type LiveEvent =
  | { type: "started" }
  | { type: "done"; filesChecked: number; newRecords: number; updatedRecords: number }
  | { type: "skipped"; reason: string };

/**
 * Listens to the live refresh a search started (server-sent events through
 * this site's /api/v1 proxy) and offers to show newly found records.
 */
export function LiveRefresh({ id }: { id: string }) {
  const router = useRouter();
  const [event, setEvent] = React.useState<LiveEvent>({ type: "started" });
  React.useEffect(() => {
    const source = new EventSource(`/api/v1/search/live/${id}`);
    source.onmessage = (m) => {
      const e = JSON.parse(m.data) as LiveEvent;
      setEvent(e);
      if (e.type !== "started") source.close();
    };
    source.onerror = () => source.close();
    return () => source.close();
  }, [id]);

  if (event.type === "skipped") return null;
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-fg-3" role="status">
      {event.type === "started" ? (
        <>
          <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden="true" />
          Checking for newly filed records…
        </>
      ) : event.newRecords + event.updatedRecords > 0 ? (
        <>
          New records arrived.
          <button
            type="button"
            className="link inline-flex items-center gap-1"
            onClick={() => router.refresh()}
          >
            <RefreshCwIcon className="size-3.5" aria-hidden="true" />
            Show them
          </button>
        </>
      ) : (
        "Records are up to date."
      )}
    </p>
  );
}
