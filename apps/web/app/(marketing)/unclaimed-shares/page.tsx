import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { UnclaimedSearchForm } from "@/components/search/unclaimed-search-form";
import { listCompanies } from "@/lib/companies";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Unclaimed shares by company",
  description:
    "Unclaimed shares and dividends recovered company by company by Finsol Enterprises: bonus and split history, the latest available prices and a free 3-Minute Check.",
  alternates: { canonical: "/unclaimed-shares" },
};

export default async function CompanyIndexPage() {
  const companies = await listCompanies();
  const groups = new Map<string, typeof companies>();
  for (const c of companies) {
    const letter = c.name[0]!.toUpperCase();
    groups.set(letter, [...(groups.get(letter) ?? []), c]);
  }
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="display max-w-[22ch] text-[clamp(2rem,4vw,3rem)] text-fg">
        Unclaimed shares, company by company
      </h1>
      <p className="mt-4 max-w-[62ch] text-lg text-fg-2">
        How bonuses and splits have grown an old holding, and what it is worth today. Pick a
        company, or start the 3-Minute Check with the investor&apos;s name.
      </p>
      <UnclaimedSearchForm className="mt-8 max-w-[56rem]" compact />
      <div className="mt-14 grid gap-10">
        {[...groups.entries()].map(([letter, list]) => (
          <section key={letter} aria-labelledby={`letter-${letter}`}>
            <h2 id={`letter-${letter}`} className="text-sm font-semibold text-fg-3">
              {letter}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/unclaimed-shares/${c.slug}`}
                    className="panel vault-glass-hover group flex h-full flex-col gap-1 p-4 focus-visible:outline-2 focus-visible:outline-signal"
                  >
                    <span className="flex items-center justify-between gap-2 font-semibold text-fg">
                      {c.name}
                      <ArrowRightIcon
                        className="size-4 shrink-0 text-fg-3 transition-transform duration-150 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="text-sm text-fg-2">
                      {c.sector ?? "Listed company"}
                      {c.tickerNse ? ` · NSE: ${c.tickerNse}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
