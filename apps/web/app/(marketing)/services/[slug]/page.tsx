import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRightIcon, CheckIcon, CircleAlertIcon, SearchIcon, UsersIcon } from "lucide-react";
import { SERVICE_VERTICALS, serviceBySlug } from "@recoveryos/shared";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SERVICE_ICONS } from "@/components/services/icons";

export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICE_VERTICALS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const s = serviceBySlug((await params).slug);
  if (!s) return {};
  return {
    title: s.name,
    description: s.summary,
    alternates: { canonical: `/services/${s.slug}` },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const s = serviceBySlug((await params).slug);
  if (!s) notFound();
  const Icon = SERVICE_ICONS[s.slug];
  return (
    <article className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
      <nav aria-label="Breadcrumb" className="text-sm text-fg-3">
        <Link href="/services" className="link text-fg-2">
          Services
        </Link>{" "}
        / {s.name}
      </nav>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {Icon && <Icon className="size-7 text-signal" aria-hidden="true" />}
        <StatusBadge tone={s.status === "taking-cases" ? "success" : "neutral"} live={false}>
          {s.status === "taking-cases" ? "Taking cases now" : "Free route plus a call-back"}
        </StatusBadge>
      </div>
      <h1 className="display mt-4 max-w-[22ch] text-[clamp(2rem,4.4vw,3.25rem)] text-fg">
        {s.name}
      </h1>
      <p className="mt-4 max-w-[60ch] text-lg text-fg-2">{s.summary}</p>
      <p className="mt-3 max-w-[60ch] text-fg-2">
        <span className="font-medium text-fg">For: </span>
        {s.forWhom}
      </p>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 grid-cols-1 content-start gap-10">
          <section aria-labelledby="steps-heading">
            <h2 id="steps-heading" className="text-xl font-semibold text-fg">
              How it works
            </h2>
            <ol className="mt-5 grid gap-4">
              {s.steps.map((step, i) => (
                <li key={step} className="grid grid-cols-[2.5rem_1fr] items-start gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full border border-signal/35 bg-signal-wash font-semibold text-signal tnum">
                    {i + 1}
                  </span>
                  <p className="pt-1.5 text-fg">{step}</p>
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="docs-heading">
            <h2 id="docs-heading" className="text-xl font-semibold text-fg">
              Documents people usually need
            </h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {s.documents.map((d) => (
                <li key={d} className="flex items-start gap-2 text-fg-2">
                  <CheckIcon className="mt-1 size-4 shrink-0 text-confirmed" aria-hidden="true" />
                  {d}
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="grid min-w-0 grid-cols-1 content-start gap-6">
          {s.officialRoute && (
            <section aria-labelledby="free-heading" className="panel p-5 sm:p-6">
              <h2 id="free-heading" className="text-lg font-semibold text-fg">
                The free official route
              </h2>
              <p className="mt-2 text-fg-2">{s.officialRoute.note}</p>
              <a
                href={s.officialRoute.href}
                target="_blank"
                rel="noopener noreferrer"
                className="link mt-3 inline-flex items-center gap-1 font-medium"
              >
                {s.officialRoute.label}
                <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </section>
          )}
          <Alert variant="pending">
            <CircleAlertIcon aria-hidden="true" />
            <AlertTitle>What we don&apos;t promise</AlertTitle>
            <AlertDescription>
              <ul className="grid gap-1">
                {s.limits.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
          <div className="panel grid gap-3 p-5 sm:p-6">
            {s.status === "taking-cases" ? (
              <>
                <p className="text-fg-2">
                  Start by finding the holding. Search is free, with no sign-up.
                </p>
                <Button asChild>
                  <Link href="/search">
                    <SearchIcon aria-hidden="true" />
                    Search by name
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-fg-2">
                  Want help with this? A partner near you can take it on, or we call you back.
                </p>
                <Button asChild variant="outline">
                  <Link href="/partners#locator">
                    <UsersIcon aria-hidden="true" />
                    Find a partner near you
                  </Link>
                </Button>
              </>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
