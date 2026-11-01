import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, LockKeyholeIcon } from "lucide-react";

import { api } from "@/lib/api/server";
import { handleApiError } from "@/lib/api/guard";
import type { AdminCompanyListItem } from "@/lib/api/types";

export const metadata: Metadata = { title: "Company files", robots: { index: false } };

/** Staff only: identifiers, registrar and nodal officer contacts for every company. */
export default async function AdminCompaniesPage() {
  let companies: AdminCompanyListItem[];
  try {
    companies = await api<AdminCompanyListItem[]>("admin/companies", { session: true });
  } catch (e) {
    handleApiError(e, "/admin/companies");
  }
  return (
    <div className="mx-auto max-w-[84rem] px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="display text-[clamp(1.75rem,3.6vw,2.5rem)] text-fg">Company files</h1>
      <p className="mt-2 flex items-center gap-2 text-fg-2">
        <LockKeyholeIcon className="size-4 text-signal" aria-hidden="true" />
        Internal. Never shown on public pages or to clients.
      </p>
      <div
        className="panel mt-8 overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Company files"
      >
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="text-fg-3">
            <tr className="border-b border-(--glass-border)">
              {["Company", "CIN", "ISIN", "Registrar", "Nodal officer", ""].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--glass-border)">
            {companies.map((c) => (
              <tr key={c.slug} className="align-top">
                <td className="px-4 py-3 font-medium text-fg">{c.name}</td>
                <td className="px-4 py-3 font-mono text-fg-2">
                  {c.cin ?? "None (statutory body)"}
                </td>
                <td className="px-4 py-3 font-mono text-fg-2">{c.isin ?? "—"}</td>
                <td className="px-4 py-3 text-fg-2">{c.rtaLabel}</td>
                <td className="px-4 py-3 text-fg-2">
                  {c.nodalOfficerName}
                  {c.nodalOfficerEmail && (
                    <span className="block break-all text-fg-3">{c.nodalOfficerEmail}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/companies/${c.slug}`}
                    className="link inline-flex items-center gap-1"
                  >
                    Open
                    <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
