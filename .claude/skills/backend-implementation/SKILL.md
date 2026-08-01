---
name: backend-implementation
description: Implement backend work for Prime Sports (schema, auth, API routes/server actions, third-party wiring) using the baked-in audit findings and phased roadmap already captured in the backend-implementer agent. Use when the user asks to build, wire up, or connect any backend piece — a table, an endpoint, auth, payment/OCR/upload integration, or replacing a mock/hardcoded data source with a real one. Do not use this for re-auditing or producing more analysis; go straight to implementation.
---

# Backend Implementation

This project (`prime-sports`) is a Next.js frontend prototype with no backend wired up yet — every "backend interaction" today is a `setTimeout`, a hardcoded array, or a submit handler that just navigates without checking anything. A static audit already mapped the full implied schema, auth/RBAC model, API blueprint, third-party integrations, and a 3-phase roadmap. That context lives in `.claude/agents/backend-implementer.md` so it doesn't need to be re-derived every time.

## When invoked

1. **Identify the slice.** Figure out which specific piece of backend work is being asked for right now (e.g. "wire up the payment submissions table," "add real staff auth," "replace the fake OCR"). If the user's ask is broad ("build the backend"), don't try to do all three phases at once — ask which phase/slice to start with, defaulting to Phase 1 (schema + real auth + route protection) since everything else depends on it.
2. **Check current repo state first**, not just this skill's memory: read `package.json` for what's already installed (a DB client, auth lib, etc.), check for `middleware.ts` / `app/api/**` / migration files that may already exist from prior work in this session or a previous one. The audit findings are a snapshot — trust what's actually in the repo over what's written down.
3. **Delegate the actual build to the `backend-implementer` agent** via the Agent tool (`subagent_type: "backend-implementer"`), passing it the specific slice to implement plus anything you learned in step 2 that updates its baked-in context (e.g. "Supabase client is already installed and configured in lib/supabase.ts, use that"). That agent has the full schema/endpoint/roadmap context embedded — you don't need to restate it, just point it at the task.
4. **For a multi-slice request** (e.g. "do all of Phase 1"), break it into ordered slices yourself (schema → auth → route protection → seed content, in that dependency order) and either run them as sequential Agent calls or hand the whole ordered list to one `backend-implementer` invocation if the pieces are small enough to do in one pass — use judgment based on size, don't default to spawning one agent per tiny step.
5. **After implementation**, confirm `pnpm lint` (and `pnpm build` for schema/route changes) passed, and report back concretely what was wired to what — which mock/hardcoded source was replaced by which real path, per the "don't leave both paths in place" rule the implementer agent follows.

## What this skill is not for

- Re-running the static audit or producing a new readiness checklist — that's a one-time analysis already captured. If the codebase has changed so much the audit is meaningfully stale (new features added, different data shapes), say so and re-derive just the affected part inline rather than invoking a full audit pass.
- Frontend-only UI/UX work with no backend implication — that's normal day-to-day work, not this skill.
