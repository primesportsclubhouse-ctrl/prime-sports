---
name: PrimeSports Clubhouse
description: A pickleball & badminton clubhouse booking platform, lit like a night match under the floodlights.
colors:
  match-point-red: "#c8372d"
  match-point-red-deep: "#b33229"
  court-line-gold: "#d4a359"
  court-line-gold-deep: "#bf914b"
  night-navy: "#0b1b2b"
  clubhouse-cream: "#f5efe6"
  deep-water-surface: "#12283f"
  deep-water-surface-muted: "#1a2838"
  fog-blue-muted: "#9cb0c3"
  hairline-border: "#203c5a"
  inactive-slate: "#546b82"
  confirmation-green: "#22c55e"
typography:
  display:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "clamp(56px, 13vw, 150px)"
    fontWeight: 800
    lineHeight: 0.86
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "clamp(22px, 3vw, 30px)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "0.06em"
  body:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.08em"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontWeight: 500
    letterSpacing: "normal"
  accent:
    fontFamily: "Instrument Serif, Playfair Display, serif"
    fontWeight: 400
    fontStyle: italic
rounded:
  base: "8px"
  pill: "9999px"
spacing:
  section-y-desktop: "80px"
  section-y-mobile: "48px"
  card-padding: "24px"
components:
  button-primary:
    backgroundColor: "{colors.match-point-red}"
    textColor: "{colors.clubhouse-cream}"
    rounded: "{rounded.base}"
    height: "44px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.match-point-red-deep}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.clubhouse-cream}"
    rounded: "{rounded.base}"
    height: "44px"
    padding: "0 20px"
  button-outline-hover:
    textColor: "{colors.court-line-gold}"
  button-navy:
    backgroundColor: "{colors.court-line-gold}"
    textColor: "{colors.night-navy}"
    rounded: "{rounded.base}"
    height: "44px"
    padding: "0 20px"
  button-navy-hover:
    backgroundColor: "{colors.court-line-gold-deep}"
  card-surface:
    backgroundColor: "{colors.deep-water-surface}"
    textColor: "{colors.clubhouse-cream}"
    rounded: "{rounded.base}"
    padding: "{spacing.card-padding}"
  input-field:
    backgroundColor: "{colors.deep-water-surface-muted}"
    textColor: "{colors.clubhouse-cream}"
    rounded: "{rounded.base}"
    height: "48px"
    padding: "0 16px"
---

# Design System: PrimeSports Clubhouse

## Overview

**Creative North Star: "Night Match Under Lights"**

PrimeSports Clubhouse reads as a court after dark — deep navy stands in for the night sky and the shadowed stands, warm cream stands in for the lit playing surface, and the two accents split the emotional register cleanly: match-point red for the moment a customer has to act (book, confirm, a required field), court-line gold for everything that marks progress, state, or a boundary (a filled step, a focus ring, a card's category flag). The site alternates bands of navy and cream section by section — never a gradient blend between them, always a hard cut at a section boundary — the same way a floodlit court reads as one lit rectangle against a dark surround, not a soft fade into it. The header tracks which band sits behind it and flips its own theme to match, so the "lights" are always legible from the chrome down.

The system is unapologetically technical where it wants to be (the survey-plate backdrops, the isometric hero, tabular mono numerics on every price and time slot) and unapologetically direct where the business needs it (uppercase, wide-tracked, high-contrast headings; a single hard-skewed CTA shape reused everywhere someone needs to act). It does not soften into generic SaaS cheerfulness, and it does not cosplay old-money luxury — it's a well-run neighborhood sports club that happens to survey its own courts like a cartographer.

**Key Characteristics:**
- Hard navy/cream section alternation, never a mid-tone blend between them.
- One accent for action (red), one for state/progress (gold) — never swapped.
- Numerics (price, time, booking refs) always render in tabular mono, never the body font.
- A single deliberate shape break — the skewed, folded-corner CTA — against an otherwise uniform 8px-radius world.
- Decorative backdrops read as technical survey plates (grid lines, radiating spokes, grain), not organic texture.

## Colors

Two accents carry distinct, non-overlapping jobs against a navy/cream neutral base; there is no tertiary.

### Primary
- **Match-Point Red** (`#c8372d`): the action color. Primary button fill, the active state on the pricing rate-toggle, "required" field markers, the court-at-capacity warning. Deepens to `#b33229` on hover/press. Because it means "act now," it never decorates a passive element.

### Secondary
- **Court-Line Gold** (`#d4a359`): the state/progress color. Filled step-indicator circles, a pricing card's top accent border, input focus rings and borders, the outline button's hover tint, the "Active"/"Checked In" status-pill fill, the toggle-switch's on-state. Deepens to `#bf914b` on hover/press. It marks *where things stand*, never an action to take.

### Neutral
- **Night Navy** (`#0b1b2b`): the base canvas — page background, and the ink color when a section inverts to the cream band.
- **Clubhouse Cream** (`#f5efe6`): primary text on navy, and the background fill for "cream band" sections (pricing, FAQ) where the roles invert.
- **Deep Water Surface** (`#12283f`): raised surfaces on the navy base — cards, panels, the QR/payment card shell.
- **Deep Water Surface Muted** (`#1a2838`): recessed surfaces on the navy base — input fields, toolbar buttons, the pricing rate-toggle track.
- **Fog Blue** (`#9cb0c3`): secondary/muted text on navy.
- **Hairline Border** (`#203c5a`): the 1px division line between every bordered surface on navy.
- **Inactive Slate** (`#546b82`): disabled/inactive dots and states.
- **Confirmation Green** (`#22c55e`): reserved for success toasts only; not used decoratively.

### Named Rules
**The Two-Accent Rule.** Red means "act," gold means "state." A gold CTA or a red progress indicator is always wrong — check which job the element is doing before picking the accent.

**The Hard-Cut Rule.** Navy and cream sections meet at a section boundary, never a gradient. If a new section needs the cream band, it commits fully (`bg-foreground text-canvas`) and declares `data-nav-theme="light"` so the header flips with it.

## Typography

**Display/Heading Font:** Montserrat (700/800)
**Body Font:** Plus Jakarta Sans (400/500), fallback Inter
**Numeric/Mono Font:** JetBrains Mono (500/600)
**Editorial Accent Font:** Instrument Serif italic (400), fallback Playfair Display italic

**Character:** Montserrat carries every heading uppercase and wide-tracked — confident, a little militant, built for a scoreboard. Plus Jakarta Sans is the quiet, humanist counterweight for anything meant to be read at length or typed into. JetBrains Mono exists for one job only — numbers that must look measured and official (money, time, references) — and never leaks into prose.

### Hierarchy
- **Display** (800, `clamp(56px, 13vw, 150px)`, line-height 0.86, tracking 0.02em): the hero headline only. Tighter tracking than every smaller heading — at this size the letterforms need to hold together, not spread out.
- **Headline** (800, `clamp(22px, 3vw, 30px)`, line-height 1.08, tracking 0.06em): section titles ("Transparent rates by surface & time of day," "A club worth the visit"). Uppercase.
- **Label** (700, 11px, tracking 0.08em, uppercase): eyebrows, form labels, meta rows, pill text.
- **Body** (400/500, 16px, line-height 1.55): paragraph copy, descriptions, form placeholder text.
- **Mono** (500/600, tabular-nums): every price, every rate window, every time slot, every booking reference (`PRS-XXXXXX`), every date in an admin view.
- **Accent** (400 italic, Instrument Serif): reserved for editorial/placeholder flourishes — currently only the muted `[bracketed placeholder]` copy style.

### Named Rules
**The Numerics-On-Mono Rule.** Any value the user might compare, total, or reconcile against a receipt (price, rate, time, reference code) renders in JetBrains Mono with `tabular-nums`. Body-font numerals read as prose, not as data — never mix the two for the same kind of value.

**The Shouting Heading Rule.** Headings are uppercase with positive tracking, always. A sentence-case or tight-tracked heading reads as a bug, not a variant.

## Layout

Three container widths carry every page: narrow (680px, for single-column forms like contact details), default (1200px, the general page width), and wide (1400px, for the admin dashboard's calendar). All three gutter to 24px of side padding, dropping to 16px under 640px.

The page is a stack of full-bleed sections, each independently declaring its band (navy or cream) and its decorative backdrop variant, bordered top-to-bottom by hairline dividers rather than by whitespace gaps. Section padding is generous and consistent — 80px vertical on desktop, dropping to 48px under 640px — so the rhythm reads as "one plate, one section" rather than a dense scroll.

Responsive behavior is authored per-component at the exact pixel where that component's content starts to break, via Tailwind's arbitrary `max-[Npx]` selectors (640, 768, 920, 480, 560 all appear), rather than snapping every component to a shared sm/md/lg scale. A grid collapses to one column, a nav collapses to its mobile drawer, and a heading steps down in size all at their own natural pixel — not at a single global breakpoint.

## Elevation & Depth

The system is border-first, not shadow-first: a 1px `hairline-border` line does most of the work separating one surface from another. Shadows are a soft, deep, navy-tinted ambient glow (`rgba(2, 8, 18, …)`) layered on top of that border — never a hard drop shadow, and never the primary signal that something is raised.

### Shadow Vocabulary
- **shadow-sm** (`0 10px 24px rgba(2, 8, 18, 0.18)`): the resting state for most cards, panels, and buttons.
- **shadow-md** (`0 18px 40px rgba(2, 8, 18, 0.24)`): a step up for content meant to feel more prominent (pricing cards) or for a button on hover/press.
- **shadow-lg** (`0 28px 60px rgba(2, 8, 18, 0.32)`): reserved for the hero's tilted image plate — the single most "lifted" object on the site.

### Named Rules
**The Glow-Not-Lift Rule.** Interactive focus and selection states (an input's focus ring, a glinting survey line) are communicated with a soft colored glow (`box-shadow` spread in gold or cream, no offset) rather than a change in elevation. Elevation is for static hierarchy; glow is for "this is active right now."

## Shapes

The base radius is 8px (`--radius`), applied uniformly to every card, panel, button, input, and toolbar control — there is no secondary radius scale. Circles are reserved for identity/state markers only: step-indicator dots, roster avatar initials, status-pill dots, the toggle-switch thumb. A rounded rectangle means "container"; a circle means "a person or a state."

Exactly one shape breaks this grid on purpose: the site's call-to-action is a parallelogram, skewed -11° with a clipped, folded-corner ribbon detail at its top edge — used identically on the hero, the desktop header, and the mobile menu, so the shape, angle, and hover fill-timing never drift between instances. It is the one place the system allows itself an assertive, non-orthogonal gesture, which is exactly why it must never be diluted onto a second element.

## Components

### Buttons
- **Shape:** 8px radius, min-height 44px, `-translate-y-px` lift + shadow step-up on hover, 40% opacity + no pointer events when disabled.
- **Primary:** Match-Point Red fill, cream text, deepens to `#b33229` on hover. The single "act now" affordance — reserve, submit, confirm.
- **Outline:** transparent fill, cream border and text; hover tints toward Court-Line Gold border/background/text. The secondary, lower-commitment action.
- **Navy (gold-filled):** Court-Line Gold fill, navy text, deepens to `#bf914b` on hover. Used sparingly for admin-context primary actions on the wide dashboard container.
- **Toolbar icon/text buttons:** smaller (min-height 30–32px), muted-surface fill, same hover-to-gold-border language — the compact variant for calendar nav and card-level actions ("Save QR," "Back").

### The Skew CTA (signature component)
A parallelogram button (-11° skew, folded top-right corner via `clip-path`) that fills solid red on hover and carries an uppercase, wide-tracked (0.16em) label counter-skewed back to horizontal so the text stays legible. Ships in a `default` tone (cream fill / navy text, for navy sections) and an `invert` tone (navy fill / cream text, for cream sections) so it always reads correctly against whichever band it lands on. This is the one recognizable shape of the whole product — do not introduce a second skewed or ribboned element elsewhere.

### Cards / Panels
- **Corner style:** 8px radius, always.
- **Background:** Deep Water Surface on navy sections.
- **Border:** 1px Hairline Border on all four sides — flat and uniform. Category/identity differentiation never lives in the border color; use the Sideline Stripe below, or content structure, instead.
- **Shadow strategy:** shadow-sm at rest, shadow-md for content meant to feel more important (pricing).
- **Internal padding:** 24–28px desktop, dropping ~4-8px under 640px.

### Sideline Stripe (signature detail)
A thin (3px), dashed gold rule along a card's top edge — a `repeating-linear-gradient` segment pattern, never a solid `border-top` — used on the pricing cards and the location panel. It reads as painted court boundary paint, not the flat "accent top-border on a rounded card" template default. Gold-only by design: red never appears here, since red is reserved for action and a card's identity is not an action. Where two peer cards need telling apart (Pickleball vs. Badminton), differentiate through content — a mono court-count signage plate in the header — never through a second accent hue on the border.

### Inputs / Fields
- **Style:** Deep Water Surface Muted background, 2px Hairline Border (heavier than a card's 1px, since a field's boundary has to read as interactive), 8px radius, 48px min-height.
- **Focus:** border flips to Court-Line Gold plus a soft gold glow (`0 0 0 4px rgba(212,163,89,0.12)`) — the Glow-Not-Lift rule in practice.
- **Labels:** 11px bold uppercase, 60% opacity, with an inline red "required" tag rather than an asterisk.

### Status Pills & Toggles
- **Status pill:** full-radius pill, small leading dot + uppercase label; gold fill/border when active or checked-in, muted-surface/gray when pending or inactive.
- **Toggle switch:** pill track (gold when on, border-tone when off) with a circular cream thumb that translates — used for the roster's organizer "activate session" control.

### Navigation
The sticky header tracks which section is currently scrolled behind it (via each section's `data-nav-theme="dark"|"light"` attribute) and cross-fades its own background, border, and button coloring to match — navy chrome on a navy section, cream chrome on a cream one — so the header never fights the band it's floating over. Desktop center nav uses a pill-style "tubelight" indicator under the active link; mobile collapses to a drawer sharing the same Skew CTA for its primary action.

### QR / Payment Card
A cream-background card (regardless of the surrounding section's theme — payment context always stays in the light/cream register for scan-ability) holding a deterministic pixel-grid "QR" rendered as inline SVG with corner finder-pattern stamps, the channel name in heading type, and a mono-labeled account string below.

### Booking Steps (signature component)
A horizontal step tracker (Details → Date → Court & Time → Confirm) of numbered circles connected by hairline segments. A step's circle fills gold and its number cross-fades to a checkmark (Framer Motion scale/opacity, 220ms ease-out) the moment it's completed — the only micro-interaction in the system built on a spring-like scale-in rather than a simple opacity fade.

### Survey-Plate Backdrops (signature component)
Three decorative, `aria-hidden` full-bleed backdrops sit behind section content, always paired with `relative z-10` content on top:
- **Grid:** an orthogonal drawn-line grid (72px cells, 44px on mobile) with a handful of "glint" lines that slowly brighten and travel exactly one grid-step at a time, timed so a glint only ever moves while invisible.
- **Stellar:** concentric rings and 30 radiating spokes from one origin point, pulsing and sweeping on the same never-caught-mid-motion timing logic.
- **Grain:** static, direction-less fractal noise at 3% opacity — used on cream sections instead of linework, to add tooth without competing with the inverted palette.

All three read as technical survey/cartography plates, not ambient decoration — they reinforce the "surveyed court" half of the North Star.

### Halide Topo Hero (signature component)
The homepage hero: a desaturated, high-contrast, isometric court photograph mounted as a tilted "plate" that tracks the cursor with a real perspective-matrix transform (roll -21°, cursor-driven tilt ±17°/23°, spring-back release), complete with a cursor-following specular glare and an autonomous rally ball that bounces between isometric court coordinates forever. The oversized display headline (up to 150px) sits statically on top, immune to the plate's motion. This is the most expensive, most bespoke moment in the product — it should stay unique to the homepage, not get reused or diluted into a smaller pattern.

## Do's and Don'ts

### Do:
- **Do** keep every price, time slot, and reference code in JetBrains Mono with `tabular-nums`.
- **Do** use Match-Point Red only for something the visitor is being asked to act on right now.
- **Do** use Court-Line Gold only to mark progress, selection, or focus state.
- **Do** declare `data-nav-theme` on every new top-level section so the sticky header keeps tracking correctly.
- **Do** keep the 8px radius uniform across cards, buttons, panels, and inputs.
- **Do** reuse the existing Skew CTA component for any new primary call-to-action rather than styling a bespoke button.
- **Do** use the Sideline Stripe, not a solid colored `border-top`, for any card that wants a top-edge accent detail.

### Don't:
- **Don't** blend navy and cream with a gradient at a section boundary — the cut is always hard.
- **Don't** introduce a second skewed/ribboned shape; the Skew CTA is the one deliberate break in an otherwise orthogonal, 8px-radius system.
- **Don't** swap the two accents' roles (a gold CTA, a red progress bar) — that breaks the Two-Accent Rule.
- **Don't** render a price, time, or booking reference in the body font — it will read as prose instead of data.
- **Don't** add a hard drop-shadow anywhere; depth stays soft, ambient, and navy-tinted.
- **Don't** put a solid colored border on a rounded card to flag a category — it's the single most recognizable AI-generated-UI tell; use the Sideline Stripe or content structure instead.
- **Don't** decorate a passive label or category flag with red — red is action-only, with zero exceptions.
