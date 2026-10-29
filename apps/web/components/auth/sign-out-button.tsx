"use client";

import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await fetch("/api/session", { method: "DELETE" });
        router.push("/");
        router.refresh();
      }}
    >
      <LogOutIcon aria-hidden="true" />
      Sign out
    </Button>
  );
}
