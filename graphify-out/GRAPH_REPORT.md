# Graph Report - .  (2026-08-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 291 nodes · 474 edges · 17 communities (12 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6f0b3088`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- prime-sports.ts
- halide-topo-hero.tsx
- (public)/page.tsx
- compilerOptions
- dependencies
- site-header.tsx
- layout.tsx
- app-shell.tsx
- devDependencies
- roster-client.tsx
- admin/page.tsx
- (public)/roster/page.tsx
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `getPrimeContainerClassName()` - 11 edges
3. `primeContainerClasses` - 8 edges
4. `primeButtonPrimaryClass` - 8 edges
5. `BookingClient()` - 7 edges
6. `useReservation()` - 7 edges
7. `useToast()` - 7 edges
8. `formatPrimeDate()` - 7 edges
9. `cn()` - 7 edges
10. `include` - 7 edges

## Surprising Connections (you probably didn't know these)
- `AdminShell()` --calls--> `getPrimeContainerClassName()`  [EXTRACTED]
  components/prime-sports/admin/admin-shell.tsx → lib/prime-sports.ts
- `HalideTopoHero()` --calls--> `getPrimeContainerClassName()`  [EXTRACTED]
  components/prime-sports/home/halide-topo-hero.tsx → lib/prime-sports.ts
- `NavBar()` --calls--> `cn()`  [EXTRACTED]
  components/ui/tubelight-navbar.tsx → lib/utils.ts
- `AdminDashboard()` --calls--> `createVerificationQueue()`  [EXTRACTED]
  components/prime-sports/admin/admin-dashboard.tsx → lib/prime-sports.ts
- `AdminDashboard()` --calls--> `formatPrimeDate()`  [EXTRACTED]
  components/prime-sports/admin/admin-dashboard.tsx → lib/prime-sports.ts

## Import Cycles
- None detected.

## Communities (17 total, 5 thin omitted)

### Community 0 - "prime-sports.ts"
Cohesion: 0.10
Nodes (45): AdminDashboard(), bookingMap, BookingClient(), occupiedSlots, BookingSteps(), BookingStepsProps, stepLabels, CheckoutClient() (+37 more)

### Community 1 - "halide-topo-hero.tsx"
Cohesion: 0.07
Nodes (31): ACROSS_V, ARC_PEAK, between(), COURT_ORIGIN, COURT_U, COURT_V, CourtPoint, createShot() (+23 more)

### Community 2 - "(public)/page.tsx"
Cohesion: 0.10
Nodes (22): faqItems, metadata, modules, facilityCards, FacilityShowcase(), HomeFaq(), HomeFaqProps, details (+14 more)

### Community 3 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 4 - "dependencies"
Cohesion: 0.08
Nodes (23): framer-motion, lucide-react, next, dependencies, framer-motion, lucide-react, next, react (+15 more)

### Community 5 - "site-header.tsx"
Cohesion: 0.11
Nodes (15): sectionNavItems, MobileNav(), MobileNavProps, NavLink, headerNavLinks, mobileNavLinks, SiteHeaderProps, SkewCta() (+7 more)

### Community 6 - "layout.tsx"
Cohesion: 0.10
Nodes (18): instrumentSerif, inter, jetBrainsMono, metadata, montserrat, playfairDisplay, plusJakartaSans, ContactDetails (+10 more)

### Community 7 - "app-shell.tsx"
Cohesion: 0.15
Nodes (13): metadata, metadata, metadata, PageIntro(), PageIntroProps, AppShell(), AppShellProps, SiteFooter() (+5 more)

### Community 8 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, supabase, tailwindcss, @tailwindcss/postcss (+11 more)

### Community 9 - "roster-client.tsx"
Cohesion: 0.14
Nodes (10): metadata, metadata, adminLinks, AdminShell(), AdminShellProps, lastNames, Player, RosterClient() (+2 more)

## Knowledge Gaps
- **134 isolated node(s):** `metadata`, `modules`, `faqItems`, `metadata`, `metadata` (+129 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getPrimeContainerClassName()` connect `app-shell.tsx` to `prime-sports.ts`, `roster-client.tsx`, `site-header.tsx`, `halide-topo-hero.tsx`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `primeButtonPrimaryClass` connect `prime-sports.ts` to `roster-client.tsx`, `(public)/page.tsx`, `admin/page.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `primeContainerClasses` connect `prime-sports.ts` to `roster-client.tsx`, `(public)/page.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `metadata`, `modules`, `faqItems` to the rest of the system?**
  _134 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prime-sports.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10014513788098693 - nodes in this community are weakly interconnected._
- **Should `halide-topo-hero.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07386363636363637 - nodes in this community are weakly interconnected._
- **Should `(public)/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0967741935483871 - nodes in this community are weakly interconnected._