"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Modal dialog on Radix: focus is trapped and returned, Escape closes, and
 * the page behind is inert. Glass panel, 220ms settle on the strong ease-out.
 */
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogContent({
  className,
  children,
  wide = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { wide?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-overlay) bg-ink-950/70 backdrop-blur-sm data-[state=open]:animate-arrive" />
      <DialogPrimitive.Content
        className={cn(
          "vault-glass fixed top-1/2 left-1/2 z-(--z-overlay) flex max-h-[min(90dvh,52rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-[var(--radius-panel)] p-5 focus:outline-none data-[state=open]:animate-settle sm:p-7",
          wide ? "max-w-3xl" : "max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-md text-fg-3 transition-colors duration-150 hover:bg-(--glass-elevated) hover:text-fg focus-visible:outline-2 focus-visible:outline-signal">
          <XIcon className="size-5" aria-hidden="true" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("pr-10 text-xl font-semibold text-fg", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn("mt-2 text-base text-fg-2", className)} {...props} />
  );
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger };
