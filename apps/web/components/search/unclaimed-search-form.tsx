import Form from "next/form";
import { LockIcon, SearchIcon } from "lucide-react";
import type { IndianState } from "@recoveryos/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StateOptions } from "@/components/search/state-options";
import { cn } from "@/lib/utils";

export interface SearchDefaults {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  state?: IndianState | "";
}

/**
 * Name + state search. A plain GET form to /search, so it works before (and
 * without) JavaScript. Any one name is enough: first, middle or surname, or
 * all three. The state narrows it to the holder's last known address.
 */
export function UnclaimedSearchForm({
  defaults = {},
  className,
  compact = false,
}: {
  defaults?: SearchDefaults;
  className?: string;
  compact?: boolean;
}) {
  const id = compact ? "s-compact" : "s";
  return (
    <Form
      action="/search"
      aria-label="Search unclaimed shares by name and state"
      className={cn("vault-glass relative rounded-[20px] p-4 sm:p-5", className)}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-(image:--specular)"
      />
      <div className="@container">
        <div className="grid gap-3 @[34rem]:grid-cols-3">
          <div>
            <label htmlFor={`${id}-first`} className="mb-1.5 block text-sm text-fg-3">
              First name
            </label>
            <Input
              id={`${id}-first`}
              name="firstName"
              defaultValue={defaults.firstName}
              autoComplete="off"
              maxLength={60}
              placeholder="Ramesh"
            />
          </div>
          <div>
            <label htmlFor={`${id}-middle`} className="mb-1.5 block text-sm text-fg-3">
              Middle name
            </label>
            <Input
              id={`${id}-middle`}
              name="middleName"
              defaultValue={defaults.middleName}
              autoComplete="off"
              maxLength={60}
              placeholder="Kumar or K"
            />
          </div>
          <div>
            <label htmlFor={`${id}-last`} className="mb-1.5 block text-sm text-fg-3">
              Surname
            </label>
            <Input
              id={`${id}-last`}
              name="lastName"
              defaultValue={defaults.lastName}
              autoComplete="off"
              maxLength={60}
              placeholder="Agarwal"
            />
          </div>
        </div>
        <div className="mt-3 grid gap-3 @[34rem]:grid-cols-[minmax(0,1fr)_auto] @[34rem]:items-end">
          <div>
            <label htmlFor={`${id}-state`} className="mb-1.5 block text-sm text-fg-3">
              State on the holder&apos;s last address
            </label>
            <Select id={`${id}-state`} name="state" required defaultValue={defaults.state ?? ""}>
              <StateOptions />
            </Select>
          </div>
          <Button type="submit" size="lg" className="sheen min-h-12">
            <SearchIcon aria-hidden="true" />
            Search records
          </Button>
        </div>
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-sm text-fg-3">
        <LockIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Any one name works. Spellings such as Agarwal, Agrawal and Aggarwal are matched together.
      </p>
    </Form>
  );
}
