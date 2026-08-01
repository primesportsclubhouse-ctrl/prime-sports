<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Commands

- Use `pnpm` for all package and script execution in this workspace.
- Run `pnpm dev` for local development.
- Run `pnpm lint` before finishing any non-trivial UI or logic change.
- Run `pnpm build` for release-level validation.
- There is currently no test script in `package.json`; do not claim automated test coverage unless tests are added and run.

## Codebase Boundaries

- `app/` route files should compose page structure, metadata, and section wiring only.
- `components/prime-sports/` should contain reusable UI and interactive client modules.
- `lib/prime-sports.ts` is the shared source of UI class primitives, common types, and deterministic helper data.
- Reuse existing primitives before introducing new one-off class patterns.

## Styling and Theme Rules

- Treat `app/globals.css` as the source of truth for theme tokens.
- Keep Tailwind v4 CSS-first patterns (`@import "tailwindcss"`, `@theme inline`) intact unless a migration is explicitly requested.
- Extend theme tokens in `app/globals.css` first; avoid scattering hard-coded colors and typography values.

## Responsive Compliance (Mandatory for Copilot and Other Agents)

- All UI work must be responsive by default and validated for mobile, tablet, laptop, and desktop layouts.
- Use mobile-first patterns and Tailwind breakpoints to progressively enhance layouts without causing overflow or clipped content.
- Do not ship screen-specific regressions: navigation, forms, tables/cards, and call-to-action controls must remain usable at all supported viewport sizes.

## Primary Typography Hierarchy (Enforce Across All Screens)

Apply this hierarchy consistently in all new UI and when updating existing UI:

1. Primary Headers (`h1`, `h2`, hero headlines)
	- Font: `Montserrat`
	- Weights: `700` or `800`
	- Style: uppercase with wider tracking
2. Body Copy and Form Inputs
	- Font: `Plus Jakarta Sans` (fallback: `Inter`)
	- Weights: `400` and `500`
3. Numerics, Pricing, and Time Slots
	- Font: `JetBrains Mono` (fallback: `Space Grotesk`)
	- Weights: `500` and `600`
4. Editorial Accent and Sub-badges (optional)
	- Font: `Instrument Serif` (fallback: `Playfair Display`)
	- Style: italic, weight `400`

### Typography Enforcement Checklist

- Do not introduce default system font stacks for new UI.
- Keep heading emphasis high-contrast and intentional; avoid generic medium-weight headings.
- Keep numeric/time-value text on the mono track for operational clarity.
- If introducing new fonts with `next/font/google`, wire them via CSS variables in `app/layout.tsx` and map them through tokens in `app/globals.css`.
