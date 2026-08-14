# Graph Report - .  (2026-08-13)

## Corpus Check
- 45 files · ~85,114 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 365 nodes · 582 edges · 27 communities (16 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.88)
- Token cost: 0 input · 267,246 output

## Community Hubs (Navigation)
- Booking Flow & Admin Dashboard
- Home Page & FAQ
- TS/Next.js Build Config
- Site Navigation
- Backend Implementation Plan
- Frontend Dependencies
- Halide Topo Hero Visual
- Public Route Pages
- Design Critique & Color Rules
- Dev Tooling Dependencies
- Admin Dashboard Pages
- Root Layout & Fonts
- Section Backdrop Effects
- Admin Login
- Roster Page
- ESLint Config
- Next.js Config
- PostCSS Config
- Next.js Default File Icon
- Next.js Default Globe Icon
- Next.js Default Logo Icon
- Vercel Default Icon
- Next.js Default Window Icon
- Next.js Boilerplate README

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `PrimeSports Clubhouse Design System` - 13 edges
3. `BookingClient()` - 12 edges
4. `getPrimeContainerClassName()` - 11 edges
5. `Backend Implementer Agent` - 11 edges
6. `CheckoutClient()` - 8 edges
7. `primeContainerClasses` - 8 edges
8. `include` - 7 edges
9. `useReservation()` - 7 edges
10. `useToast()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `No Border-Flag-on-Rounded-Card Rule` --semantically_similar_to--> `Border-Accent-on-Rounded AI Tell`  [INFERRED] [semantically similar]
  DESIGN.md → .impeccable/critique/2026-08-12T16-30-21Z__colors-match-point-red-court-line-gold-accent-pair.md
- `Sideline Stripe Component` --semantically_similar_to--> `Suggested Sideline-Stripe Fix`  [INFERRED] [semantically similar]
  DESIGN.md → .impeccable/critique/2026-08-12T16-30-21Z__colors-match-point-red-court-line-gold-accent-pair.md
- `Backend Implementation Skill` --shares_data_with--> `Backend Database Checklist`  [INFERRED]
  .claude/skills/backend-implementation/SKILL.md → backend_database_checklist.md
- `AdminShell()` --calls--> `getPrimeContainerClassName()`  [EXTRACTED]
  components/prime-sports/admin/admin-shell.tsx → lib/prime-sports.ts
- `HalideTopoHero()` --calls--> `getPrimeContainerClassName()`  [EXTRACTED]
  components/prime-sports/home/halide-topo-hero.tsx → lib/prime-sports.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Typography Hierarchy Governance Across Docs** — agents_typography_hierarchy, _github_skills_typography_enforcer_skill_doc, _github_agents_ui_polish_reviewer_agent_doc, design_doc [INFERRED 0.85]
- **Backend Roadmap Alignment (Agent, Skill, Checklist, Product)** — _claude_agents_backend_implementer_doc, _claude_skills_backend_implementation_skill_doc, backend_database_checklist_doc, product_capabilities_constraints [INFERRED 0.85]
- **Two-Accent Color System Definition and Critique** — design_two_accent_rule, design_match_point_red, design_court_line_gold, _impeccable_critique_2026_08_12t16_30_21z__colors_match_point_red_court_line_gold_accent_pair_doc [INFERRED 0.80]

## Communities (27 total, 11 thin omitted)

### Community 0 - "Booking Flow & Admin Dashboard"
Cohesion: 0.08
Nodes (57): AdminDashboard(), bookingMap, BookingClient(), sameItem(), toDateKey(), BookingSteps(), BookingStepsProps, stepLabels (+49 more)

### Community 1 - "Home Page & FAQ"
Cohesion: 0.07
Nodes (27): faqItems, metadata, facilityCards, FacilityShowcase(), HomeFaq(), HomeFaqProps, details, LocationPanel() (+19 more)

### Community 2 - "TS/Next.js Build Config"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 3 - "Site Navigation"
Cohesion: 0.09
Nodes (19): sectionNavItems, MobileNavProps, NavLink, headerNavLinks, mobileNavLinks, SiteHeader(), SiteHeaderProps, useHeaderTheme() (+11 more)

### Community 4 - "Backend Implementation Plan"
Cohesion: 0.11
Nodes (25): Backend API Surface, Staff Auth & RBAC Model, Backend Implementer Agent, Backend Implementer Phased Roadmap, Supabase Stack Decision, Target Backend Schema (Prime Sports), Third-Party Integrations (Backend), Backend Implementation Skill (+17 more)

### Community 5 - "Frontend Dependencies"
Cohesion: 0.08
Nodes (23): framer-motion, lucide-react, next, dependencies, framer-motion, lucide-react, next, react (+15 more)

### Community 6 - "Halide Topo Hero Visual"
Cohesion: 0.11
Nodes (21): ACROSS_V, ARC_PEAK, between(), COURT_ORIGIN, COURT_U, COURT_V, CourtPoint, createShot() (+13 more)

### Community 7 - "Public Route Pages"
Cohesion: 0.16
Nodes (12): metadata, metadata, metadata, PageIntro(), PageIntroProps, AppShell(), AppShellProps, SiteFooter() (+4 more)

### Community 8 - "Design Critique & Color Rules"
Cohesion: 0.16
Nodes (19): Border-Accent-on-Rounded AI Tell, Colors Critique: Match-Point Red / Court-Line Gold, Gold Overload Finding (P2), Suggested Sideline-Stripe Fix, Two-Accent Rule Enforcement Gap (P1 Finding), Court-Line Gold, PrimeSports Clubhouse Design System, The Glow-Not-Lift Rule (+11 more)

### Community 9 - "Dev Tooling Dependencies"
Cohesion: 0.11
Nodes (19): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, supabase, tailwindcss, @tailwindcss/postcss (+11 more)

### Community 10 - "Admin Dashboard Pages"
Cohesion: 0.13
Nodes (11): metadata, metadata, adminLinks, AdminShell(), AdminShellProps, lastNames, Player, RosterClient() (+3 more)

### Community 11 - "Root Layout & Fonts"
Cohesion: 0.12
Nodes (14): instrumentSerif, inter, jetBrainsMono, metadata, montserrat, playfairDisplay, plusJakartaSans, ReservationProvider() (+6 more)

### Community 12 - "Section Backdrop Effects"
Cohesion: 0.22
Nodes (10): glintAnimation(), glintGradient(), GlintStyle, GRID_GLINTS, SectionBackdrop(), SectionBackdropProps, SectionBackdropVariant, STELLAR_LAYER (+2 more)

## Knowledge Gaps
- **160 isolated node(s):** `metadata`, `metadata`, `metadata`, `metadata`, `metadata` (+155 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getPrimeContainerClassName()` connect `Public Route Pages` to `Booking Flow & Admin Dashboard`, `Admin Dashboard Pages`, `Site Navigation`, `Halide Topo Hero Visual`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Dev Tooling Dependencies` to `Frontend Dependencies`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `primeContainerClasses` connect `Booking Flow & Admin Dashboard` to `Home Page & FAQ`, `Admin Dashboard Pages`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `metadata`, `metadata`, `metadata` to the rest of the system?**
  _160 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Booking Flow & Admin Dashboard` be split into smaller, more focused modules?**
  _Cohesion score 0.07594381035996488 - nodes in this community are weakly interconnected._
- **Should `Home Page & FAQ` be split into smaller, more focused modules?**
  _Cohesion score 0.07396870554765292 - nodes in this community are weakly interconnected._
- **Should `TS/Next.js Build Config` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._