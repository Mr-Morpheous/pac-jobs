import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApplyViewer } from "@/components/apply-form";
import type { Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export type ViewerResponse = {
  signedIn: boolean;
  role: Profile["role"] | null;
  savedJobIds: string[];
  skills: string[] | null;
  viewer: ApplyViewer | null;
  appliedAt: string | null;
};

const SIGNED_OUT: ViewerResponse = {
  signedIn: false,
  role: null,
  savedJobIds: [],
  skills: null,
  viewer: null,
  appliedAt: null,
};

/**
 * The one cookie-dependent read every page needs (auth state, saved jobs,
 * apply-form prefill, "already applied"). Fetched client-side by
 * `lib/hooks/use-viewer.ts` rather than in the page's Server Component, so
 * `/`, `/jobs` and `/jobs/[slug]` never call `cookies()` themselves and can
 * actually be served from the ISR cache their `revalidate` export declares.
 *
 * `jobId` is optional — only `/jobs/[slug]` needs the per-job `appliedAt`
 * lookup, so it's skipped for the homepage/`/jobs` grid.
 */
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json(SIGNED_OUT);

  const [savedRow, profileRow, appliedRow] = await Promise.all([
    supabase.from("saved_jobs").select("job_id"),
    supabase
      .from("profiles")
      .select("id, role, full_name, email, phone, cv_url, skills")
      .eq("id", user.id)
      .single(),
    jobId
      ? supabase
          .from("applications")
          .select("applied_at")
          .eq("job_id", jobId)
          .eq("applicant_id", user.id)
          .order("applied_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const profile = profileRow.data as Pick<
    Profile,
    "id" | "role" | "full_name" | "email" | "phone" | "cv_url" | "skills"
  > | null;

  if (!profile) return NextResponse.json(SIGNED_OUT);

  const savedJobIds = ((savedRow.data as { job_id: string }[] | null) ?? []).map(
    (r) => r.job_id
  );

  const response: ViewerResponse = {
    signedIn: true,
    role: profile.role,
    savedJobIds,
    skills: profile.role === "seeker" ? (profile.skills ?? null) : null,
    viewer: {
      id: profile.id,
      role: profile.role,
      fullName: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      cvUrl: profile.cv_url,
    },
    appliedAt:
      (appliedRow.data as { applied_at: string } | null)?.applied_at ?? null,
  };

  return NextResponse.json(response);
}
