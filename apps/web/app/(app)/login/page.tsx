import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Login Gateway", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <h1 className="display text-[clamp(2rem,4vw,2.75rem)] text-fg">
        Finsol Enterprises Login Gateway
      </h1>
      <p className="mt-3 text-lg text-fg-2">
        Sign in with your full name, mobile number and email to see your holdings, cases and
        reports.
      </p>
      <div className="panel mt-8 p-5 sm:p-7">
        <LoginForm next={next} />
      </div>
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-6 text-sm text-fg-3">
          Development: codes are printed in the API log. The first administrator comes from
          SEED_ADMIN_PHONE when you seed the database.
        </p>
      )}
    </div>
  );
}
