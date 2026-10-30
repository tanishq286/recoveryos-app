import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <h1 className="display text-[clamp(2rem,4vw,2.75rem)] text-fg">Sign in</h1>
      <p className="mt-3 text-lg text-fg-2">
        Clients, partners and the case team all sign in with their mobile number.
      </p>
      <div className="mt-8">
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
