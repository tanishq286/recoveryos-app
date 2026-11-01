import { LoaderCircleIcon } from "lucide-react";

/** Shown while a check runs (the page is rendered on the server). */
export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="display max-w-[20ch] text-[clamp(2rem,4vw,3rem)] text-fg">
        Start your 3-Minute Check
      </h1>
      <p
        role="status"
        aria-live="polite"
        className="mt-10 flex items-center gap-3 text-lg text-fg-2"
        data-testid="search-loading"
      >
        <LoaderCircleIcon
          className="size-5 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        Searching the records we hold…
      </p>
    </div>
  );
}
