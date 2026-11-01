import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/partners/register-form";
import { requireViewer } from "@/lib/api/guard";
import { isStaffRole } from "@/lib/api/server";

export const metadata: Metadata = { title: "Become a partner", robots: { index: false } };

export default async function JoinPage() {
  const viewer = await requireViewer("/partners/join");
  if (viewer.role === "ASSOCIATE_PARTNER") redirect("/partners/dashboard");
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <h1 className="display text-[clamp(2rem,4vw,2.75rem)] text-fg">Become a partner</h1>
      <p className="mt-3 text-lg text-fg-2">
        30% of our fee on every case you refer, accrued when the client&apos;s shares are credited.
      </p>
      <div className="mt-8">
        {isStaffRole(viewer.role) ? (
          <p className="panel p-6 text-fg-2">Staff accounts cannot register as partners.</p>
        ) : (
          <RegisterForm name={viewer.name} />
        )}
      </div>
    </div>
  );
}
