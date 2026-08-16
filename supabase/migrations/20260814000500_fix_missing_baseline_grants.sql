-- Fix: the hosted project was missing the baseline table/sequence/function
-- grants Supabase's API layer (PostgREST, Realtime) requires for anon,
-- authenticated, and service_role — discovered when the deployed production
-- site returned "permission denied for table X" (Postgres 42501) for EVERY
-- table via the service-role key, including tables from the very first
-- Phase 1 migration. service_role bypasses RLS entirely, so a 42501 there
-- can only mean the underlying GRANT never existed, not an RLS policy gap.
--
-- Local dev never surfaced this because `supabase start` sets these grants
-- up automatically as part of the local stack's own initialization; this
-- hosted project evidently did not inherit them. This migration restores
-- the standard baseline every Supabase project is supposed to have, and
-- extends it to tables created by future migrations via
-- ALTER DEFAULT PRIVILEGES so this can't silently regress again.
--
-- This does NOT bypass existing RLS policies for anon/authenticated — RLS
-- still filters rows normally; this only satisfies the table-level privilege
-- check that Postgres evaluates *before* RLS, which is a separate gate.
-- service_role has bypassrls and was already meant to see everything.

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
