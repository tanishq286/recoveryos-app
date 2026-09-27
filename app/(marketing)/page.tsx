import Link from "next/link";
import {
  ArrowRight,
  Ban,
  ExternalLink,
  FileSearch,
  Route,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeroReceipt } from "@/components/marketing/hero-receipt";
import { OFFICIAL_LINKS } from "@/lib/sources";
import { formatBps, formatPaise, shareOfPaise } from "@/lib/format";
import { PROTECTION_ALLOCATION_BPS, SUCCESS_FEE_BPS, VALUATION_RULE } from "@/lib/pricing";

const PILLARS: { n: string; title: string; Icon: LucideIcon; body: string; detail: string[] }[] = [
  {
    n: "I",
    title: "Evidence room",
    Icon: FileSearch,
    body: "Every document you share is fingerprinted, sorted and read field by field.",
    detail: [
      "Each detail shows the page it came from and how sure we are.",
      "You approve or correct it before anything is filed.",
      "When a detail isn't there, we say so. We never fill a gap with a guess.",
    ],
  },
  {
    n: "II",
    title: "Recovery engine",
    Icon: Route,
    body: "Versioned rules choose the route and keep the case moving.",
    detail: [
      "IEPF-5, the company's registrar, or a person's review for heir claims.",
      "Every deadline, follow-up and query is tracked.",
      "Every step has a named owner and a date.",
    ],
  },
  {
    n: "III",
    title: "Trust layer",
    Icon: ShieldCheck,
    body: "You can see — and prove — what happened, when, and who did it.",
    detail: [
      "Consent you can withdraw at any time.",
      "An audit log of every action on your case.",
      "Your documents are never used for anything but your case.",
    ],
  },
];

const DONTS = [
  {
    title: "We never ask for OTPs, passwords or PINs",
    body: "Not for your bank, your demat account, EPFO, or UPI. Not by phone, WhatsApp or email. Anyone who asks is not us.",
  },
  {
    title: "We never guarantee recovery",
    body: "The company verifies the claim and the IEPF Authority decides. We tell you what we know, and what we don't.",
  },
  {
    title: "We don't charge a filing fee — there isn't one",
    body: "IEPF Form 5 has zero government filing fee. Anyone charging you a “government fee” to file it is misleading you.",
  },
  {
    title: "We never hold your shares or money",
    body: "IEPF credits shares straight to your own demat account and refunds straight to your own bank account.",
  },
  {
    title: "We don't file anything you haven't approved",
    body: "You see every page of the claim pack before it is signed or sent.",
  },
  {
    title: "We don't sell or share your data",
    body: "Your documents are used for your case only, under the consent you give, and deleted or returned when it closes.",
  },
];

const SIDE_BY_SIDE: {
  step: string;
  free: { text: string; link?: { label: string; href: string } };
  paid: string;
}[] = [
  {
    step: "Find out if your shares went to IEPF",
    free: {
      text: "Search by the holder's name and the company.",
      link: { label: "IEPF Authority search", href: OFFICIAL_LINKS.iepfSearch.href },
    },
    paid: "Guided check, then we ask the company's registrar for an entitlement letter confirming what moved and when.",
  },
  {
    step: "File the claim",
    free: {
      text: "Fill Form IEPF-5 online. No government filing fee.",
      link: { label: "MCA portal", href: OFFICIAL_LINKS.mcaIepf5.href },
    },
    paid: "We prepare IEPF-5, the indemnity bond and the advance receipt from your checked documents. You approve every page.",
  },
  {
    step: "Company verification",
    free: {
      text: "Send the signed pack to the company's nodal officer and follow up yourself.",
    },
    paid: "We send it, track delivery, and chase — with a named owner and a next date always on screen.",
  },
  {
    step: "Queries and complaints",
    free: {
      text: "If a listed company or registrar stops responding, complain for free.",
      link: { label: "SEBI SCORES", href: OFFICIAL_LINKS.sebiScores.href },
    },
    paid: "We draft replies to queries for you to sign, and escalate on SCORES with you when needed.",
  },
];

const EXAMPLE_PAISE = 2_00_000 * 100;

function ExternalA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
    >
      {children}
      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export default function LandingPage() {
  const fee = shareOfPaise(EXAMPLE_PAISE, SUCCESS_FEE_BPS);
  const protection = shareOfPaise(EXAMPLE_PAISE, PROTECTION_ALLOCATION_BPS);

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section aria-labelledby="hero-heading" className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-16">
          <div>
            <p className="eyebrow text-brass-ink">Unclaimed shares &amp; dividends · India</p>
            <h1
              id="hero-heading"
              className="mt-5 font-display text-[2.6rem] leading-[1.05] font-normal tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]"
            >
              Find the path back to your assets. <span className="text-slate">See every step.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/85">
              Shares and dividends moved to the government&apos;s Investor Education and Protection
              Fund (IEPF) are still yours. We organise your documents, prepare the claim for your
              approval, and show you who is holding each step — and until when.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Button asChild size="lg">
                <Link href="/check">
                  Start the 3-minute guided check
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Link
                href="/cases/rc-2026-0147"
                className="inline-flex min-h-11 items-center text-base font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
              >
                See a sample case
              </Link>
            </div>
            <ul className="mt-8 grid gap-2 text-base text-slate sm:grid-cols-3 sm:gap-4">
              <li className="border-l-2 border-brass/60 pl-3">No upfront fee</li>
              <li className="border-l-2 border-brass/60 pl-3">Never asks for OTPs</li>
              <li className="border-l-2 border-brass/60 pl-3">No sign-up to check</li>
            </ul>
          </div>
          <HeroReceipt />
        </div>
      </section>

      {/* ---------------------------------------------------- what is IEPF */}
      <section aria-labelledby="iepf-heading" className="border-b border-line bg-pearl">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] md:gap-12">
          <h2
            id="iepf-heading"
            className="font-display text-3xl leading-tight font-medium text-ink"
          >
            Why shares end up with IEPF
          </h2>
          <div className="space-y-4 text-lg leading-relaxed text-ink/90">
            <p>
              When a dividend goes unclaimed for seven years in a row, the company must move the
              shares — and the unclaimed dividends — to the IEPF. It happens to people who moved
              house, changed their name, or inherited certificates in an old file.
            </p>
            <p>
              The shares are not lost. Getting them back means filing Form IEPF-5, sending signed
              documents to the company, and waiting while the company and the IEPF Authority verify
              the claim. It is slow and paper-heavy, and small mismatches send it back.{" "}
              <span className="font-medium text-ink">That is the part we carry.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- how it works */}
      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        className="scroll-mt-4 border-b border-line"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="eyebrow text-brass-ink">How it works</p>
          <h2
            id="how-heading"
            className="mt-3 max-w-2xl font-display text-4xl leading-tight font-medium text-ink"
          >
            One room for the evidence. One engine for the route. A record you can trust.
          </h2>
          <ol className="mt-12 grid gap-6 lg:grid-cols-3 lg:gap-0">
            {PILLARS.map((p, i) => (
              <li
                key={p.title}
                className="relative rounded-lg border border-line bg-pearl p-6 lg:rounded-none lg:border-y lg:border-r-0 lg:border-l lg:first:rounded-l-lg lg:last:rounded-r-lg lg:last:border-r"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-display text-3xl font-light text-brass-ink"
                    aria-hidden="true"
                  >
                    {p.n}
                  </span>
                  <p.Icon className="size-6 text-ink" aria-hidden="true" />
                </div>
                <h3 className="mt-6 font-display text-2xl font-medium text-ink">
                  <span className="sr-only">Step {i + 1}: </span>
                  {p.title}
                </h3>
                <p className="mt-2 text-lg text-ink/90">{p.body}</p>
                <ul className="mt-4 space-y-2 border-t border-line pt-4">
                  {p.detail.map((d) => (
                    <li key={d} className="text-base text-slate">
                      {d}
                    </li>
                  ))}
                </ul>
                {i < PILLARS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 -right-3.5 z-10 hidden size-7 -translate-y-1/2 place-items-center rounded-full border border-line bg-ivory text-brass-ink lg:grid"
                  >
                    <ArrowRight className="size-4" />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------- what we don't do */}
      <section
        id="what-we-dont-do"
        aria-labelledby="dont-heading"
        className="scroll-mt-4 border-b border-line bg-pearl"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
            <div>
              <p className="eyebrow text-brass-ink">Plainly</p>
              <h2
                id="dont-heading"
                className="mt-3 font-display text-4xl leading-tight font-medium text-ink"
              >
                What we don&apos;t do
              </h2>
              <p className="mt-4 text-lg text-ink/85">
                Recovery attracts people who promise too much. These are the lines we hold, in
                writing.
              </p>
            </div>
            <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {DONTS.map((d) => (
                <li key={d.title} className="flex gap-3">
                  <Ban className="mt-1 size-5 shrink-0 text-ink" aria-hidden="true" />
                  <div>
                    <h3 className="font-sans text-lg font-semibold text-ink">{d.title}</h3>
                    <p className="mt-1 text-base text-ink/85">{d.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* --------------------------------------------- free routes vs ours */}
      <section
        id="do-it-yourself"
        aria-labelledby="diy-heading"
        className="scroll-mt-4 border-b border-line"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="eyebrow text-brass-ink">Your choice</p>
          <h2
            id="diy-heading"
            className="mt-3 max-w-3xl font-display text-4xl leading-tight font-medium text-ink"
          >
            You can do all of this yourself, for free. Here is how.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-ink/85">
            Every official route sits next to what we would do for you. Pay us only if the time,
            paperwork and follow-up are worth handing over.
          </p>

          <div className="mt-10 hidden overflow-hidden rounded-lg border border-line bg-pearl md:block">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Free official routes compared with RecoveryOS assistance
              </caption>
              <thead>
                <tr className="bg-mist">
                  <th scope="col" className="w-1/4 px-5 py-4 text-base font-semibold text-ink">
                    Step
                  </th>
                  <th scope="col" className="w-[37.5%] px-5 py-4 text-base font-semibold text-ink">
                    Free official route
                  </th>
                  <th scope="col" className="w-[37.5%] px-5 py-4 text-base font-semibold text-ink">
                    With RecoveryOS · paid on success
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {SIDE_BY_SIDE.map((r) => (
                  <tr key={r.step} className="align-top">
                    <th scope="row" className="px-5 py-5 font-display text-lg font-medium text-ink">
                      {r.step}
                    </th>
                    <td className="px-5 py-5 text-base text-ink/90">
                      <p>{r.free.text}</p>
                      {r.free.link && (
                        <p className="mt-2">
                          <ExternalA href={r.free.link.href}>{r.free.link.label}</ExternalA>
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-5 text-base text-ink/90">{r.paid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-8 space-y-4 md:hidden">
            {SIDE_BY_SIDE.map((r) => (
              <li key={r.step} className="rounded-lg border border-line bg-pearl p-5">
                <h3 className="font-display text-xl font-medium text-ink">{r.step}</h3>
                <p className="eyebrow mt-4 text-slate">Free official route</p>
                <p className="mt-1 text-base text-ink/90">{r.free.text}</p>
                {r.free.link && (
                  <p className="mt-1">
                    <ExternalA href={r.free.link.href}>{r.free.link.label}</ExternalA>
                  </p>
                )}
                <p className="eyebrow mt-4 text-slate">With RecoveryOS</p>
                <p className="mt-1 text-base text-ink/90">{r.paid}</p>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <h3 className="font-sans text-base font-semibold text-ink">
              For other unclaimed money — also free
            </h3>
            <ul className="mt-3 grid gap-4 sm:grid-cols-3">
              {[OFFICIAL_LINKS.udgam, OFFICIAL_LINKS.epfo, OFFICIAL_LINKS.mfCentral].map((l) => (
                <li key={l.href} className="rounded-md border border-line bg-pearl p-4">
                  <ExternalA href={l.href}>{l.label.split(" — ")[0]}</ExternalA>
                  <p className="mt-1 text-sm text-slate">{l.label.split(" — ")[1]}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- pricing */}
      <section
        id="pricing"
        aria-labelledby="pricing-heading"
        className="scroll-mt-4 border-b border-line bg-pearl"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="eyebrow text-brass-ink">Pricing</p>
          <h2
            id="pricing-heading"
            className="mt-3 max-w-3xl font-display text-4xl leading-tight font-medium text-ink"
          >
            Paid when you are. Never before.
          </h2>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-ink/25 bg-ivory p-6 sm:p-8">
              <p className="eyebrow text-slate">Success fee</p>
              <p className="tnum mt-2 font-display text-6xl font-light text-ink">
                {formatBps(SUCCESS_FEE_BPS)}
              </p>
              <p className="mt-3 text-lg text-ink">of the value actually credited to you.</p>
              <ul className="mt-5 space-y-2 border-t border-line pt-5 text-base text-ink/90">
                <li>Nothing upfront. Nothing if nothing is recovered.</li>
                <li>Invoiced after credit, plus GST as applicable.</li>
                <li>Stop any time before filing, at no charge.</li>
              </ul>
            </div>
            <div className="rounded-lg border border-dashed border-ink/30 bg-ivory p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <p className="eyebrow text-slate">Protection allocation</p>
                <Badge variant="outline">Planned · conditional</Badge>
              </div>
              <p className="tnum mt-2 font-display text-6xl font-light text-ink">
                {formatBps(PROTECTION_ALLOCATION_BPS)}
              </p>
              <p className="mt-3 text-lg text-ink">
                of the recovery, set aside toward a life or health insurance policy in your name.
              </p>
              <ul className="mt-5 space-y-2 border-t border-line pt-5 text-base text-ink/90">
                <li>
                  Subject to licensed partner availability, your choice and policy issuance. It is
                  not guaranteed cover.
                </li>
                <li>
                  We don&apos;t sell insurance. Any policy would come from an IRDAI-licensed insurer
                  through a licensed intermediary.
                </li>
                <li>If you opt out, or no policy is issued, this 10% stays with you.</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-line bg-ivory p-6 sm:p-8">
            <h3 className="font-display text-2xl font-medium text-ink">
              Worked example: {formatPaise(EXAMPLE_PAISE)} credited to you
            </h3>
            <dl className="tnum mt-5 divide-y divide-line border-y border-line text-base">
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
                <dt className="text-ink">Value credited to your demat and bank account</dt>
                <dd className="font-semibold text-ink">{formatPaise(EXAMPLE_PAISE)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
                <dt className="text-ink">
                  Our success fee ({formatBps(SUCCESS_FEE_BPS)}), invoiced after credit
                </dt>
                <dd className="font-semibold text-ink">{formatPaise(fee)} + GST</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
                <dt className="text-ink">
                  Protection allocation ({formatBps(PROTECTION_ALLOCATION_BPS)}) — only if you
                  choose it and a policy is issued
                </dt>
                <dd className="font-semibold text-ink">
                  {formatPaise(protection)} toward your premium
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
                <dt className="font-semibold text-ink">Yours to keep</dt>
                <dd className="text-right font-semibold text-ink">
                  {formatPaise(EXAMPLE_PAISE - fee - protection)} + the policy
                  <span className="block font-normal text-slate">
                    or {formatPaise(EXAMPLE_PAISE - fee)} if you opt out
                  </span>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-slate">
              {VALUATION_RULE} Illustrative figures; draft terms.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ anti-fraud */}
      <section aria-labelledby="fraud-heading" className="on-ink bg-ink text-ivory">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div>
            <ShieldAlert className="size-8 text-brass" aria-hidden="true" />
            <h2 id="fraud-heading" className="mt-4 font-display text-4xl leading-tight font-medium">
              Protect yourself from recovery fraud
            </h2>
            <p className="mt-4 text-lg text-ivory/85">
              Unclaimed shares attract fake agents. These rules keep you safe — whoever you work
              with.
            </p>
          </div>
          <div>
            <ul className="space-y-4 text-lg">
              {[
                "Nobody can “release” IEPF shares for an upfront fee or a “processing charge”.",
                "The IEPF Authority does not phone people offering refunds.",
                "Never share OTPs, passwords, UPI PINs or your demat login — with anyone, including us.",
                "Never sign blank forms or blank transfer deeds.",
                "We never ask you to pay into a personal bank account or UPI ID. Every genuine message from us also appears in your case room.",
              ].map((t) => (
                <li key={t} className="flex gap-3 border-b border-ivory/15 pb-4">
                  <Ban className="mt-1.5 size-4 shrink-0 text-brass" aria-hidden="true" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-lg">
              If something feels wrong, stop. Report it at{" "}
              <a
                href={OFFICIAL_LINKS.cybercrime.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline decoration-ivory/50 underline-offset-4 hover:decoration-ivory"
              >
                cybercrime.gov.in<span className="sr-only"> (opens in a new tab)</span>
              </a>{" "}
              or call <span className="tnum font-semibold">1930</span>, the national cyber crime
              helpline.
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- closing CTA */}
      <section aria-labelledby="cta-heading">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-20 md:flex-row md:items-end md:justify-between">
          <div>
            <h2
              id="cta-heading"
              className="font-display text-4xl leading-tight font-medium text-ink"
            >
              Three minutes to know your route.
            </h2>
            <p className="mt-3 max-w-xl text-lg text-ink/85">
              Five questions, no sign-up, and a receipt showing exactly what was checked — and what
              wasn&apos;t.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/check">
              Start the guided check
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
