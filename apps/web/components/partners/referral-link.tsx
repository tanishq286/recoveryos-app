"use client";

import * as React from "react";
import { CheckIcon, CopyIcon, Link2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const DESTINATIONS = [
  { path: "/search", label: "Name search" },
  { path: "/calculator", label: "Old shares calculator" },
  { path: "/", label: "Home page" },
];

/** Builds a referral link: the destination plus ?ref=CODE, and an optional campaign tag. */
export function ReferralLink({ code, origin }: { code: string; origin: string }) {
  const [path, setPath] = React.useState("/search");
  const [campaign, setCampaign] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const url = new URL(path, origin);
  url.searchParams.set("ref", code);
  if (campaign.trim())
    url.searchParams.set(
      "utm_campaign",
      campaign
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-"),
    );
  const link = url.toString();

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the link is selectable in the field */
    }
  }

  return (
    <section aria-labelledby="ref-heading" className="panel p-5 sm:p-6">
      <h2 id="ref-heading" className="flex items-center gap-2 text-lg font-semibold text-fg">
        <Link2Icon className="size-5 text-signal" aria-hidden="true" />
        Your referral link
      </h2>
      <p className="mt-1 text-sm text-fg-2">
        Anyone who unlocks a result through this link is credited to you. Your code:{" "}
        <span className="font-mono text-fg">{code}</span>
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ref-dest" className="mb-1.5 block text-sm text-fg-3">
            Lands on
          </label>
          <Select id="ref-dest" value={path} onChange={(e) => setPath(e.target.value)}>
            {DESTINATIONS.map((d) => (
              <option key={d.path} value={d.path}>
                {d.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="ref-camp" className="mb-1.5 block text-sm text-fg-3">
            Campaign (optional)
          </label>
          <Input
            id="ref-camp"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="diwali-newsletter"
            maxLength={40}
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          readOnly
          value={link}
          aria-label="Referral link"
          className="font-mono text-sm"
          onFocus={(e) => e.target.select()}
        />
        <Button type="button" variant="outline" onClick={copy} className="shrink-0">
          {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </section>
  );
}
