import type { Metadata } from "next";
import { BRAND } from "@recoveryos/shared";

import { Calculator } from "@/components/calculator/calculator";

export const metadata: Metadata = {
  title: "Family Wealth Calculator for old shares and dividends",
  description:
    "Add every stock your family held: shares today after bonuses and splits, live NSE/BSE value and dividends paid since. Download a Share Valuation Report.",
  alternates: { canonical: "/calculator" },
};

export default function CalculatorPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="display max-w-[22ch] text-[clamp(2rem,4vw,3rem)] text-fg">
        Stock Holding &amp; Dividend Wealth Calculator
      </h1>
      <p className="mt-4 max-w-[62ch] text-lg text-fg-2">
        Bonuses and splits multiply old holdings. Add each stock, the year it was bought and the
        number of shares, and see what the family holds today at the live price.
      </p>
      <p className="mt-2 text-sm font-medium text-signal">{BRAND.promise.join(" • ")}</p>
      <div className="mt-10">
        <Calculator />
      </div>
    </div>
  );
}
