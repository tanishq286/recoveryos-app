"use client";

import { useEffect, useId, useState } from "react";
import { PencilIcon, ReceiptTextIcon } from "lucide-react";

import { HashGlyph } from "@/components/viz/hash-glyph";
import { cn } from "@/lib/utils";

export interface ReceiptRow {
  label: string;
  value: string;
  /** Step index the Edit shortcut jumps to. */
  to: number;
  /** Identifiers are set in mono with slashed zeros. */
  mono?: boolean;
}

async function sha256Hex(text: string): Promise<string | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The review step as a diagnostic receipt: every answer on its own line with
 * an Edit shortcut, and a SHA-256 fingerprint of the answers computed in the
 * browser. The fingerprint is real (change any answer and it changes); it is
 * not a signature and nothing is sent anywhere.
 */
export function DiagnosticReceipt({
  rows,
  onEdit,
  fingerprintOf,
  className,
}: {
  rows: ReceiptRow[];
  onEdit: (step: number) => void;
  /** The exact text that is hashed: the answers the check will run on. */
  fingerprintOf: string;
  className?: string;
}) {
  const ids = useId();
  const [digest, setDigest] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    sha256Hex(fingerprintOf)
      .then((hex) => live && setDigest(hex))
      .catch(() => live && setDigest(null));
    return () => {
      live = false;
    };
  }, [fingerprintOf]);

  return (
    <section aria-labelledby={`${ids}-title`} className={cn("relative", className)}>
      <div className="panel rounded-b-none border-b-0 px-5 pt-5 pb-2 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-(--glass-border) pb-4">
          <h2
            id={`${ids}-title`}
            className="flex items-center gap-2 font-mono text-sm font-medium tracking-[0.08em] text-fg-2 uppercase [font-stretch:100%]"
          >
            <ReceiptTextIcon className="size-4 text-signal" aria-hidden="true" />
            Diagnostic receipt
          </h2>
          <span className="text-sm text-fg-3">Not sent anywhere yet</span>
        </div>

        <dl className="divide-y divide-dashed divide-(--glass-border)">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid gap-1 py-3.5 sm:grid-cols-[13rem_1fr_auto] sm:items-center sm:gap-4"
            >
              <dt className="text-base text-fg-3">{row.label}</dt>
              <dd
                className={cn(
                  "tnum min-w-0 font-medium break-words text-fg",
                  row.mono && "font-mono text-[0.9375rem]",
                )}
              >
                {row.value}
              </dd>
              <dd>
                <button
                  type="button"
                  onClick={() => onEdit(row.to)}
                  className="group inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-base font-medium text-signal transition-colors duration-150 hover:bg-signal-wash sm:-mr-2"
                >
                  <PencilIcon className="size-4" aria-hidden="true" />
                  Edit<span className="sr-only"> {row.label.toLowerCase()}</span>
                </button>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-2 flex items-center gap-4 border-t border-dashed border-(--glass-border) py-4">
          {digest ? (
            <>
              <HashGlyph sha256={digest} className="size-12 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-fg-3">Fingerprint of these answers (SHA-256)</p>
                <p className="tnum mt-0.5 font-mono text-sm break-all text-fg-2">
                  {digest
                    .slice(0, 32)
                    .replace(/(.{4})/g, "$1 ")
                    .trim()}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-fg-3">
              Change any answer with Edit; nothing is sent until you run the check.
            </p>
          )}
        </div>
      </div>
      <div aria-hidden="true" className="receipt-tear" />
    </section>
  );
}
