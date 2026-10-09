import type { UserRole } from "@/types/database";

/**
 * Where a given role belongs after signing in.
 *
 * Split out of lib/auth.ts (no other imports there) so client components
 * (components/home-personalization.tsx, components/jobs-results.tsx) can use
 * `postJobHref` without pulling in lib/supabase/server.ts, which imports
 * next/headers and cannot be bundled for the browser.
 */
export function dashboardPathFor(role: UserRole): string {
  if (role === "admin") return "/admin";
  if (role === "employer") return "/dashboard/employer";
  return "/dashboard/seeker";
}

/**
 * Where "Post a Job" should go for a given role (brief §7).
 */
export function postJobHref(role: UserRole | null): string {
  if (role === "employer") return "/dashboard/employer/post";
  if (role === "admin") return "/admin/jobs/new";
  if (role === "seeker") return "/post-a-job";
  return "/auth/signup?next=/post-a-job";
}
