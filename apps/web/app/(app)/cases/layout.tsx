import { InfoIcon } from "lucide-react";

/** The sample cases are an illustration of the case room, not records: say so on every page of them. */
export default function SampleCasesLayout({ children }: LayoutProps<"/cases">) {
  return (
    <>
      <div role="note" className="border-b border-(--glass-border) bg-signal-wash/50">
        <p className="mx-auto flex max-w-[84rem] items-start gap-2 px-4 py-2 text-sm text-fg-2 sm:px-6">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-fg">Sample cases.</strong> An illustration of the
            case room: the people, companies and documents here are made up. Real cases live in your
            portal.
          </span>
        </p>
      </div>
      {children}
    </>
  );
}
