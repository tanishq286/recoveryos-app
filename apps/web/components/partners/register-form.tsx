"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon } from "lucide-react";
import {
  PROFESSION_LABELS,
  PROFESSIONS,
  type IndianState,
  type Profession,
} from "@recoveryos/shared";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StateOptions } from "@/components/search/state-options";
import { callApi } from "@/lib/api/client";

export function RegisterForm({ name }: { name: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await callApi("associates/register", {
        body: {
          name: String(f.get("name") || "").trim() || undefined,
          firmName: String(f.get("firmName")),
          profession: f.get("profession") as Profession,
          state: f.get("state") as IndianState,
          city: String(f.get("city")),
          bio: String(f.get("bio") || "").trim() || undefined,
        },
      });
      router.push("/partners/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel grid gap-4 p-5 sm:p-7">
      {error && (
        <Alert variant="blocker" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="r-name" className="mb-1.5 block text-sm text-fg-2">
            Your name
          </label>
          <Input
            id="r-name"
            name="name"
            defaultValue={name === "New investor" ? "" : name}
            required
            minLength={2}
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="r-prof" className="mb-1.5 block text-sm text-fg-2">
            Profession
          </label>
          <Select id="r-prof" name="profession" required defaultValue="CA">
            {PROFESSIONS.map((p) => (
              <option key={p} value={p}>
                {PROFESSION_LABELS[p]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <label htmlFor="r-firm" className="mb-1.5 block text-sm text-fg-2">
          Firm or practice name
        </label>
        <Input
          id="r-firm"
          name="firmName"
          required
          minLength={2}
          maxLength={160}
          autoComplete="organization"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="r-state" className="mb-1.5 block text-sm text-fg-2">
            State
          </label>
          <Select id="r-state" name="state" required defaultValue="">
            <StateOptions />
          </Select>
        </div>
        <div>
          <label htmlFor="r-city" className="mb-1.5 block text-sm text-fg-2">
            City
          </label>
          <Input
            id="r-city"
            name="city"
            required
            minLength={2}
            maxLength={80}
            autoComplete="address-level2"
          />
        </div>
      </div>
      <div>
        <label htmlFor="r-bio" className="mb-1.5 block text-sm text-fg-2">
          A line about your practice (shown on the locator)
        </label>
        <Textarea id="r-bio" name="bio" maxLength={500} rows={3} />
      </div>
      <Button type="submit" size="lg" disabled={busy}>
        {busy && <LoaderCircleIcon className="animate-spin" aria-hidden="true" />}
        Register as a partner
      </Button>
      <p className="text-sm text-fg-3">
        We check your membership number or enrolment with your institute before you appear on the
        public locator. You can refer clients straight away.
      </p>
    </form>
  );
}
