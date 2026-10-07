"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { gsap, ScrollTrigger, useGSAP, MOTION_QUERIES } from "@/lib/motion/gsap";
import type { RouteFieldScene } from "@/components/marketing/route-field-scene";
import { cn } from "@/lib/utils";

type Mode = "pending" | "webgl" | "svg";

function canUseWebGL(): boolean {
  try {
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean };
      deviceMemory?: number;
    };
    if (nav.connection?.saveData) return false;
    if ((nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2) return false;
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// Device capability never changes during a visit: probe once, cache, and read
// it through useSyncExternalStore so the server render stays "pending".
let probed: Mode | null = null;
const readMode = (): Mode => (probed ??= canUseWebGL() ? "webgl" : "svg");
const readServerMode = (): Mode => "pending";
const noSubscribe = () => () => {};

/**
 * The hero's focal visual: the route through the record field.
 * Decorative (aria-hidden). Lazy-loads three.js after first paint so the
 * headline stays the LCP element; falls back to an SVG route on devices that
 * can't or shouldn't run WebGL.
 */
export function RouteField({ className }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const svgPath = useRef<SVGPathElement>(null);
  const scene = useRef<RouteFieldScene | null>(null);
  const state = useRef({ intro: 0, scroll: 0 });
  const mode = useSyncExternalStore(noSubscribe, readMode, readServerMode);
  const [ready, setReady] = useState(false);

  // Decide the rendering path, then load the scene when the browser is idle.
  useEffect(() => {
    if (mode !== "webgl") return;
    const reduce = matchMedia(MOTION_QUERIES.reduce).matches;
    let cancelled = false;
    const idle =
      (
        window as Window & {
          requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
        }
      ).requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 180));

    idle(
      () => {
        import("@/components/marketing/route-field-scene").then(({ RouteFieldScene }) => {
          if (cancelled || !canvas.current || !wrap.current) return;
          const compact =
            matchMedia("(max-width: 767px)").matches || matchMedia("(pointer: coarse)").matches;
          const s = new RouteFieldScene(canvas.current, { compact, still: reduce });
          scene.current = s;
          const r = wrap.current.getBoundingClientRect();
          s.resize(r.width, r.height);
          s.setIntro(state.current.intro);
          s.setScroll(state.current.scroll);
          setReady(true);
        });
      },
      { timeout: 1200 },
    );
    return () => {
      cancelled = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, [mode]);

  // Keep the canvas sized, and pause rendering offscreen or in a hidden tab.
  useEffect(() => {
    if (mode !== "webgl" || !wrap.current) return;
    const el = wrap.current;
    let inView = true;
    const sync = () => scene.current?.setActive(inView && !document.hidden);
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      scene.current?.resize(width, height);
    });
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    ro.observe(el);
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [mode, ready]);

  // Motion: the authored entrance, the scroll-scrubbed continuation, pointer parallax.
  useGSAP(
    () => {
      if (mode === "pending") return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.motion, () => {
        if (mode === "svg") {
          if (svgPath.current)
            gsap.from(svgPath.current, { drawSVG: "0%", duration: 1.8, ease: "expo.out" });
          return;
        }
        if (!ready) return;
        gsap.to(state.current, {
          intro: 1,
          duration: 1.9,
          delay: 0.15,
          ease: "expo.out",
          onUpdate: () => scene.current?.setIntro(state.current.intro),
        });
        const hero = wrap.current?.closest("section");
        if (hero) {
          ScrollTrigger.create({
            trigger: hero,
            start: "top top",
            end: "bottom top",
            onUpdate: (self) => {
              state.current.scroll = self.progress;
              scene.current?.setScroll(self.progress);
            },
          });
        }
        if (matchMedia("(pointer: fine)").matches) {
          const onMove = (e: PointerEvent) => {
            scene.current?.setPointer(
              (e.clientX / window.innerWidth) * 2 - 1,
              (e.clientY / window.innerHeight) * 2 - 1,
            );
            // Lens: cursor over the canvas, in normalised device coordinates.
            const r = canvas.current?.getBoundingClientRect();
            if (!r || r.width === 0) return;
            const x = ((e.clientX - r.left) / r.width) * 2 - 1;
            const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
            scene.current?.setLens(x, y, Math.abs(x) <= 1 && Math.abs(y) <= 1);
          };
          window.addEventListener("pointermove", onMove, { passive: true });
          return () => window.removeEventListener("pointermove", onMove);
        }
      });
    },
    { dependencies: [mode, ready], scope: wrap, revertOnUpdate: true },
  );

  return (
    <div ref={wrap} aria-hidden="true" className={cn("relative", className)}>
      {mode !== "svg" && (
        <canvas
          ref={canvas}
          className={cn(
            "absolute inset-0 size-full transition-opacity duration-700 ease-(--ease-out)",
            ready ? "opacity-100" : "opacity-0",
          )}
        />
      )}
      {mode === "svg" && (
        <svg viewBox="0 0 480 320" className="absolute inset-0 size-full" fill="none">
          <path
            ref={svgPath}
            d="M40 250 C 90 200, 120 150, 170 175 S 250 120, 290 150 S 360 110, 400 80 S 430 60, 448 48"
            stroke="var(--color-signal)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="40" cy="250" r="5" fill="var(--color-signal)" />
          <circle cx="448" cy="48" r="6" fill="var(--color-confirmed)" />
        </svg>
      )}
    </div>
  );
}
