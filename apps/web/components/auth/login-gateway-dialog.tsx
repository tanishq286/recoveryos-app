"use client";

import { LockKeyholeIcon } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/** The in-page Login Gateway: signs in without leaving the page, then refreshes it. */
export function LoginGatewayDialog({
  open,
  onOpenChange,
  reason = "to see company names, share counts and values",
  onSignedIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
  /** Runs after a successful sign-in, e.g. to retry what needed it. */
  onSignedIn?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <LockKeyholeIcon className="size-5 text-signal" aria-hidden="true" />
          Finsol Enterprises Login Gateway
        </DialogTitle>
        <DialogDescription>Sign in {reason}. It is free and takes a minute.</DialogDescription>
        <div className="mt-5">
          <LoginForm
            idPrefix="g"
            onSignedIn={() => {
              onOpenChange(false);
              onSignedIn?.();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
