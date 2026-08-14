import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

async function signOutAndRedirect(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // 303 so the browser follows up with a GET (correct for a POST-triggered
  // redirect, and matches a plain <form method="post"> submission).
  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}

export async function POST(request: Request) {
  return signOutAndRedirect(request);
}
