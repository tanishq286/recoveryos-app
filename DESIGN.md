---
name: RecoveryOS
description: Calm, precise, clinical-tech. Deep ink base, one signal-blue accent, richness from motion and craft.
colors:
  ink-950: "#0b1114"
  ink-900: "#10181c"
  ink-850: "#141e23"
  ink-800: "#1a262c"
  line: "#223038"
  control: "#5e717a"
  fg: "#e6edef"
  fg-2: "#a3b3b9"
  fg-3: "#8699a0"
  signal: "#7cb8ff"
  signal-strong: "#9ccaff"
  on-signal: "#07121c"
  signal-wash: "#13263a"
  confirmed: "#5cd3b4"
  confirmed-wash: "#10281f"
  blocker: "#ff7a72"
  blocker-wash: "#2c1515"
typography:
  display:
    fontFamily: "Mona Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 5.6vw, 4.5rem)"
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
  control: "8px"
  panel: "12px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.signal-strong}"
  button-outline:
    backgroundColor: "{colors.ink-900}"
    textColor: "{colors.fg}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  panel:
    backgroundColor: "{colors.ink-850}"
    textColor: "{colors.fg}"
    rounded: "{rounded.panel}"
    padding: "24px"
  badge-progress:
    backgroundColor: "{colors.signal-wash}"
    textColor: "{colors.signal}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  badge-confirmed:
    backgroundColor: "{colors.confirmed-wash}"
    textColor: "{colors.confirmed}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  badge-blocker:
    backgroundColor: "{colors.blocker-wash}"
    textColor: "{colors.blocker}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  input:
    backgroundColor: "{colors.ink-900}"
    textColor: "{colors.fg}"
    rounded: "{rounded.control}"
    padding: "12px"
---

# Design System: RecoveryOS

## Overview

**Creative North Star: "The Precision Statement"**

RecoveryOS reads like a depository holding statement rendered as software: ruled, exact, unhurried. The base is deep ink, never pure black. A single cool accent, signal blue, marks what is live or actionable. Everything else is quiet text on layered ink. Richness comes from motion and craft (a route drawn through a field of records, line masks, a receipt that prints in), never from density or decoration.

The system is dark-only by brief. It is minimalist on purpose: generous whitespace, one idea per section, hairlines instead of boxes where possible. Trust is the product, so nothing in the interface claims more than the product can deliver.

**Key Characteristics:**

- Deep ink grounds with tonal layering; depth from borders and one lift shadow, not glow.
- One locked accent. Mint (confirmed) and coral (blocker) are semantic only.
- Mona Sans Variable with width and tracking tuned per size; Geist Mono only for real identifiers.
- Motion is transform and opacity only, with one signature easing family.

## Colors

A near-monochrome ink ladder with one cool accent and two semantic colors. All text pairs meet WCAG AA on their grounds.

### Primary

- **Signal Blue** (#7cb8ff): the only accent. Primary buttons, active step, focus ring, links on hover, "waiting for you" states. Hover lifts to Signal Strong (#9ccaff). Text on it is On-Signal (#07121c, 9.1:1).

### Secondary

- **Confirmed Mint** (#5cd3b4): completed steps, confirmed details, "Checked". Never decorative.
- **Blocker Coral** (#ff7a72): real blockers and errors only.

### Neutral

- **Ink 950 / 900 / 850 / 800** (#0b1114 / #10181c / #141e23 / #1a262c): page, wells, panels, raised chips.
- **Line** (#223038): hairlines and dividers. **Control** (#5e717a): input and control boundaries (3:1 for 1.4.11).
- **Foreground** (#e6edef, 16:1), **Foreground 2** (#a3b3b9, 8.8:1), **Foreground 3** (#8699a0, 6.4:1): primary, supporting and metadata text.
- Washes (#13263a, #10281f, #2c1515) fill badges and alerts behind their semantic color.

### Named Rules

**The One Voice Rule.** Signal blue is the only accent. Mint and coral carry state, never decoration.
**The No-Warm Rule.** No cream, beige or yellow anywhere. The palette stays cool.

## Typography

**Display and Body Font:** Mona Sans Variable (fallback ui-sans-serif, system-ui)
**Mono Font:** Geist Mono Variable, for identifiers only

**Character:** One variable family does both jobs. Width and tracking shift with size: wide and tight at display, neutral at body.

### Hierarchy

- **Display** (560, clamp(2.5rem, 5.6vw, 4.5rem), 1.02, stretch 112%, -0.035em): the landing hero only.
- **Headline** (560, clamp(1.75rem, 3.4vw, 2.75rem), 1.1, stretch 106%, -0.02em): section and page headings.
- **Title** (560, 1.25rem, 1.3): panel and list headings.
- **Body** (400, 1rem, 1.6): never below 16px; prose max about 65ch.
- **Label** (500, 0.9375rem): metadata, badges, table headers. 14px is the floor, for metadata only.
- **Identifier** (Geist Mono, 0.9375rem, tabular): folio and certificate numbers, SHA-256, receipt ids.

### Named Rules

**The Real Identifier Rule.** Mono is for strings a person might copy or compare. Never for emphasis or "technical feel".
**The No Eyebrow Rule.** No small uppercase kickers above headings.

## Layout

Single-column editorial on mobile, widening to a 12-column container (max 72rem marketing, 80rem product) at lg. Sections are separated by whitespace and hairlines, not stacked cards. Product screens use a left reading column and a right evidence column at lg and above; the evidence room splits only at xl. Spacing runs on a 4px base with generous section rhythm (roughly 96px between marketing sections). The header is sticky only at lg; on phones it scrolls away to keep the viewport for content.

## Elevation & Depth

Tonal layering first: ink-950 page, ink-900 wells, ink-850 panels, ink-800 raised chips, each with a 1px line border and a faint top highlight. One lift shadow exists for the single focal panel per screen.

### Shadow Vocabulary

- **Highlight** (`inset 0 1px 0 rgb(230 237 239 / 0.05)`): top edge on every panel.
- **Lift** (`inset 0 1px 0 rgb(230 237 239 / 0.05), 0 32px 64px -24px rgb(2 6 8 / 0.85)`): the next-step card and the receipt.

### Named Rules

**The One Lift Rule.** At most one lifted panel per screen. Everything else is flat on its ink step.

## Shapes

Precise, small radii. Controls use 8px, panels 12px, status badges are pills. Borders are 1px; dashed borders mean "planned" or "not yet", never decoration. No side stripes over 1px, no nested cards.

## Components

### Buttons

- **Shape:** 8px radius, min 44px touch height.
- **Primary:** Signal Blue fill, On-Signal text. Hover lifts to Signal Strong. One primary per view.
- **Outline / Ghost:** ink-900 fill with a control border, or text-only.
- **Press:** `scale(0.97)` over 160ms with the out-curve. Hover effects exist only on hover-capable pointers.

### Cards / Containers

- **Panel:** ink-850, 1px line, 12px radius, 24px padding, highlight shadow. Blocked panels use a coral border at 50%.

### Badges

Pill, always a word plus an icon, never color alone. Variants: neutral, progress (signal), confirmed (mint), blocker (coral), outline.

### Inputs / Fields

- **Style:** ink-900 fill, control border, 8px radius, 48px min height. **Focus:** 2px signal outline, 3px offset. **Error:** coral border plus an icon and message.

### Status rail and receipt (signature)

The case status rail draws done steps in mint with a check, the current step as a ringed signal marker, blockers in coral. The assessment receipt prints its lines in order with a clip-path reveal and states "never, not queried" for sources not connected.

## Do's and Don'ts

### Do:

- **Do** keep one primary action per view and one CTA label ("Start the 3-minute check").
- **Do** animate transform and opacity only, with `cubic-bezier(0.23, 1, 0.32, 1)` for entrances and 160 to 260ms for UI.
- **Do** honor `prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast: more`.
- **Do** write only copy the product can fully deliver, with synthetic data labeled as such.

### Don't:

- **Don't** add cream, beige or yellow, or a second accent.
- **Don't** put an eyebrow above a heading, use em or en dashes in visible copy, or use decorative dots.
- **Don't** build fake product UI out of divs in marketing, or three equal feature cards in a row.
- **Don't** animate layout properties or add scroll reveals to functional product screens.

Not canonized (defects carried by the build, not rules): none recorded at the craft-floor level; the landing "How it works" index uses small dot nodes as scroll-progress markers, which is functional state, not decoration.
