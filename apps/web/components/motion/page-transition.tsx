import { ViewTransition, type ReactNode } from "react";

const DIRECTIONAL = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };

/**
 * Wraps a page's content so navigations tagged nav-forward / nav-back slide in
 * the matching direction. Untagged changes (refresh, browser back, Suspense
 * reveals) don't animate. Goes in each page, not the layout: layouts persist.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={DIRECTIONAL} exit={DIRECTIONAL} default="none">
      {children}
    </ViewTransition>
  );
}

/** Shared-element identity for a case title, so it can morph from list to page. */
export function CaseTitleTransition({ caseId, children }: { caseId: string; children: ReactNode }) {
  return (
    <ViewTransition name={`case-title-${caseId}`} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
