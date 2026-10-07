# RecoveryOS design system (MASTER)

Single source of truth for every visual and motion decision. Tokens live in
`app/globals.css` and mirror this file; `design/recoveryos.dna.json` is the same
system in Design DNA form. When code and this file disagree, fix one of them.

## Theses

**Visual.** Dark precision interface on cool ink, one electric-blue signal and
mint-teal reserved for confirmed facts; a single grotesk (Mona Sans, widened for
display) with mono only for real identifiers; spacious 4px rhythm with
macro-whitespace; flat 12px panels with 1px hairlines and an inset top
highlight, 8px controls, full-pill badges.

**Interaction.** Marketing gets one authored focal sequence (the route draws
through the record field while the headline settles, 0.8-1.6s expo.out) that
scroll then carries through one pinned sequence; UI feedback runs 160-220ms on
`cubic-bezier(0.23, 1, 0.32, 1)`; hover is colour/opacity only on fine pointers;
product screens get no scroll reveals. Forbidden: bounce and elastic, `scale(0)`,
`ease-in` on UI, idle loops, parallax layers, custom cursors, glows, gradient text.

## Colour

| Token | Hex | Use | Contrast on page |
| --- | --- | --- | --- |
| `ink-950` | `#0B1114` | page ground | - |
| `ink-900` | `#10181C` | raised band | - |
| `ink-850` | `#141E23` | panel | - |
| `ink-800` | `#1A262C` | elevated, hover | - |
| `line` | `#223038` | hairlines (decorative) | 1.4 |
| `control` | `#5E717A` | input and control borders | 3.3-3.7 |
| `fg` | `#E6EDEF` | primary text | 16.1 |
| `fg-2` | `#A3B3B9` | secondary text | 8.8 |
| `fg-3` | `#8699A0` | metadata | 6.4 |
| `signal` | `#7CB8FF` | action, active progress, links, focus | 9.2 |
| `signal-strong` | `#9CCAFF` | signal hover | 11.1 |
| `on-signal` | `#07121C` | text on signal fills | 9.1 on signal |
| `confirmed` | `#5CD3B4` | confirmed states only | 10.4 |
| `blocker` | `#FF7A72` | real blockers only | 7.5 |

One accent, locked. No warm, cream, brass or yellow values anywhere. Status is
never colour alone: every badge carries an icon and a word.

## Type

- Family: `Mona Sans Variable` for everything; `Geist Mono Variable` only for
  folio, certificate, DP/Client IDs, SHA-256, service request and receipt IDs.
- Display `clamp(2.5rem, 6vw, 4.75rem)` / 560 / 1.02 / -0.035em, stretch 112%.
- H1 `clamp(2rem, 4vw, 3rem)` / 560 / 1.08 / -0.03em, stretch 108%.
- H2 `clamp(1.5rem, 2.6vw, 2rem)` / 560 / 1.15 / -0.02em, stretch 106%.
- H3 `1.1875rem` / 600 / 1.3 / -0.01em.
- Body 16px / 400 / 1.6. Small 15px (metadata only). Caption 14px.
- Tabular lining numerals on every date, amount and count.
- No eyebrows. No tracked uppercase labels above headings. No em dashes.

## Space, shape, depth

- 4px base; 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Marketing sections 96-128px desktop, 72px mobile. Product blocks 24-40px.
- Radius: controls 8px, panels 12px, badges full pill. Nothing else.
- Depth: surface steps plus `inset 0 1px 0 rgb(230 237 239 / 0.05)`; large
  surfaces add `0 32px 64px -24px rgb(2 6 8 / 0.85)`. No zero-offset halos.
- Sticky chrome is translucent (`backdrop-filter: blur(16px)`), solid under
  `prefers-reduced-transparency`.

## Motion

| Token | Value | Use |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | all UI enter and state |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | on-screen moves, clip reveals |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | panel swaps |
| `--dur-press` | `160ms` | press feedback |
| `--dur-state` | `220ms` | state changes, step changes |
| `--dur-exit` | `150ms` | exits (opacity only) |
| GSAP focal | `expo.out`, 0.9s lines, 1.6s route | marketing hero only |

Vocabulary used: masked rise (reveal), line drawing, scroll-driven animation,
stagger (30-60ms, capped 400ms), press feedback, direction-aware transition,
continuity transition, blur-masked crossfade.

Reduced motion: no WebGL animation (one static frame), no scrub or pin, no
travel; opacity and colour transitions stay. Loops: none. The WebGL renderer
draws only while a value is changing and stops offscreen or in a hidden tab.

## Components

- **Button.** Primary: signal fill, `on-signal` label, 8px, press `scale(0.97)`.
  Secondary: 1px `control` border. Link: underline offset 0.22em.
- **Panel.** `ink-850`, 1px `line`, 12px, top highlight. Cards only for real
  hierarchy; never nested.
- **Badge.** Full pill, icon + word. Signal = in progress, confirmed = done,
  blocker = real blocker, neutral otherwise.
- **Field.** Label above, hint, input (`ink-900`, 1px `control`), error below.
- **Proof entry.** Label, value (mono only if an identifier), source line,
  confidence line, cross-check line, then actions. Gaps read "Not found".

## Icons

Phosphor (`@phosphor-icons/react`), regular weight in UI, bold for status
markers; 16/20/24px. One family only.
