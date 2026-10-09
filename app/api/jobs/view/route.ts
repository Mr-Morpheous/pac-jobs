import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * Bumps the view counter through the SECURITY DEFINER RPC — an anonymous
 * visitor has no UPDATE on jobs and is not going to be given one.
 *
 * Called client-side, once, from `components/apply-panel.tsx` on mount —
 * moved out of the page's server render so `/jobs/[slug]` never touches
 * `headers()` and can be served from the ISR cache. A side effect of firing
 * from the browser rather than matching a server-side user-agent regex: a
 * crawler that never executes JavaScript never calls this at all, which
 * undercounts real crawler traffic more completely than the old regex did.
 *
 * Errors are swallowed on purpose. This is a vanity number on an employer's
 * dashboard; nothing about the page depends on it.
 */
export async function POST(request: NextRequest) {
  const { jobId } = (await request.json().catch(() => ({}))) as { jobId?: string };
  if (!jobId) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const supabase = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.rpc("increment_job_view", { job: jobId });
  } catch {
    // Intentionally ignored.
  }

  return NextResponse.json({ ok: true });
}
