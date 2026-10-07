import type { Transition } from "framer-motion";

/*
 * The product's spring vocabulary. Every Framer Motion animation picks one of
 * these, so motion feels like one system. None overshoot visibly: this is a
 * financial product, things land, they don't bounce.
 */

/** Default for UI: pills, highlights, layout shifts. Lands in about 300ms. */
export const SPRING: Transition = { type: "spring", stiffness: 420, damping: 38, mass: 0.8 };

/** Larger surfaces: steps, panes, cards entering. A slower, softer landing. */
export const SPRING_SOFT: Transition = { type: "spring", stiffness: 240, damping: 30, mass: 0.9 };

/** Exits are quick and plain: what leaves should never hold up what arrives. */
export const EXIT: Transition = { duration: 0.14, ease: [0.4, 0, 1, 1] };
