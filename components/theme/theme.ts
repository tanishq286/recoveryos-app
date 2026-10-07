"use client";

import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const KEY = "recoveryos:theme";
const EVENT = "recoveryos:theme-change";
const CHROME: Record<Theme, string> = { dark: "#05080E", light: "#F3F6FA" };

export function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function syncChrome(theme: Theme) {
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = CHROME[theme];
  });
}

/**
 * Switch themes. Where the View Transitions API exists and motion is allowed,
 * the old and new themes crossfade; otherwise the swap is instant.
 */
export function setTheme(theme: Theme) {
  const apply = () => {
    document.documentElement.dataset.theme = theme;
    syncChrome(theme);
    window.dispatchEvent(new Event(EVENT));
  };
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* the choice just won't persist */
  }
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && matchMedia("(prefers-reduced-motion: no-preference)").matches) {
    doc.startViewTransition(apply);
  } else {
    apply();
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/** The current theme; "dark" during server render and hydration. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => "dark");
}

export { CHROME as THEME_CHROME, KEY as THEME_KEY };
