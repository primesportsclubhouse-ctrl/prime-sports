-- Seeds a single local-dev admin staff account so `/admin` is reachable
-- without a hosted project. Run automatically by `pnpm exec supabase start`
-- / `supabase db reset` per supabase/config.toml's [db.seed] sql_paths.
--
-- Supabase Auth users are normally created through GoTrue (which owns
-- password hashing), but for local seeding it's standard practice to insert
-- directly into `auth.users` / `auth.identities` using the same bcrypt
-- scheme GoTrue uses (pgcrypto's `crypt()` + `gen_salt('bf')`, enabled by
-- the Phase 1 migration).
--
-- Only the `admin` role is seeded on purpose — staff/manager RBAC grants
-- aren't scoped yet (see proxy.ts / app/api/auth/login), so there's nothing
-- for a `staff`/`manager` account to do here yet.
--
-- Local dev credentials only — never reuse against a hosted project:
--   email:    admin@primesports.club
--   password: Fuwi3JdLUUZVp6edjAYZ

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := 'admin@primesports.club';
  v_password text := 'Fuwi3JdLUUZVp6edjAYZ';
begin
  if exists (select 1 from auth.users where email = v_email) then
    return;
  end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_user_id::text,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    now(),
    now(),
    now()
  );

  insert into public.staff_profiles (id, email, role)
  values (v_user_id, v_email, 'admin');
end $$;
