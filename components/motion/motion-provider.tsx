"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig } from "framer-motion";

import { SPRING } from "@/lib/motion/springs";

const loadFeatures = () => import("@/lib/motion/features").then((mod) => mod.default);

/**
 * Framer Motion for the whole app.
 * - LazyMotion + `strict`: components must use `m.*` (not `motion.*`), and the
 *   feature bundle loads after hydration.
 * - reducedMotion="user": with a reduced-motion preference, transforms and
 *   layout animations are skipped; opacity still fades so feedback remains.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={SPRING}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
