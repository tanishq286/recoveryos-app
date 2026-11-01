import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon, CircleAlertIcon, MailIcon, SearchIcon } from "lucide-react";
import {
  BRAND,
  BRAND_EMAILS,
  PUBLIC_PRICING,
  SERVICE_VERTICALS,
  serviceBySlug,
} from "@recoveryos/shared";

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
          {s.status === "taking-cases" ? "Taking cases now" : "Call-back service"}
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
              What {BRAND.name} handles for you
            </h2>
            <ol className="mt-5 grid gap-4">
              {s.weHandle.map((step, i) => (
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
              What you may be asked to share
            </h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {s.youShare.map((d) => (
                <li key={d} className="flex items-start gap-2 text-fg-2">
                  <CheckIcon className="mt-1 size-4 shrink-0 text-confirmed" aria-hidden="true" />
                  {d}
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="grid min-w-0 grid-cols-1 content-start gap-6">
          <section aria-labelledby="price-heading" className="panel p-5 sm:p-6">
            <h2 id="price-heading" className="text-lg font-semibold text-fg">
              {PUBLIC_PRICING.headline}
            </h2>
            <p className="mt-2 text-fg-2">{PUBLIC_PRICING.detail}</p>
            <p className="mt-2 text-sm font-medium text-signal">{BRAND.promise.join(" • ")}</p>
          </section>
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
                  Start with the free 3-Minute Check: just a name and a state.
                </p>
                <Button asChild>
                  <Link href="/search">
                    <SearchIcon aria-hidden="true" />
                    Start 3-Minute Check
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-fg-2">
                  Write to us and an analyst will call you back to confirm whether we can act.
                </p>
                <Button asChild variant="outline">
                  <a
                    href={`mailto:${BRAND_EMAILS.info}?subject=${encodeURIComponent(`Call-back request: ${s.name}`)}`}
                  >
                    <MailIcon aria-hidden="true" />
                    Request a call-back
                  </a>
                </Button>
              </>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
