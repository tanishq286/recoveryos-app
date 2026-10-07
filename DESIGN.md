---
name: RecoveryOS
description: Sovereign Vault. An abyss canvas, acrylic glass with a specular rim, one electric-cyan action, and four status hues that each mean one thing.
colors:
  vault-abyss: "#05080e"
  vault-surface: "rgb(13 20 36 / 0.72)"
  vault-elevated: "rgb(22 33 58 / 0.55)"
  vault-border: "rgb(255 255 255 / 0.08)"
  vault-border-highlight: "rgb(56 189 248 / 0.35)"
  ink-950: "#05080e"
  ink-900: "#080d17"
  ink-850: "#0d1424"
  ink-800: "#16213a"
  line: "#1b2537"
  control: "#62738e"
  fg: "#e8eef7"
  fg-2: "#a9b6cb"
  fg-3: "#8593aa"
  brand-cyan: "#00f2fe"
  brand-blue: "#4facfe"
  signal: "#4facfe"
  on-brand: "#031018"
  status-success: "#10b981"
  status-pending: "#f59e0b"
  status-error: "#ef4444"
  status-iepf: "#8b5cf6"
  confirmed: "#10b981"
  pending: "#f59e0b"
  blocker: "#f87171"
  iepf: "#a78bfa"
  chart-signal: "#4f93dc"
  chart-credit: "#2ea98a"
  chart-muted: "#5a6c75"
typography:
  display:
    fontFamily: "Mona Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 5.6vw, 4.75rem)"
    fontWeight: 560
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Mona Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3.4vw, 2.75rem)"
    fontWeight: 560
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Mona Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 560
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Mona Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Mona Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.5
  identifier:
    fontFamily: "Geist Mono Variable, ui-monospace, Menlo, monospace"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: "10px"
  panel: "16px"
  overlay: "20px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    background: "linear-gradient(135deg, #00f2fe, #4facfe)"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  panel:
    backgroundColor: "rgb(13 20 36 / 0.62)"
    border: "1px solid {colors.vault-border}"
    rounded: "{rounded.panel}"
    padding: "24px"
  vault-glass:
    backgroundColor: "{colors.vault-surface}"
    backdropFilter: "blur(24px) saturate(150%)"
    border: "1px solid {colors.vault-border}"
  badge-pending:
    backgroundColor: "#221806"
    textColor: "{colors.pending}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
---

# Design System: RecoveryOS

## Overview

**Creative North Star: "The Sovereign Vault"**

RecoveryOS is a vault you can see into. The canvas is deep space (`#05080e`), lit from above by a soft radial mesh (cyan, blue, a little violet and emerald) and a fine grain. Content sits on acrylic glass: translucent panels with a 1px specular rim, a lit top edge, and on fine pointers a cyan glow that follows the cursor. One electric-cyan gradient marks the action you can take; four status hues tell you, everywhere, what state something is in.

Luxury here means restraint and exactness: tabular figures, slashed zeros on IDs and money, grounded data on every card, and motion that lands rather than bounces. Nothing claims more than the product can deliver.

Dark is the base. A frosted light theme restates every token.

**Key Characteristics:**

- Abyss canvas, glass panels, specular rims. Depth from translucency, rim light and one soft shadow, not from heavy drop shadows.
- One action colour (the cyan gradient) and four status hues with fixed meanings.
- Mona Sans Variable, width and tracking tuned per size; Geist Mono for real identifiers.
- Framer Motion springs for spatial motion, CSS for micro-interactions, GSAP for the authored hero and scroll scenes.

## Colors

### Action

- **Electric Cyan** (`#00f2fe` to `#4facfe`, 135deg): the primary button and the skip link only. Text on it is On-Brand (`#031018`, 7.9 to 13.9:1), in both themes.
- **Signal** (`#4facfe` dark, `#0369a1` light): links, focus ring, active nav, icons that invite action, the "you are here" marker.

### Status (each hue means one thing)

| Tone                         | Fill (spec) | Text (AA)                   | Means                                            |
| ---------------------------- | ----------- | --------------------------- | ------------------------------------------------ |
| Success / Solvency emerald   | `#10b981`   | `#10b981` (light `#047857`) | Confirmed, credited, done                        |
| Pending / Adjudication amber | `#f59e0b`   | `#f59e0b` (light `#92400e`) | In review, waiting on a company, RTA or reviewer |
| Error red                    | `#ef4444`   | `#f87171` (light `#b91c1c`) | A real blocker, a mismatch, a failed read        |
| IEPF legal purple            | `#8b5cf6`   | `#a78bfa` (light `#6d28d9`) | IEPF-5 filing and other regulatory milestones    |
| Active cyan                  | `#00f2fe`   | `#4facfe`                   | In progress, your turn                           |

The spec hues `#ef4444` and `#8b5cf6` are fills (dots, bars, nodes). Their text steps are lighter so small type keeps 4.5:1 on raised glass. `components/case/status-tone.ts` is the one place case data maps to a tone.

### Neutral

- **Ink ladder** 950 / 900 / 850 / 800 (`#05080e` / `#080d17` / `#0d1424` / `#16213a`): page, wells, panel base, raised.
- **Glass**: panel `rgb(13 20 36 / 0.62)`, surface `0.72`, elevated `rgb(22 33 58 / 0.55)`, border `rgb(255 255 255 / 0.08)`, hover border `rgb(56 189 248 / 0.3)`.
- **Text**: fg `#e8eef7` (17:1), fg-2 `#a9b6cb` (9.8:1), fg-3 `#8593aa` (6.4:1; 5.6:1 on raised glass). **Control** `#62738e` (3:1+ for input boundaries).

### Light theme

Page `#f3f6fa`, panels white glass at 0.78, line `#d5dde8`, text `#0a1424` / `#3a4a61` / `#556580`, signal `#0369a1`. Actions keep the cyan gradient with dark text. The WebGL route switches to normal blending.

### Chart steps

Chart Signal / Credit / Muted (`#4f93dc` / `#2ea98a` / `#5a6c75` dark; `#3f7fd0` / `#1f9a7c` / `#8796a0` light), validated for colour-vision deficiency. Fills only.

### Named Rules

**The One Action Rule.** Only the primary button wears the cyan gradient. One primary per view.
**The Status Hue Rule.** A hue is never decoration. Amber always means waiting on someone, purple always means IEPF/regulatory, and so on.
**The Route Gradient Rule.** `--gradient-route` (signal to emerald) belongs to routes and progress lines only.
**The No-Warm Rule.** No cream or beige surfaces. Amber exists only as the pending status.

## Typography

**Display and Body:** Mona Sans Variable. **Identifiers:** Geist Mono Variable.

- **Display** (560, up to 4.75rem, 1.02, stretch 112%, -0.035em): hero, value at stake, KPI figures. The landing headline and section closers may wear `.text-gradient-cyan`.
- **Headline** (560, clamp(1.75rem, 3.4vw, 2.75rem), 1.1, -0.02em).
- **Title** (560, 1.25rem). **Body** (400, 1rem, 1.6, never below 16px). **Label** (500, 0.9375rem; 14px floor for metadata).

### Tabular precision

`.font-tabular` / `.tnum`: tabular, lining figures with a slashed zero, for folio and certificate numbers, money and dates. Count metrics (`MetricCounter` with `kind="count"`) and standalone display numerals ("₹0", "0") use plain tabular digits so a lone zero never reads as Ø.

## Layout

12-column container: 1200px marketing, 84rem app shell (header, case page, evidence room and footer share it). The case page is two panes from lg: **Milestones** (next step, lifecycle tracker, tasks, activity) and the **Document inspector** (forensic page preview, proof cards, quote, holdings, consents). Below lg the panes stack behind a segmented Milestones / Documents switch that sticks to the top; in-page links open the pane that holds their target. No horizontal scroll at 320px.

## Elevation & Depth

- **Panel** (`.panel`): translucent glass, specular rim, a 1px lit top edge. No backdrop blur (the field behind is a soft gradient; blurring it costs GPU and shows nothing).
- **Vault glass** (`.vault-glass`): `blur(24px) saturate(150%)` for surfaces that float over content: the command HUD, the quick-scan bar, sticky chrome.
- **Lift** (`.panel-lift`): rim plus `0 20px 40px -15px rgb(0 0 0 / 0.7)` for the focal card per screen (value at stake, next step, teaser).
- **Hover lift** (`.vault-glass-hover`): -2px, cyan-tinted border and shadow, fine pointers only.

## Shapes

Controls 10px, panels 16px, overlays 20px, status badges and switches are pills. Dashed borders mean planned, not yet, or a tear line on a receipt.

## Components

- **VaultCard** (`components/ui/vault-card.tsx`): `.panel .vault-card`; cursor glow `radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgb(56 189 248 / 0.1), transparent 40%)` plus a lit edge, driven by one listener in `<CursorGlow />`. Props: `as`, `interactive` (hover lift), `lift`.
- **StatusBadge**: tone dot plus a word; pending tones ping (paused under reduced motion).
- **StepBreadcrumb**: numbered nodes joined by route-gradient lines; every reached step is a button; step names stay in the accessible name on phones.
- **MetricCounter**: counts once on view; server-rendered final value; screen readers get only the final value; later changes count from the current number.
- **Buttons**: primary gradient with an inner highlight and cyan glow on hover; outline is elevated glass; `confirm` emerald; `discrepancy` amber. Press `scale(0.97)`.
- **Proof card**: label, value, a grounded line built only from the extraction record ("High confidence · matches the registrar's entitlement letter · p.1"), source and reason, then one Approve / Flag a discrepancy switch. No scores are invented.
- **Lifecycle tracker**: six display stages over the eleven case states, each an accordion showing its states and dates from history. Regulatory stages carry an IEPF tag.
- **Diagnostic receipt**: the check's review step; dashed rules, Edit per row, a perforated tear, and a real SHA-256 fingerprint of the answers.
- **Command HUD**: vault glass over a `backdrop-blur-xl` scrim, spring highlight between rows, full keyboard support.
- **Quick-scan bar**: GET form to `/check`; works without JavaScript; never looks anything up. Holding chips sit two by two until the form is wide enough for one row of pills (a container query, not a breakpoint).
- **Grounding line**: a one-line confidence pill, then the cross-check note and page as plain text that wraps as one run. Data-card grids size to their container (`@container`), never the viewport.
- **Document switcher**: chips above the inspector, a tone dot per read status and a count of details waiting; `?doc=` swaps the inspector in place.
- **Seven-year rule** (landing): seven year tiles, then transfer, Form IEPF-5 and credit. General law only, no case figures.
- **Horizontal scrollers** (`scroll-fade-x` utility): edges fade only while there is more to scroll (scroll-driven animation; a static end fade elsewhere). Scrollers leave room for the focus ring. Used by the mobile nav and the document switcher.

## Motion

- Framer Motion behind `<MotionProvider>` (LazyMotion `strict`, features loaded after hydration, `reducedMotion="user"`). Use `m.*`, never `motion.*`. Springs live in `lib/motion/springs.ts`: `SPRING` (UI), `SPRING_SOFT` (surfaces), `EXIT` (quick, plain).
- Shared layout springs: nav rule, segmented pill, HUD highlight, pane switch, stepper ring.
- The check: steps enter from the side you are heading (x 20, blur 6px), leaving steps are inert while they exit.
- Hover and press stay in CSS (160 to 300ms, `--ease-vault`). GSAP keeps the hero split-line reveal and scroll scenes.
- Arrivals: a detail opened from the palette or a `#field-` link scrolls into view and glows once (no glow under reduced motion).
- Reduced motion: no transforms, no counts, no pings, no scan line; opacity feedback remains.

## Do's and Don'ts

### Do

- **Do** ground every number and label in case data. If the data has no estimate, say "Not started" or "Not estimated yet".
- **Do** keep one primary action per view and one CTA label ("Start the 3-minute check").
- **Do** honour `prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast: more`.

### Don't

- **Don't** invent match percentages, registry lookups, durations or statistics.
- **Don't** use a status hue for decoration, or the cyan gradient on anything but the primary action.
- **Don't** put backdrop blur on every panel; keep it for floating surfaces.
- **Don't** animate layout properties directly; use transforms or Framer layout animations.
