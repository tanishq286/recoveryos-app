"use client";

import { useRef } from "react";

import { gsap, SplitText, useGSAP, MOTION_QUERIES } from "@/lib/motion/gsap";

/**
 * The focal entrance: headline lines rise out of a mask once, then the
 * sentence and the action settle. Elements marked [data-hero-reveal] are
 * hidden by CSS only when motion is allowed (see globals.css failsafe).
 */
export function HeroReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const heading = root.querySelector<HTMLElement>("[data-hero-heading]");
      const follow = root.querySelectorAll<HTMLElement>("[data-hero-follow]");
      const all = root.querySelectorAll<HTMLElement>("[data-hero-reveal]");

      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.motion, () => {
        if (!heading) {
          gsap.set(all, { visibility: "visible" });
          return;
        }
        const split = SplitText.create(heading, {
          type: "lines",
          mask: "lines",
          linesClass: "hero-line",
          autoSplit: true,
          onSplit(self) {
            gsap.set(all, { visibility: "visible" });
            return gsap
              .timeline()
              .from(self.lines, { yPercent: 108, duration: 1.05, stagger: 0.09 })
              .from(follow, { autoAlpha: 0, y: 14, duration: 0.8, stagger: 0.08 }, "-=0.7");
          },
        });
        return () => split.revert();
      });
      mm.add(MOTION_QUERIES.reduce, () => {
        gsap.set(all, { visibility: "visible" });
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
