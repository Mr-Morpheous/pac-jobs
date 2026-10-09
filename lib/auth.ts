import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLegacyCvUrl } from "@/lib/cv";
import { isProfileGateComplete } from "@/lib/profile";
import { dashboardPathFor } from "@/lib/role-routes";
import type { Profile, UserRole } from "@/types/database";

// dashboardPathFor/postJobHref moved to lib/role-routes.ts (no server
// imports there) so client components can use postJobHref directly.
// Re-exported here so existing server-side callers are unaffected.
export { dashboardPathFor, postJobHref } from "@/lib/role-routes";

/**
 * Requires a signed-in user with a profile row, and hands back the Supabase
 * client so callers do not construct a second one.
 *
 * Every auth user has a profile from migration 003's on_auth_user_created
 * trigger. A missing profile therefore means something is genuinely wrong
 * rather than "new user", so it is surfaced instead of silently patched.
 */
export async function requireUser(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  profile: Profile;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login?error=missing-profile");

  const row = profile as Profile;

  // A suspended account is told so, rather than being shown a dashboard where
  // every action quietly fails. The refusal itself is enforced in the database
  // (migration 022) — this is the part that explains it. Admins are exempt:
  // suspending the account that does the suspending would lock the product.
  if (row.suspended_at && row.role !== "admin") redirect("/auth/suspended");

  return { supabase, userId: user.id, profile: row };
}

/**
 * As requireUser, but also pins the role. A user with the wrong role is sent to
 * their own dashboard rather than shown an error — being an employer on a
 * seeker page is a wrong turn, not a failure.
 */
export async function requireProfile(role: UserRole) {
  const ctx = await requireUser();
  if (ctx.profile.role !== role) redirect(dashboardPathFor(ctx.profile.role));
  return ctx;
}

/**
 * As requireProfile("seeker"), but also gates on the must-have subset of the
 * profile checklist (name, phone, CV, plus the migration-033 hiring fields —
 * see lib/profile.ts). Used on the features that make no sense without
 * contact details or a CV to send (Saved, Alerts, Applications), and on
 * applying itself (app/jobs/actions.ts, for signed-in seekers only — a guest
 * has no profile to gate).
 */
export async function requireCompleteSeekerProfile(reason: string) {
  const ctx = await requireProfile("seeker");
  const hasCv = Boolean(ctx.profile.cv_url) && !isLegacyCvUrl(ctx.profile.cv_url);
  const [hasEducation, hasWorkExperience] = await hasHiringProfileEntries(
    ctx.supabase,
    ctx.profile.id
  );
  if (!isProfileGateComplete(ctx.profile, hasCv, hasEducation, hasWorkExperience)) {
    redirect(`/dashboard/seeker/profile?locked=${reason}`);
  }
  return ctx;
}

/**
 * Cheap existence checks (not full rows) for the two migration-033 tables
 * that gate a profile — shared between requireCompleteSeekerProfile and the
 * apply-flow gate in app/jobs/actions.ts, which needs the same two checks
 * against a client it already has rather than one built here.
 */
export async function hasHiringProfileEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string
): Promise<[boolean, boolean]> {
  const [education, workExperience] = await Promise.all([
    supabase.from("profile_education").select("id").eq("profile_id", profileId).limit(1),
    supabase
      .from("profile_work_experience")
      .select("id")
      .eq("profile_id", profileId)
      .limit(1),
  ]);
  return [Boolean(education.data?.length), Boolean(workExperience.data?.length)];
}
