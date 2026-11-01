import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, BRAND_EMAILS } from "@finsol/shared";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: `What ${BRAND.name} collects, why, who processes it and how to reach us.`,
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

/**
 * Describes what the application actually does today. Items the owner must
 * still confirm (legal entity, grievance officer, retention periods) are
 * listed in docs/privacy-terms-review.md and are not stated here as facts.
 */
export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-[72ch] px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="display text-[clamp(2rem,4vw,2.75rem)] text-fg">Privacy notice</h1>
      <p className="mt-3 text-sm text-fg-3">
        Last updated {LAST_UPDATED}. This notice is under review by {BRAND.name} and may be
        updated; the current version is always on this page.
      </p>

      <Section title="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-fg">When you search:</strong> the name, state and any joint
            holder name you type. We do not store public searches in our database, but our hosting
            provider&apos;s request logs can hold a search&apos;s web address, which contains the
            name typed, for a limited time. Signed-in searches also record the state searched and
            how many records matched, to apply daily limits.
          </li>
          <li>
            <strong className="text-fg">When you sign in:</strong> your full name, mobile number
            and email address, and the network (IP) address the request came from. Sign-in codes
            are stored only as a one-way hash and expire after five minutes.
          </li>
          <li>
            <strong className="text-fg">When you ask us to take up a holding:</strong> the records
            you selected, your relationship to the holder and whether share certificates are
            available.
          </li>
          <li>
            <strong className="text-fg">During a case:</strong> the documents you upload (for
            example PAN, Aadhaar, cancelled cheque or legal-heir papers), which are encrypted
            before storage, and the case history.
          </li>
          <li>
            <strong className="text-fg">Calculator reports:</strong> the holdings you enter and the
            estimate we produced, kept with your account.
          </li>
          <li>
            <strong className="text-fg">Partners:</strong> firm name, profession, city and state,
            and the referral activity linked to your partner code.
          </li>
        </ul>
      </Section>

      <Section title="Where the holder records come from">
        <p>
          The unclaimed-holder records in our search come from statements that companies publish
          under the IEPF Rules. They name shareholders whose dividends or shares went unclaimed. A
          match in these records is not proof of ownership, and no match does not prove that no
          holding exists. We release folio details to a client only after our team has reviewed
          their identity and claim.
        </p>
      </Section>

      <Section title="Why we use it">
        <ul className="list-disc space-y-2 pl-5">
          <li>To sign you in and keep your account secure.</li>
          <li>To trace, verify and recover holdings you ask us to recover.</li>
          <li>To contact you about the holdings you asked us to take up.</li>
          <li>To keep an audit record of who saw or changed sensitive information.</li>
        </ul>
        <p>We do not sell personal data, and we do not use it for advertising.</p>
      </Section>

      <Section title="Who processes it">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-fg">Hosting:</strong> Vercel runs this website and our
            application server.
          </li>
          <li>
            <strong className="text-fg">Database:</strong> Neon stores our database in its
            Singapore (ap-southeast-1) region.
          </li>
          <li>
            <strong className="text-fg">SMS and eSign:</strong> when connected, an SMS provider
            delivers sign-in codes and an eSign provider handles Aadhaar signing. They receive only
            what they need, such as your mobile number or the mandate to be signed.
          </li>
          <li>
            <strong className="text-fg">For your claim:</strong> the company, its registrar and the
            IEPF Authority receive the documents a claim requires.
          </li>
        </ul>
        <p>Share prices come from public market data; no personal data is sent to fetch them.</p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep account, case and audit records while your case is open and afterwards for as
          long as we need them to meet our legal and accounting obligations. If you want your
          account closed or your documents deleted, write to us; we will tell you what we must
          keep and why.
        </p>
      </Section>

      <Section title="Your choices and contact">
        <p>
          To see, correct or delete your information, or to raise a concern, email{" "}
          <a className="link" href={`mailto:${BRAND_EMAILS.support}`}>
            {BRAND_EMAILS.support}
          </a>
          . For claims questions, email{" "}
          <a className="link" href={`mailto:${BRAND_EMAILS.claims}`}>
            {BRAND_EMAILS.claims}
          </a>
          .
        </p>
        <p>
          See also our{" "}
          <Link className="link" href="/terms">
            terms of use
          </Link>
          .
        </p>
      </Section>
    </article>
  );
}
