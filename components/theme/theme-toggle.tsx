"use client";

import { useEffect } from "react";
import { MoonIcon, SunIcon } from "@phosphor-icons/react/dist/ssr";

import { setTheme, THEME_CHROME, useTheme } from "@/components/theme/theme";
import { cn } from "@/lib/utils";

/** Light / dark switch. The icon shows the theme you will get, the label says it. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  // Keep the browser chrome in step with a theme restored before hydration.
  useEffect(() => {
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
      m.content = THEME_CHROME[theme];
    });
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={cn(
        "group inline-grid size-11 place-items-center rounded-[var(--radius-control)] border border-line bg-ink-900/60 text-fg-2 transition-[border-color,color,transform] duration-[160ms] ease-(--ease-out) hover:border-control hover:text-fg active:scale-[0.97]",
        className,
      )}
    >
      <span key={theme} className="animate-settle">
        {next === "light" ? (
          <SunIcon
            className="size-[1.125rem] transition-transform duration-[420ms] ease-(--ease-out) group-hover:rotate-45"
            aria-hidden="true"
          />
        ) : (
          <MoonIcon
            className="size-[1.125rem] transition-transform duration-[420ms] ease-(--ease-out) group-hover:-rotate-12"
            aria-hidden="true"
          />
        )}
      </span>
    </button>
  );
}
