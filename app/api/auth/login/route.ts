import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type LoginPayload = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  let payload: LoginPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  // A valid Supabase Auth session isn't enough on its own. Staff/manager
  // RBAC grants aren't defined yet, so for now only `admin`-role accounts
  // are allowed into the admin area — reuse the `current_staff_role()` SQL
  // helper from the Phase 1 migration rather than re-deriving that check
  // here. (Revisit once staff/manager permissions are actually scoped.)
  const { data: role, error: roleError } = await supabase.rpc("current_staff_role");

  if (roleError || role !== "admin") {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "This account is not authorized for admin access." },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}
