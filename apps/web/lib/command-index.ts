import "server-only";

import { getDataSource } from "@/lib/data";
import { CATEGORY_LABELS } from "@/lib/labels";
import { stateInfo } from "@/lib/rules/case-states";
import { OFFICIAL_LINKS } from "@/lib/sources";

export type CommandGroup =
  "Actions" | "Pages" | "Sample cases" | "Evidence rooms" | "Documents" | "Details";
export type CommandKind = "action" | "page" | "case" | "room" | "document" | "detail" | "external";

export interface CommandItem {
  id: string;
  group: CommandGroup;
  kind: CommandKind;
  title: string;
  hint?: string;
  href: string;
  /** Extra words that should match, e.g. a folio number or status. */
  keywords: string[];
}

const PAGES: CommandItem[] = [
  {
    id: "page:home",
    group: "Pages",
    kind: "page",
    title: "Home",
    href: "/",
    keywords: ["landing", "start"],
  },
  {
    id: "page:check",
    group: "Pages",
    kind: "page",
    title: "Guided check",
    hint: "About 3 minutes, no sign-up",
    href: "/check",
    keywords: ["triage", "eligibility", "route"],
  },
  {
    id: "page:cases",
    group: "Pages",
    kind: "page",
    title: "Sample cases",
    href: "/cases",
    keywords: ["demo", "list"],
  },
  {
    id: "page:how",
    group: "Pages",
    kind: "page",
    title: "How it works",
    href: "/#how-it-works",
    keywords: ["evidence room", "engine", "trust"],
  },
  {
    id: "page:dont",
    group: "Pages",
    kind: "page",
    title: "What we don't do",
    href: "/#what-we-dont-do",
    keywords: ["otp", "guarantee", "safety"],
  },
  {
    id: "page:pricing",
    group: "Pages",
    kind: "page",
    title: "Pricing",
    hint: "10% of what is credited, nothing upfront",
    href: "/#pricing",
    keywords: ["fee", "cost", "success fee"],
  },
];

/**
 * Everything the command palette can reach. Built on the server from the same
 * data source the pages read, so it never lists anything a page would not show.
 * With a real data source this must be scoped to the signed-in viewer.
 */
export async function buildCommandIndex(): Promise<CommandItem[]> {
  const data = getDataSource();
  const cases = await data.listCases();
  const rooms = await Promise.all(cases.map((c) => data.getEvidenceRoom(c.id)));

  const items: CommandItem[] = [
    {
      id: "action:check",
      group: "Actions",
      kind: "action",
      title: "Start the 3-minute check",
      href: "/check",
      keywords: ["begin", "new", "eligibility"],
    },
    {
      id: "action:fraud",
      group: "Actions",
      kind: "external",
      title: "Report a fraud attempt",
      hint: OFFICIAL_LINKS.cybercrime.label,
      href: OFFICIAL_LINKS.cybercrime.href,
      keywords: ["scam", "cyber crime", "1930", "police"],
    },
    ...PAGES,
  ];

  for (const c of cases) {
    items.push({
      id: `case:${c.id}`,
      group: "Sample cases",
      kind: "case",
      title: c.title,
      hint: `${c.reference}, ${stateInfo(c.status).label}`,
      href: `/cases/${c.id}`,
      keywords: [c.reference, c.claimantName, ...c.issuerNames, stateInfo(c.status).label],
    });
  }

  rooms.forEach((room, i) => {
    if (!room) return;
    const c = cases[i];
    items.push({
      id: `room:${c.id}`,
      group: "Evidence rooms",
      kind: "room",
      title: `Evidence room, ${c.reference}`,
      hint: `${room.files.length} document${room.files.length === 1 ? "" : "s"}`,
      href: `/cases/${c.id}/evidence`,
      keywords: [c.title, "documents", "proof", "checksum"],
    });
    for (const f of room.files) {
      items.push({
        id: `doc:${f.id}`,
        group: "Documents",
        kind: "document",
        title: f.fileName,
        hint: `${CATEGORY_LABELS[f.category]}, ${c.reference}`,
        href: `/cases/${c.id}/evidence?doc=${f.id}#doc-detail`,
        keywords: [CATEGORY_LABELS[f.category], c.reference, f.sha256.slice(0, 8)],
      });
    }
    // Each detail read from a document, by its label only. Values (folio
    // numbers, PAN and the like) stay out of the index, which every page
    // carries; the link opens the detail beside its proof.
    const names = new Map(room.files.map((f) => [f.id, f.fileName]));
    for (const field of room.fields) {
      const fileName = names.get(field.evidenceFileId);
      if (!fileName) continue;
      items.push({
        id: `field:${field.id}`,
        group: "Details",
        kind: "detail",
        title: field.label,
        hint: `${fileName}, ${c.reference}`,
        href: `/cases/${c.id}?doc=${field.evidenceFileId}#field-${field.id}`,
        keywords: [fileName, c.reference, c.title],
      });
    }
  });

  return items;
}
