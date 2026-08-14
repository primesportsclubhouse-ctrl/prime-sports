---
target: gold and red accent colors (Match-Point Red / Court-Line Gold)
total_score: 5
max_score: 8
na_heuristics: 1,2,3,5,6,7,9,10
p0_count: 0
p1_count: 2
timestamp: 2026-08-12T16-30-21Z
slug: colors-match-point-red-court-line-gold-accent-pair
---
## Design Health Score (scoped)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 4 | Consistency and Standards | 2.5/4 | The Two-Accent Rule is documented but not enforced — red decorates a passive category flag and a static role label; gold has absorbed ~9 unrelated jobs. |
| 8 | Aesthetic and Minimalist Design | 2.5/4 | Two-hue restraint is real at the token level, but gold's job-count erodes it into "the theme's default secondary color" at the application level. |
| 1,2,3,5,6,7,9,10 | (all others) | n/a | Out of scope — this critique is scoped to the accent-color pairing, not full page usability. |

**Total: 5/8 applicable (62.5%) — Acceptable.** Renormalized to the 2 heuristics that actually apply to a color-pair-only critique.

## Design Specificity Verdict

**The hue choice is not the AI-slop signature the client suspected. The application pattern is — and the detector proves it.**

The canonical "AI color palette" tell the bundled detector watches for is purple/violet gradients paired with cyan-on-dark. `#c8372d` (a muted brick-red) and `#d4a359` (a muted ochre-gold) sit well outside that signature — both desaturated, warm-leaning, and both deepen (not lighten) on hover, which reads as tactile/material rather than screen-native. Zero `ai-color-palette` or `cream-palette` findings fired anywhere in the codebase. On hue alone, red-for-action/gold-for-state is a defensible, on-theme choice tied to DESIGN.md's "Night Match Under Lights" rationale.

**But the deterministic scan confirms a real, separate problem: the *shape* these colors are deployed in.** The static detector flagged `border-accent-on-rounded` — "thick accent border on a rounded card... the most recognizable tell of AI-generated UIs" — twice, both real, no false positives:
- `components/prime-sports/home/pricing-cards.tsx:79` — the 2px gold/red top border on the rounded pricing cards.
- `components/prime-sports/home/location-panel.tsx:41` — the 2px gold top border on the rounded "Visit the Club" panel.

That's the mechanism behind the client's instinct: a rounded-8px card with a colored top-border "flag" plus pill toggles plus a soft glow-on-focus is the default shape grammar nearly every AI-scaffolded template currently outputs, regardless of which two hues get dropped into the primary/secondary tokens. Red and gold aren't the tell; the *border-flag-on-rounded-card* pattern they're carried in is.

This is compounded by the system not fully following its own documented rule: DESIGN.md states red "never decorates a passive element," yet the badminton pricing card uses red as a passive category flag (no action involved) — the exact card the detector also flagged. Detector evidence and independent design judgment converge on the same file and line.

## Overall Impression

The palette's *reasoning* is specific to the product; its *execution* currently is not. Fixing the enforcement gap (red-as-passive-flag) and the border-flag shape (the one thing the detector actually catches) will do more to kill the "vibe coded" feeling than changing either hue would.

## What's Working

1. Desaturated, earth-toned hex values avoid the neon/screen-native tell — `#c8372d`/`#d4a359` read as tungsten-floodlight warm, not stock Bootstrap red or stock gold.
2. A genuinely named, semantic two-accent system exists (the Two-Accent Rule: red = act, gold = state) rather than an unlabeled primary/secondary pair.
3. Consistent, physically-plausible hover behavior — both accents deepen on press across every instance checked, giving interactive states a "pressed into material" quality.

## Priority Issues

**[P1] Red decorates a passive category flag, contradicting the system's own rule — and the detector independently flags the same line.**
`components/prime-sports/home/pricing-cards.tsx:23,31,79` assigns red to the badminton card's top border purely to distinguish two menu categories — no action involved. DESIGN.md says red "never decorates a passive element." The static detector's `border-accent-on-rounded` finding lands on this exact component. This is the single clearest piece of evidence a skeptical reviewer would cite that the accent system is decorative, not enforced.
**Why it matters**: it's on the homepage pricing section — the highest-traffic proof point for whether the brand system is real or just recolored defaults.
**Fix**: drop the red top border on the badminton card; differentiate pickleball/badminton via icon or copy instead of a colored border, or use gold for both. Keeps red's footprint 100% action-only, zero exceptions.
**Suggested command**: `/impeccable quieter` (scoped to `pricing-cards.tsx` and `location-panel.tsx`) or a direct fix now.

**[P1] The border-flag-on-rounded-card shape is the actual generic-AI tell, independent of which colors fill it.**
Both real detector hits (`pricing-cards.tsx:79`, `location-panel.tsx:41`) are the same shape: 2px colored top border on an 8px-rounded card. This exact vocabulary is the default output of current AI-scaffolding tools. Swapping red/gold for any other two hues would not fix this — the shape itself is the tell.
**Why it matters**: this is the mechanism behind the client's "vibe code" instinct, one layer below the hue choice they asked about.
**Fix**: replace the solid top border with something that couldn't come from a generic template default — e.g. a dashed/segmented stripe echoing court sideline paint, or drop the border entirely and differentiate cards by icon/typographic weight instead.
**Suggested command**: `/impeccable typeset` or `/impeccable layout` on the pricing cards, then `/impeccable polish`.

**[P2] Gold has been overloaded into ~9 unrelated jobs, diluting it into a generic secondary token.**
Gold currently fills: focus rings, step-indicator circles, category flags, status-pill fills, toggle on-states, progress bars, a player-avatar circle, a static QR-card border, and a "Get Directions" link color (`contact-details-client.tsx:20`, `booking-steps.tsx:34`, `pricing-cards.tsx:23`, `roster-client.tsx:81,106,129,155,162`, `qr-code-card.tsx:58`, `location-panel.tsx:41,56,84`).
**Why it matters**: the more jobs one hue does, the less any single appearance of it signals something specific — this is exactly how a scoped accent becomes indistinguishable from a theme's default `--secondary` token.
**Fix**: reclassify the avatar-circle fill and the QR-card's static border to neutral treatments (`border-border`/`bg-surface-muted`), reserving gold strictly for genuine mid-state/in-progress signals. Roughly halves gold's job count.
**Suggested command**: `/impeccable distill` scoped to gold's usage sites.

**[P3] `.faq-beam` mixes both accents in one decorative gradient, contradicting the "never overlap" narrative.**
`app/globals.css:176-186`'s conic gradient blends gold and red in a single ambient sweep — the only place the two accents literally co-occur. Low-opacity and `aria-hidden`, so harm is minimal, but it's a crack in the "two accents, non-overlapping jobs" claim a skeptical reviewer would pair with the P1 finding.
**Fix**: make the beam monochrome (cream/foreground only, matching the grid/grain/stellar backdrops elsewhere), keeping accent hues reserved for interactive/informational elements only.
**Suggested command**: direct fix, small enough to skip a dedicated command.

**[P3] Red-as-passive-label recurs beyond the pricing card.**
`components/prime-sports/roster/roster-client.tsx:102` renders the static "Admin / Tournament Organizer" descriptor in `text-accent` (red) — not an action, just a role label. Individually trivial, but combined with P1 it shows a pattern of reaching for red for emphasis regardless of whether it's actually an action.
**Fix**: audit every `text-accent`/`bg-accent`/`border-accent` usage against "is the user being asked to act right now" and reclassify non-matches to bold + `text-foreground`.
**Suggested command**: `/impeccable audit` scoped to accent-color usage.

## Persona Red Flags

**The design-literate visitor who's seen a hundred AI-generated sites**: won't clock "red and gold" as the tell — they'll clock the rounded-8px card + colored top-border flag + pill toggle + soft focus-glow combination, which is the default shape grammar of current AI-scaffolded templates regardless of hue. They'd ask why a pickleball club's pricing section is structurally identical to a SaaS pricing page. This confirms the client's instinct is picking up on something real, one layer below color.

**A red-green color-vision-deficient user** relying on hue alone: under deuteranopia/protanopia, `#c8372d` and `#d4a359` can compress toward similar muddy orange-brown tones. Today this is mitigated everywhere checked because every colored element pairs with a text label ("required," "Active," "Court at capacity") — but the system survives CVD only because copy happens to back up color, not because the palette itself is CVD-robust.

## Minor Observations

- Zero `dark-glow`/`radial-halo`/`radial-spotlight-glow` findings fired anywhere — the survey-plate backdrops and hero specular glare are cream/ivory-toned, not accent-colored, so they don't implicate red/gold in decorative-glow slop. The one accent-colored glow in the system (the gold input focus ring, `contact-details-client.tsx:20`, a zero-offset `rgba(212,163,89,0.12)` box-shadow) technically matches the literal shape of the `dark-glow` rule, though it serves a real accessibility purpose the rule doesn't carve out — a borderline case, not a clean hit.
- `confirmation-green` (`#22c55e`) is essentially Tailwind's stock `green-500` — the one fully generic, interchangeable color in the palette. Out of scope here since it's not one of the two accents in question, but a cheaper target than touching red/gold if the client wants to invest further in color specificity.
- The detector's other 59 findings on these files are all `design-system-font-size` advisories (literal px sizes off DESIGN.md's type ramp) — unrelated noise for this critique, not enumerated.

## Questions to Consider

1. If you stripped all color and left only shapes, spacing, and copy, would a stranger still know this is a pickleball club rather than a scheduling SaaS? If not, is that actually a color problem, or is the rounded-card-plus-top-border-flag vocabulary underneath the color the generic part?
2. Would you rather (a) keep red and gold exactly as they are but push their application toward literal court signifiers (sideline-stripe borders, scoreboard-adjacent treatments), or (b) keep the same act/state two-role system but re-derive the hues directly from your venue (actual court paint, jerseys, floodlights) rather than an abstract "warm + gold" choice?
3. Would fixing the P1 violation (red as a passive pricing-card flag) alone make the site feel less generic — or does most of the "vibe coded" feeling come from the border-flag-on-rounded-card shape itself, independent of which two colors fill it?
