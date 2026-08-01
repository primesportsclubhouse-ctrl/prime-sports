---
name: typography-enforcer
description: 'Enforce Prime Sports typography hierarchy in Next.js and Tailwind UI edits. Use when adding or reviewing headings, body copy, forms, numerics, pricing, time slots, and badge accents.'
argument-hint: 'Scope to audit, for example: app/page.tsx and reserve flow'
user-invocable: true
---

# Typography Enforcer

Industry Standard: This skill validates and applies the Prime Sports typography hierarchy for all UI updates.

## Source Of Truth

- Typography policy: [AGENTS.md](../../../AGENTS.md)
- Global tokens and theme bridge: [app/globals.css](../../../app/globals.css)
- Font loading and CSS variables: [app/layout.tsx](../../../app/layout.tsx)

## When To Use

- Before or after editing route files in `app/`.
- Before or after editing UI in `components/prime-sports/`.
- During PR review when typography drift is likely.

## Required Hierarchy

Industry Standard rules:

1. Primary Headers (`h1`, `h2`, hero)
   - `Montserrat`, weight `700` or `800`
   - Uppercase with wider tracking
2. Body Copy and Form Inputs
   - `Plus Jakarta Sans` fallback `Inter`
   - Weight `400` or `500`
3. Numerics, Pricing, and Time Slots
   - `JetBrains Mono` fallback `Space Grotesk`
   - Weight `500` or `600`
4. Editorial Accent or Sub-badges (optional)
   - `Instrument Serif` fallback `Playfair Display`
   - Italic, weight `400`

## Procedure

1. Classify text nodes by role: header, body/input, numeric/time, editorial accent.
2. Inspect current font usage and utility classes in the target files.
3. Flag any mismatch between role and assigned typography.
4. Propose minimal edits that reuse existing tokens and class primitives.
5. If adding new font variables is unavoidable, add them in [app/layout.tsx](../../../app/layout.tsx) and map in [app/globals.css](../../../app/globals.css).
6. Re-check responsive views so hierarchy remains legible on mobile and desktop.

## Output Format

Return the result in this format:

- `Industry Standard Findings`
  - `Pass`: concise list of compliant areas
  - `Violations`: file + element + rule broken + exact fix
- `Industry Standard Patch Plan`
  - smallest edit set to restore hierarchy
- `Residual Risks`
  - anything that still needs product/design confirmation

## Guardrails

- Do not invent new ad-hoc font stacks in component files.
- Do not weaken header contrast with medium-only heading weights.
- Do not use non-mono fonts for prices, refs, or time values.
- Keep changes small and local; avoid broad refactors unless asked.
