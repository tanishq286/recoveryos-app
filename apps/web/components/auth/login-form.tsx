"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRoundIcon, LoaderCircleIcon, ShieldCheckIcon } from "lucide-react";
import type { Role } from "@recoveryos/shared";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { homeFor } from "@/components/auth/account-link";
import { callApi } from "@/lib/api/client";

/** Phone sign-in: a 6-digit code to the mobile on file, typed here. */
export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [phone, setPhone] = React.useState("");
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await callApi("auth/otp/request", { body: { phone, purpose: "LOGIN" } });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await callApi<{ user: { role: Role } }>("auth/otp/verify", {
        body: { phone, code, name: name.trim() || undefined },
      });
      // Only same-site paths are followed after sign-in.
      const target =
        next && next.startsWith("/") && !next.startsWith("//") ? next : homeFor(res.user.role);
      router.push(target);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="panel p-5 sm:p-7">
      {error && (
        <Alert variant="blocker" role="alert" className="mb-5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!sent ? (
        <form onSubmit={send} className="grid gap-4">
          <div>
            <label htmlFor="l-phone" className="mb-1.5 block text-sm text-fg-2">
              Mobile number
            </label>
            <Input
              id="l-phone"
              required
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="tnum"
            />
          </div>
          <div>
            <label htmlFor="l-name" className="mb-1.5 block text-sm text-fg-2">
              Your name <span className="text-fg-3">(first time only)</span>
            </label>
            <Input
              id="l-name"
              autoComplete="name"
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? (
              <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
            ) : (
              <KeyRoundIcon aria-hidden="true" />
            )}
            Send me a code
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="grid gap-4">
          <div>
            <label htmlFor="l-code" className="mb-1.5 block text-sm text-fg-2">
              6-digit code sent to {phone}
            </label>
            <Input
              id="l-code"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="tnum text-center font-mono text-2xl tracking-[0.5em]"
            />
          </div>
          <Button type="submit" size="lg" disabled={busy || code.length !== 6}>
            {busy && <LoaderCircleIcon className="animate-spin" aria-hidden="true" />}
            Sign in
          </Button>
          <button
            type="button"
            className="link justify-self-start text-sm text-fg-2"
            onClick={() => setSent(false)}
          >
            Use a different number
          </button>
        </form>
      )}
      <p className="mt-5 flex items-start gap-2 border-t border-(--glass-border) pt-4 text-sm text-fg-3">
        <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
        Type the code only into this page. We never ask for it by phone, WhatsApp or email.
      </p>
    </div>
  );
}
