import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BadgeIndianRupeeIcon,
  BanIcon,
  FileCheckIcon,
  FileSearchIcon,
  KeyRoundIcon,
  LockKeyholeIcon,
  RouteIcon,
  ScaleIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricCounter } from "@/components/ui/metric-counter";
import { StatusBadge } from "@/components/ui/status-badge";
import { VaultCard } from "@/components/ui/vault-card";
import { QuickScanBar } from "@/components/marketing/quick-scan-bar";
import { SevenYearRule } from "@/components/marketing/seven-year-rule";
import { caseStatusTone } from "@/components/case/status-tone";
import { DocumentPreview } from "@/components/evidence/document-preview";
import { FieldDataCard } from "@/components/evidence/proof-card";
import { CHECK_CTA } from "@/components/site/cta";
import { HeroReveal } from "@/components/marketing/hero-reveal";
import { RouteField } from "@/components/marketing/route-field";
import { LedgerPrint, RevealBatch, Stages, type Stage } from "@/components/marketing/scroll-choreo";
import { OFFICIAL_LINKS } from "@/lib/sources";
import { getDataSource } from "@/lib/data";
import { stateInfo } from "@/lib/rules/case-states";
import { Magnetic } from "@/components/motion/magnetic";
import { PageTransition } from "@/components/motion/page-transition";
import { RouteTimeline } from "@/components/viz/route-timeline";
import { RouteProgress } from "@/components/viz/route-progress";
import { formatBps, formatDate, formatPaise, shareOfPaise } from "@/lib/format";
import { PROTECTION_ALLOCATION_BPS, SUCCESS_FEE_BPS, VALUATION_RULE } from "@/lib/pricing";

const STAGES: Stage[] = [
  {
    title: "Evidence room",
    icon: <FileSearchIcon />,
    body: "Every document you share is fingerprinted, sorted and read field by field.",
    detail: [
      "Each detail shows the page it came from and how sure we are.",
      "You approve or correct it before anything is filed.",
      "When a detail isn't there, we say so. We never fill a gap with a guess.",
    ],
  },
  {
    title: "Recovery engine",
    icon: <RouteIcon />,
    body: "Versioned rules choose the route and keep the case moving.",
    detail: [
      "IEPF-5, the company's registrar, or a person's review for heir claims.",
      "Every deadline, follow-up and query is tracked.",
      "Every step has a named owner and a date.",
    ],
  },
  {
    title: "Trust layer",
    icon: <ShieldCheckIcon />,
    body: "You can see, and prove, what happened, when, and who did it.",
    detail: [
      "Consent you can withdraw at any time.",
      "An audit log of every action on your case.",
      "Your documents are never used for anything but your case.",
    ],
  },
];

/* The two lines people most need to hear, as large reassurance cards. */
const GUARANTEES = [
  {
    figure: "₹0",
    unit: "upfront, ever",
    title: "Nothing before credit. Nothing if nothing is recovered.",
    body: "Our fee is invoiced only after value reaches your own demat or bank account. IEPF Form 5 itself has zero government filing fee, so anyone charging a “government fee” to file it is misleading you.",
    tone: "success" as const,
  },
  {
    figure: "0",
    unit: "OTPs, passwords or PINs we will ask for",
    title: "Not for your bank, your demat account, EPFO or UPI.",
    body: "Not by phone, WhatsApp or email. Every genuine message from us also appears in your case room. Anyone who asks for a code is not us.",
    tone: "active" as const,
  },
];

const DONTS: { title: string; body: string; Icon: LucideIcon }[] = [
  {
    title: "We never guarantee recovery",
    body: "The company verifies the claim and the IEPF Authority decides. We tell you what we know, and what we don't.",
    Icon: ScaleIcon,
  },
  {
    title: "We never hold your shares or money",
    body: "IEPF credits shares straight to your own demat account and refunds straight to your own bank account.",
    Icon: WalletIcon,
  },
  {
    title: "We don't file anything you haven't approved",
    body: "You see every page of the claim pack before it is signed or sent.",
    Icon: FileCheckIcon,
  },
  {
    title: "We don't sell or share your data",
    body: "Your documents are used for your case only, under the consent you give, and deleted or returned when it closes.",
    Icon: LockKeyholeIcon,
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
    free: { text: "Send the signed pack to the company's nodal officer and follow up yourself." },
    paid: "We send it, track delivery, and chase, with a named owner and a next date always on screen.",
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

const FRAUD_RULES = [
  "Nobody can “release” IEPF shares for an upfront fee or a “processing charge”.",
  "The IEPF Authority does not phone people offering refunds.",
  "Never share OTPs, passwords, UPI PINs or your demat login, with anyone, including us.",
  "Never sign blank forms or blank transfer deeds.",
  "We never ask you to pay into a personal bank account or UPI ID. Every genuine message from us also appears in your case room.",
];

const SAMPLE_CASE_ID = "rc-2026-0147";
const EXAMPLE_PAISE = 2_00_000 * 100;

function ExternalA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="link inline-flex items-center gap-1 font-medium"
    >
      {children}
      <ArrowUpRightIcon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export default async function LandingPage() {
  const fee = shareOfPaise(EXAMPLE_PAISE, SUCCESS_FEE_BPS);
  const protection = shareOfPaise(EXAMPLE_PAISE, PROTECTION_ALLOCATION_BPS);
  // The product preview is the real sample case, read through the same data layer.
  const data = getDataSource();
  const [sample, room] = await Promise.all([
    data.getCase(SAMPLE_CASE_ID),
    data.getEvidenceRoom(SAMPLE_CASE_ID),
  ]);
  // The teaser's document: the one with a detail waiting for the claimant.
  const teaserField =
    room?.fields.find((f) => f.reviewStatus === "pending" && f.needsClientCheck && f.value) ??
    room?.fields.find((f) => f.sourceSnippet) ??
    null;
  const teaserFile = teaserField
    ? room?.files.find((f) => f.id === teaserField.evidenceFileId)
    : null;
  // Three details read from that document, as extraction snippets.
  const teaserFields =
    teaserFile && room
      ? room.fields
          .filter((f) => f.evidenceFileId === teaserFile.id && f.value !== null)
          .slice(0, 3)
      : [];

  return (
    <PageTransition>
      {/* The first viewport: the promise, a quick start, and the route drawing. */}
      <section
        aria-labelledby="hero-heading"
        className="relative isolate overflow-hidden border-b border-(--glass-border)"
      >
        <div aria-hidden="true" className="hero-mesh pointer-events-none absolute inset-0 -z-10" />
        <div className="relative mx-auto grid max-w-[1200px] px-4 pt-12 pb-12 sm:px-6 sm:pt-16 lg:min-h-[min(820px,calc(100dvh-4rem))] lg:grid-cols-12 lg:items-center lg:pt-14 lg:pb-20">
          <HeroReveal className="relative z-10 lg:col-span-7">
            <p
              data-hero-reveal
              data-hero-follow
              className="inline-flex items-center gap-2 rounded-full border border-(--glass-border) bg-(--glass-elevated) px-3 py-1 text-sm text-fg-2 shadow-(--glass-rim) backdrop-blur-md"
            >
              <span aria-hidden="true" className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-cyan opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-brand-cyan" />
              </span>
              IEPF claims, prepared with you
            </p>
            <h1
              id="hero-heading"
              data-hero-reveal
              data-hero-heading
              className="display mt-6 max-w-[15ch] text-[clamp(2.5rem,5.6vw,4.75rem)] text-fg"
            >
              <span className="text-gradient-cyan">Find the path back to your assets.</span>{" "}
              <span className="text-fg-3">See every step.</span>
            </h1>
            <p
              data-hero-reveal
              data-hero-follow
              className="mt-6 max-w-[44ch] text-lg leading-relaxed text-fg-2"
            >
              Shares moved to the IEPF are still yours. We prepare the claim with you and show who
              holds each step.
            </p>
            <div data-hero-reveal data-hero-follow className="mt-8 max-w-[44rem]">
              <QuickScanBar />
            </div>
            <div data-hero-reveal data-hero-follow className="mt-4">
              <Link
                href={`/cases/${SAMPLE_CASE_ID}`}
                transitionTypes={["nav-forward"]}
                className="inline-flex min-h-11 items-center gap-1.5 text-base font-medium text-fg-2 underline decoration-fg/30 underline-offset-[0.22em] transition-[color,text-decoration-color] duration-150 hover:text-fg hover:decoration-signal"
              >
                Or see a sample case first
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </HeroReveal>
          <RouteField className="mt-10 h-64 [mask-image:linear-gradient(to_bottom,black_70%,transparent)] sm:h-80 lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:h-auto lg:w-[60%] lg:[mask-image:linear-gradient(to_right,transparent,black_34%)]" />
        </div>
      </section>

      {/* Three plain facts, directly under the hero, not inside it. */}
      <section aria-label="In short" className="border-b border-(--glass-border) bg-ink-900/50">
        <ul className="mx-auto grid max-w-[1200px] divide-y divide-(--glass-border) px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6">
          {(
            [
              ["No upfront fee", BadgeIndianRupeeIcon],
              ["We never ask for OTPs", KeyRoundIcon],
              ["No sign-up to check", UserCheckIcon],
            ] as const
          ).map(([f, Icon]) => (
            <li
              key={f}
              className="flex items-center gap-3 py-5 text-base text-fg-2 sm:px-6 sm:first:pl-0"
            >
              <Icon className="size-[1.125rem] shrink-0 text-signal" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
      </section>

      {/* Why shares end up with IEPF: one editorial statement. */}
      <section aria-labelledby="iepf-heading">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-24 sm:px-6 md:py-32 lg:grid-cols-12 lg:items-center lg:gap-10">
          <div className="lg:col-span-7">
            <h2
              id="iepf-heading"
              className="max-w-[22ch] text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.12] text-fg"
            >
              When a dividend goes unclaimed for seven years in a row, the company must move the
              shares to the IEPF.
            </h2>
            <div className="mt-10 grid gap-6 text-lg leading-relaxed text-fg-2 md:max-w-[62ch]">
              <p>
                It happens to people who moved house, changed their name, or inherited certificates
                in an old file. The unclaimed dividends go too.
              </p>
              <p>
                The shares are not lost. Getting them back means filing Form IEPF-5, sending signed
                documents to the company, and waiting while the company and the IEPF Authority
                verify the claim. It is slow and paper-heavy, and small mismatches send it back.{" "}
                <span className="text-fg">That is the part we carry.</span>
              </p>
            </div>
          </div>
          <SevenYearRule className="lg:col-span-5" />
        </div>
      </section>

      {/* How it works: one sequence, drawn by scroll. */}
      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        className="scroll-mt-20 border-t border-(--glass-border)"
      >
        <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 md:py-32">
          <h2
            id="how-heading"
            className="max-w-[24ch] text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.1] text-fg"
          >
            One room for the evidence. One engine for the route. A record you can trust.
          </h2>
          <div className="mt-16 lg:mt-20">
            <Stages stages={STAGES} />
          </div>
        </div>
      </section>

      {/* Inside a case: the real sample case, not a mock-up. */}
      {sample && (
        <section aria-labelledby="inside-heading" className="border-t border-(--glass-border)">
          <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-24 sm:px-6 md:py-32 lg:grid-cols-12 lg:gap-10">
            {/* Pinned beside the long case card on screens tall enough to hold it. */}
            <div className="lg:col-span-5 lg:self-start lg:[@media(min-height:860px)]:sticky lg:[@media(min-height:860px)]:top-24">
              <h2
                id="inside-heading"
                className="max-w-[18ch] text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.1] text-fg"
              >
                Every step has an owner and a date. Here is one case.
              </h2>
              <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-fg-2">
                This is the sample case exactly as its claimant sees it: where the time went, what
                was read from each document, and who holds the next step. The people and company are
                fictional.
              </p>
              <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-(--glass-border) pt-8">
                <div className="col-span-2">
                  <dt className="text-sm text-fg-3">Indicative value at stake</dt>
                  <dd className="display text-gradient-cyan tnum mt-1 text-[clamp(2.25rem,4vw,3.25rem)]">
                    {sample.quote.indicativeValuePaise !== null ? (
                      <MetricCounter
                        value={sample.quote.indicativeValuePaise}
                        kind="paise"
                        duration={1.4}
                      />
                    ) : (
                      "Not estimated yet"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-fg-3">Stage</dt>
                  <dd className="mt-1 text-base text-fg">{stateInfo(sample.status).label}</dd>
                </div>
                <div>
                  <dt className="text-sm text-fg-3">Waiting for</dt>
                  <dd className="mt-1 text-base text-fg">
                    {sample.nextStep.owner.role === "client"
                      ? "The claimant"
                      : sample.nextStep.owner.name}
                  </dd>
                </div>
              </dl>
              <div className="mt-10">
                <Button asChild variant="outline" size="lg">
                  <Link href={`/cases/${sample.id}`} transitionTypes={["nav-forward"]}>
                    Open the sample case
                    <ArrowRightIcon aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
            <VaultCard lift className="overflow-hidden lg:col-span-7">
              {/* Terminal bar: the case reference and when it last moved. */}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-(--glass-border) bg-(--glass-elevated) px-5 py-3 sm:px-7">
                <p className="tnum font-mono text-sm text-fg-2">{sample.reference}</p>
                <p className="tnum text-sm text-fg-3">Updated {formatDate(sample.updatedAt)}</p>
              </div>
              <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-base font-semibold text-fg">{sample.title}</p>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      tone={caseStatusTone(sample.status).tone}
                      live={caseStatusTone(sample.status).live}
                    >
                      {stateInfo(sample.status).label}
                    </StatusBadge>
                    <Badge variant="neutral">Sample case</Badge>
                  </div>
                </div>
                <p className="mt-3 text-[0.9375rem] text-fg-2">
                  We are waiting for {sample.nextStep.waitingFor}.
                </p>
                <RouteProgress status={sample.status} className="mt-6" />
                <RouteTimeline
                  history={sample.statusHistory}
                  status={sample.status}
                  updatedAt={sample.updatedAt}
                  next={{
                    date: sample.nextStep.nextDate,
                    meaning: sample.nextStep.dateMeaning,
                    waitingFor: sample.nextStep.waitingFor,
                  }}
                />
                {teaserFile && teaserField && room && (
                  <div className="@container mt-6 border-t border-(--glass-border) pt-6">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-signal">
                      <FileSearchIcon className="size-4" aria-hidden="true" />
                      Read from {teaserFile.fileName}
                    </p>
                    <div className="mt-3">
                      <DocumentPreview
                        file={teaserFile}
                        fields={room.fields.filter((f) => f.evidenceFileId === teaserFile.id)}
                        page={teaserField.sourcePage ?? 1}
                        highlightFieldId={teaserField.id}
                      />
                    </div>
                    <ul className="mt-3 grid gap-3 @lg:grid-cols-2 @lg:[&>li:last-child:nth-child(odd)]:col-span-2 @4xl:grid-cols-3 @4xl:[&>li:last-child:nth-child(odd)]:col-span-1">
                      {teaserFields.map((f) => (
                        <li key={f.id}>
                          <FieldDataCard field={f} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </VaultCard>
          </div>
        </section>
      )}

      {/* What we don't do: two guarantees large, the rest as reassurance cards. */}
      <section
        id="what-we-dont-do"
        aria-labelledby="dont-heading"
        className="scroll-mt-20 border-t border-(--glass-border) bg-ink-900/50"
      >
        <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 md:py-32">
          <h2
            id="dont-heading"
            className="text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.1] text-fg"
          >
            What we don&apos;t do
          </h2>
          <p className="mt-5 max-w-[56ch] text-lg text-fg-2">
            Recovery attracts people who promise too much. These are the lines we hold, in writing.
          </p>
          <div className="mt-14 grid gap-4 lg:grid-cols-2">
            {GUARANTEES.map((g) => (
              <VaultCard key={g.title} lift className="flex flex-col p-6 sm:p-8">
                <p className="flex items-baseline gap-3">
                  <span
                    className={
                      g.tone === "success"
                        ? "display text-[clamp(4rem,9vw,6rem)] leading-none text-confirmed"
                        : "display text-gradient-cyan text-[clamp(4rem,9vw,6rem)] leading-none"
                    }
                  >
                    {g.figure}
                  </span>
                  <span className="text-base text-fg-2">{g.unit}</span>
                </p>
                <h3 className="mt-6 text-xl font-semibold tracking-[-0.01em] text-fg">{g.title}</h3>
                <p className="mt-2 text-base text-fg-2">{g.body}</p>
              </VaultCard>
            ))}
          </div>
          <RevealBatch as="ul" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DONTS.map((d) => (
              <li key={d.title} data-reveal-item>
                <VaultCard className="h-full p-5">
                  <span
                    aria-hidden="true"
                    className="grid size-10 place-items-center rounded-[12px] border border-signal/25 bg-signal-wash text-signal"
                  >
                    <d.Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-fg">
                    {d.title}
                  </h3>
                  <p className="mt-2 text-base text-fg-2">{d.body}</p>
                </VaultCard>
              </li>
            ))}
          </RevealBatch>
        </div>
      </section>

      {/* Free official routes beside ours. */}
      <section
        id="do-it-yourself"
        aria-labelledby="diy-heading"
        className="scroll-mt-20 border-t border-(--glass-border)"
      >
        <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 md:py-32">
          <h2
            id="diy-heading"
            className="max-w-[22ch] text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.1] text-fg"
          >
            You can do all of this yourself, for free. Here is how.
          </h2>
          <p className="mt-5 max-w-[60ch] text-lg text-fg-2">
            Every official route sits next to what we would do for you. Pay us only if the time,
            paperwork and follow-up are worth handing over.
          </p>

          <div className="panel mt-14 hidden overflow-hidden md:block">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Free official routes compared with RecoveryOS assistance
              </caption>
              <thead className="bg-(--glass-elevated)">
                <tr className="border-b border-(--glass-border)">
                  <th scope="col" className="w-1/4 px-6 py-4 text-sm font-medium text-fg-3">
                    Step
                  </th>
                  <th scope="col" className="w-[37.5%] px-6 py-4 text-sm font-medium text-fg-3">
                    Free official route
                  </th>
                  <th scope="col" className="w-[37.5%] px-6 py-4 text-sm font-medium text-signal">
                    With RecoveryOS, paid on success
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--glass-border)">
                {SIDE_BY_SIDE.map((r) => (
                  <tr key={r.step} className="align-top">
                    <th
                      scope="row"
                      className="px-6 py-6 text-lg font-semibold tracking-[-0.01em] text-fg"
                    >
                      {r.step}
                    </th>
                    <td className="px-6 py-6 text-base text-fg-2">
                      <p>{r.free.text}</p>
                      {r.free.link && (
                        <p className="mt-2">
                          <ExternalA href={r.free.link.href}>{r.free.link.label}</ExternalA>
                        </p>
                      )}
                    </td>
                    <td className="bg-signal-wash/30 px-6 py-6 text-base text-fg-2">{r.paid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-10 space-y-4 md:hidden">
            {SIDE_BY_SIDE.map((r) => (
              <li key={r.step} className="panel p-5">
                <h3 className="text-lg font-semibold tracking-[-0.01em] text-fg">{r.step}</h3>
                <p className="mt-4 text-sm font-medium text-fg-3">Free official route</p>
                <p className="mt-1 text-base text-fg-2">{r.free.text}</p>
                {r.free.link && (
                  <p className="mt-2">
                    <ExternalA href={r.free.link.href}>{r.free.link.label}</ExternalA>
                  </p>
                )}
                <p className="mt-4 text-sm font-medium text-signal">With RecoveryOS</p>
                <p className="mt-1 text-base text-fg-2">{r.paid}</p>
              </li>
            ))}
          </ul>

          <div className="mt-12">
            <h3 className="text-base font-semibold text-fg">
              For other unclaimed money, also free
            </h3>
            <ul className="mt-4 grid gap-x-10 gap-y-4 sm:grid-cols-3">
              {[OFFICIAL_LINKS.udgam, OFFICIAL_LINKS.epfo, OFFICIAL_LINKS.mfCentral].map((l) => (
                <li key={l.href} className="border-t border-(--glass-border) pt-4">
                  <ExternalA href={l.href}>{l.label.split(": ")[0]}</ExternalA>
                  <p className="mt-1 text-sm text-fg-3">{l.label.split(": ")[1]}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing: the terms, then the arithmetic, printed. */}
      <section
        id="pricing"
        aria-labelledby="pricing-heading"
        className="scroll-mt-20 border-t border-(--glass-border) bg-ink-900/50"
      >
        <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 md:py-32">
          <h2
            id="pricing-heading"
            className="text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.1] text-fg"
          >
            Paid when you are. Never before.
          </h2>

          <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-5">
              <p className="text-base font-medium text-fg-2">Success fee</p>
              <p className="display text-gradient-cyan mt-3 text-[clamp(4.5rem,11vw,8rem)] leading-none">
                {formatBps(SUCCESS_FEE_BPS)}
              </p>
              <p className="mt-4 max-w-[34ch] text-lg text-fg">
                of the value actually credited to you.
              </p>
              <ul className="mt-6 space-y-2 text-base text-fg-2">
                <li>Nothing upfront. Nothing if nothing is recovered.</li>
                <li>Invoiced after credit, plus GST as applicable.</li>
                <li>Stop any time before filing, at no charge.</li>
              </ul>
            </div>
            <div className="panel border-dashed p-6 sm:p-8 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-base font-medium text-fg-2">Protection allocation</p>
                <Badge variant="outline">Planned, conditional</Badge>
              </div>
              <p className="display mt-3 text-[clamp(3rem,6vw,4.5rem)] leading-none text-fg-2">
                {formatBps(PROTECTION_ALLOCATION_BPS)}
              </p>
              <p className="mt-4 max-w-[46ch] text-lg text-fg">
                of the recovery, set aside toward a life or health insurance policy in your name.
              </p>
              <ul className="mt-6 space-y-2 text-base text-fg-2">
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

          <LedgerPrint className="panel mt-12 p-6 sm:p-8">
            <h3 className="text-xl font-[560] tracking-[-0.015em] text-fg [font-stretch:104%]">
              Worked example: <span className="tnum">{formatPaise(EXAMPLE_PAISE)}</span> credited to
              you
            </h3>
            <dl className="tnum mt-6 text-base">
              <div
                data-ledger-row
                className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-(--glass-border) py-4"
              >
                <dt className="text-fg-2">Value credited to your demat and bank account</dt>
                <dd className="font-semibold text-fg">{formatPaise(EXAMPLE_PAISE)}</dd>
              </div>
              <div
                data-ledger-row
                className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-(--glass-border) py-4"
              >
                <dt className="text-fg-2">
                  Our success fee ({formatBps(SUCCESS_FEE_BPS)}), invoiced after credit
                </dt>
                <dd className="font-semibold text-fg">{formatPaise(fee)} + GST</dd>
              </div>
              <div
                data-ledger-row
                className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-(--glass-border) py-4"
              >
                <dt className="text-fg-2">
                  Protection allocation ({formatBps(PROTECTION_ALLOCATION_BPS)}), only if you choose
                  it and a policy is issued
                </dt>
                <dd className="font-semibold text-fg">
                  {formatPaise(protection)} toward your premium
                </dd>
              </div>
              <div
                data-ledger-row
                className="relative flex flex-wrap justify-between gap-x-6 gap-y-1 pt-5 pb-1"
              >
                <span
                  data-ledger-rule
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px bg-(image:--gradient-route)"
                />
                <dt className="font-semibold text-fg">Yours to keep</dt>
                <dd className="text-right font-semibold text-confirmed">
                  {formatPaise(EXAMPLE_PAISE - fee - protection)} + the policy
                  <span className="block font-normal text-fg-2">
                    or {formatPaise(EXAMPLE_PAISE - fee)} if you opt out
                  </span>
                </dd>
              </div>
            </dl>
            <p className="mt-6 text-sm text-fg-3">
              {VALUATION_RULE} Illustrative figures; draft terms.
            </p>
          </LedgerPrint>
        </div>
      </section>

      {/* Anti-fraud: quiet, plain, no motion. */}
      <section aria-labelledby="fraud-heading" className="border-t border-(--glass-border)">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-24 sm:px-6 md:py-32 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span
              aria-hidden="true"
              className="grid size-12 place-items-center rounded-[14px] border border-blocker/35 bg-blocker-wash text-blocker"
            >
              <ShieldAlertIcon className="size-6" />
            </span>
            <h2
              id="fraud-heading"
              className="mt-6 text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.1] text-fg"
            >
              Protect yourself from recovery fraud
            </h2>
            <p className="mt-5 max-w-[40ch] text-lg text-fg-2">
              Unclaimed shares attract fake agents. These rules keep you safe, whoever you work
              with.
            </p>
          </div>
          <div className="lg:col-span-7">
            <ul className="panel divide-y divide-(--glass-border)">
              {FRAUD_RULES.map((t) => (
                <li key={t} className="flex gap-4 px-5 py-5 text-base text-fg sm:px-6">
                  <BanIcon className="mt-1 size-4 shrink-0 text-blocker" aria-hidden="true" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-lg text-fg-2">
              If something feels wrong, stop. Report it at{" "}
              <a
                href={OFFICIAL_LINKS.cybercrime.href}
                target="_blank"
                rel="noopener noreferrer"
                className="link font-medium"
              >
                cybercrime.gov.in<span className="sr-only"> (opens in a new tab)</span>
              </a>{" "}
              or call <span className="tnum font-semibold text-fg">1930</span>, the national cyber
              crime helpline.
            </p>
          </div>
        </div>
      </section>

      {/* A real close. */}
      <section aria-labelledby="cta-heading" className="border-t border-(--glass-border)">
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 md:py-28">
          <VaultCard
            lift
            className="relative isolate flex flex-col items-start gap-8 overflow-hidden p-8 sm:p-12 md:flex-row md:items-end md:justify-between"
          >
            <div aria-hidden="true" className="hero-mesh absolute inset-0 -z-10 opacity-80" />
            <div>
              <h2
                id="cta-heading"
                className="text-gradient-cyan text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.1]"
              >
                Three minutes to know your route.
              </h2>
              <p className="mt-4 max-w-[52ch] text-lg text-fg-2">
                Five questions, no sign-up, and a receipt showing exactly what was checked, and what
                wasn&apos;t.
              </p>
            </div>
            <Magnetic>
              <Button asChild size="lg" className="sheen">
                <Link href="/check" transitionTypes={["nav-forward"]}>
                  {CHECK_CTA}
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </Magnetic>
          </VaultCard>
        </div>
      </section>
    </PageTransition>
  );
}
