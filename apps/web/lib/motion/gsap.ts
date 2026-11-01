"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useGSAP } from "@gsap/react";

/*
 * Client-only GSAP setup. Registered once, before any useGSAP() runs.
 * Signature ease: expo.out for authored entrances (focal moment only);
 * UI micro-interactions stay in CSS on --ease-out.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin);
gsap.defaults({ ease: "expo.out", duration: 0.8 });

/** Reduced-motion and viewport conditions, shared by every gsap.matchMedia() block. */
export const MOTION_QUERIES = {
  motion: "(prefers-reduced-motion: no-preference)",
  reduce: "(prefers-reduced-motion: reduce)",
  wide: "(min-width: 1024px)",
} as const;

export { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, useGSAP };
