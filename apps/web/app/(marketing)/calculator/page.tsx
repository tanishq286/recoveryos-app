import type { Metadata } from "next";

import { Calculator } from "@/components/calculator/calculator";
import { getCompany, listCompanies } from "@/lib/companies";

export const metadata: Metadata = {
  title: "Old shares calculator: bonuses, splits, dividends and fees",
  description:
    "What are shares bought decades ago worth today? Apply a company's bonus issues and splits, add seven years of dividends, and see what reaches you after fees.",
  alternates: { canonical: "/calculator" },
};

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const slug = (await searchParams).company ?? "reliance-industries-ltd";
  const [companies, initial] = await Promise.all([listCompanies(), getCompany(slug)]);
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="display max-w-[22ch] text-[clamp(2rem,4vw,3rem)] text-fg">
        What are old shares worth today?
      </h1>
      <p className="mt-4 max-w-[62ch] text-lg text-fg-2">
        Bonuses and splits multiply an old holding. Pick the company, the decade and the number on
        the certificate.
      </p>
      <div className="mt-10">
        <Calculator
          companies={companies.map((c) => ({ slug: c.slug, name: c.name }))}
          initial={initial}
        />
      </div>
    </div>
  );
}
