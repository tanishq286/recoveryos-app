"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { m } from "framer-motion";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CompassIcon,
  FileTextIcon,
  FolderOpenIcon,
  HistoryIcon,
  RouteIcon,
  SearchIcon,
  ShieldAlertIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { CommandItem, CommandKind } from "@/lib/command-index";
import { cn } from "@/lib/utils";

export const OPEN_EVENT = "recoveryos:command-palette";
const RECENT_KEY = "recoveryos:recent-commands";
const MAX_RECENT = 4;

const KIND_ICON: Record<CommandKind, LucideIcon> = {
  action: ArrowRightIcon,
  page: CompassIcon,
  case: RouteIcon,
  room: FolderOpenIcon,
  document: FileTextIcon,
  external: ArrowUpRightIcon,
};

/* ------------------------------------------------------------- matching */

function normalise(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ");
}

/** Score an item against the query: whole-word hits beat substrings beat subsequences. */
function score(item: CommandItem, terms: string[]): number {
  if (terms.length === 0) return 1;
  const title = normalise(item.title);
  const rest = normalise([item.hint ?? "", ...item.keywords].join(" "));
  let total = 0;
  for (const t of terms) {
    if (title.startsWith(t)) total += 6;
    else if (new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(title)) total += 4;
    else if (title.includes(t)) total += 3;
    else if (rest.includes(t)) total += 2;
    else if (isSubsequence(t, title)) total += 1;
    else return 0;
  }
  return total;
}

function isSubsequence(needle: string, hay: string) {
  let i = 0;
  for (const ch of hay) if (ch === needle[i]) i++;
  return i === needle.length;
}

/* -------------------------------------------------------------- recents */

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function pushRecent(id: string) {
  try {
    const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: recents are a convenience only */
  }
}

/* --------------------------------------------------------- platform key */

const subscribeNever = () => () => {};
export function useModKey(): string {
  return useSyncExternalStore(
    subscribeNever,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl "),
    () => "⌘",
  );
}

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/* ----------------------------------------------------------------- view */

interface Row {
  item: CommandItem;
  group: string;
}

export function CommandPalette({ items }: { items: CommandItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const ids = useId();

  const openPalette = useCallback(() => {
    setRecent(readRecent());
    setQuery("");
    setActive(0);
    setOpen(true);
  }, []);

  // ⌘K / Ctrl+K anywhere, and the header buttons, open the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) setOpen(false);
        else openPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, openPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, openPalette);
    };
  }, [open, openPalette]);

  const rows: Row[] = useMemo(() => {
    const terms = normalise(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      const byId = new Map(items.map((i) => [i.id, i]));
      const recents = recent.map((id) => byId.get(id)).filter((x): x is CommandItem => !!x);
      const recentIds = new Set(recents.map((r) => r.id));
      return [
        ...recents.map((item) => ({ item, group: "Recent" })),
        ...items
          .filter((i) => !recentIds.has(i.id) && i.kind !== "document")
          .map((item) => ({ item, group: item.group }))
          .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)),
      ];
    }
    return items
      .map((item) => ({ item, s: score(item, terms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 24)
      .map(({ item }) => ({ item, group: item.group }))
      .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
  }, [items, query, recent]);

  const safeActive = rows.length === 0 ? -1 : Math.min(active, rows.length - 1);

  // Keep the active row in view while arrowing through the list.
  useLayoutEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${safeActive}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [safeActive, rows, open]);

  function run(item: CommandItem) {
    pushRecent(item.id);
    setOpen(false);
    if (item.kind === "external") {
      window.open(item.href, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (rows.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((safeActive + 1) % rows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((safeActive - 1 + rows.length) % rows.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(rows.length - 1);
    } else if (e.key === "Enter" && safeActive >= 0) {
      e.preventDefault();
      run(rows[safeActive].item);
    }
  }

  const listId = `${ids}-list`;
  const optionId = (i: number) => `${ids}-opt-${i}`;
  const mod = useModKey();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-(--scrim) backdrop-blur-xl data-[state=open]:animate-[settle_200ms_var(--ease-out)_both]" />
        <DialogPrimitive.Content
          aria-describedby={`${ids}-help`}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            document.getElementById(`${ids}-input`)?.focus();
          }}
          className="vault-glass fixed top-[max(1rem,12vh)] left-1/2 z-[var(--z-overlay)] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[20px] shadow-(--overlay) data-[state=open]:animate-rise"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-(image:--specular)"
          />
          <DialogPrimitive.Title className="sr-only">Search RecoveryOS</DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-(--glass-border) px-4">
            <SearchIcon className="size-5 shrink-0 text-signal" aria-hidden="true" />
            <input
              id={`${ids}-input`}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={safeActive >= 0 ? optionId(safeActive) : undefined}
              aria-label="Search pages, cases and documents"
              placeholder="Search pages, cases, documents"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              className="h-14 min-w-0 flex-1 bg-transparent text-base text-fg placeholder:text-fg-3 focus:outline-none"
            />
            <kbd className="hidden rounded-[6px] border border-(--glass-border) bg-(--glass-elevated) px-1.5 py-0.5 font-sans text-xs text-fg-3 sm:inline">
              Esc
            </kbd>
          </div>

          <m.div
            ref={listRef}
            layoutScroll
            id={listId}
            role="listbox"
            aria-label="Results"
            className="relative max-h-[min(26rem,60vh)] overflow-y-auto overscroll-contain p-2"
          >
            {rows.length === 0 ? (
              <p className="relative px-3 py-8 text-center text-base text-fg-3">
                Nothing matches &ldquo;{query}&rdquo;. Try a case reference such as RC-2026-0147, or
                a document name.
              </p>
            ) : (
              rows.map((row, i) => {
                // Fraud reporting reads as a safety action, not just another link.
                const isFraud = row.item.id === "action:fraud";
                const Icon =
                  row.group === "Recent"
                    ? HistoryIcon
                    : isFraud
                      ? ShieldAlertIcon
                      : KIND_ICON[row.item.kind];
                const isActive = i === safeActive;
                const showHeading = i === 0 || rows[i - 1].group !== row.group;
                return (
                  <div key={`${row.group}:${row.item.id}`}>
                    {showHeading && (
                      <p
                        aria-hidden="true"
                        className="relative px-3 pt-3 pb-1.5 text-xs font-medium text-fg-3 first:pt-1"
                      >
                        {row.group}
                      </p>
                    )}
                    <div
                      id={optionId(i)}
                      role="option"
                      aria-selected={isActive}
                      data-index={i}
                      onPointerMove={() => i !== safeActive && setActive(i)}
                      onClick={() => run(row.item)}
                      className="relative flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] px-3 py-2"
                    >
                      {/* One highlight that springs from row to row. */}
                      {isActive && (
                        <m.span
                          layoutId={`${ids}-highlight`}
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 rounded-[var(--radius-control)] bg-signal-wash shadow-[inset_0_0_0_1px_var(--color-vault-border-highlight)]"
                        />
                      )}
                      <Icon
                        className={cn(
                          "relative size-[1.125rem] shrink-0 transition-colors duration-[160ms]",
                          isFraud ? "text-blocker" : isActive ? "text-signal" : "text-fg-3",
                        )}
                        aria-hidden="true"
                      />
                      <span className="relative min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem] text-fg">
                          {row.item.title}
                        </span>
                        {row.item.hint && (
                          <span className="block truncate text-sm text-fg-3">{row.item.hint}</span>
                        )}
                      </span>
                      <span className="sr-only">, {row.group}</span>
                      <ArrowRightIcon
                        aria-hidden="true"
                        className={cn(
                          "relative size-4 shrink-0 text-signal transition-[opacity,transform] duration-[160ms] ease-(--ease-out)",
                          isActive ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0",
                        )}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </m.div>

          <p
            id={`${ids}-help`}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-(--glass-border) px-4 py-2.5 text-xs text-fg-3"
          >
            <span>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move
            </span>
            <span>
              <Kbd>Enter</Kbd> to open
            </span>
            <span className="ml-auto hidden sm:inline">
              <Kbd>{mod}K</Kbd> anywhere
            </span>
          </p>
          <p aria-live="polite" className="sr-only">
            {query ? `${rows.length} result${rows.length === 1 ? "" : "s"}` : ""}
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const GROUP_ORDER = ["Recent", "Actions", "Sample cases", "Evidence rooms", "Documents", "Pages"];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-[5px] border border-(--glass-border) bg-(--glass-elevated) px-1.5 py-px font-sans text-xs text-fg-2">
      {children}
    </kbd>
  );
}
