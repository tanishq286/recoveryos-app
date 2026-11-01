import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, BRAND_EMAILS, PUBLIC_PRICING } from "@finsol/shared";

export const metadata: Metadata = {
  title: "Terms of use",
  description: `The terms for using ${BRAND.name}'s search, calculator and recovery service.`,
};

const LAST_UPDATED = "1 November 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-fg">{title}</h2>
      <div className="mt-3 space-y-3 text-base text-fg-2">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-[72ch] px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="display text-[clamp(2rem,4vw,2.75rem)] text-fg">Terms of use</h1>
      <p className="mt-3 text-sm text-fg-3">
        Last updated {LAST_UPDATED}. These terms are under review by {BRAND.name} and may be
        updated; the current version is always on this page.
      </p>

      <Section title="Who we are">
        <p>
          {BRAND.name} is an independent firm that helps families recover unclaimed shares and
          dividends. We are not a government body, a registrar or the IEPF Authority, and we do
          not give legal, tax or investment advice.
        </p>
      </Section>

      <Section title="Search results">
        <p>
          Our search covers only the records we have imported from statements companies publish.
          It does not cover every company or every year. A result is a lead to check, not proof
          that a person owns a holding, and no result does not mean there is nothing to recover.
          Names alike are not the same person: identity is confirmed only during verification.
        </p>
      </Section>

      <Section title="Estimates">
        <p>
          Values shown in search results, the calculator and valuation reports are estimates.
          They use the latest market price available to us, which can be delayed, and the
          corporate actions on our records, which can be incomplete. The amount recovered is
          fixed only when shares or money are credited. Past dividends shown are not confirmed
          unpaid amounts.
        </p>
      </Section>

      <Section title="Fees">
        <p>
          {PUBLIC_PRICING.headline}: {PUBLIC_PRICING.detail} Your fee for a case is set out in
          the Digital Mandate you accept before we file anything, and is payable only from value
          actually credited.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          Sign in only with your own mobile number and give accurate details. Never share a
          sign-in code with anyone, including our staff. We may close accounts used to look up
          other people&apos;s holdings without their authority.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms:{" "}
          <a className="link" href={`mailto:${BRAND_EMAILS.info}`}>
            {BRAND_EMAILS.info}
          </a>
          . How we handle personal data is described in our{" "}
          <Link className="link" href="/privacy">
            privacy notice
          </Link>
          .
        </p>
      </Section>
    </article>
  );
}
