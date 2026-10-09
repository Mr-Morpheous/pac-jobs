"use client";

import Link from "next/link";
import { postJobHref } from "@/lib/role-routes";
import { JobCard } from "@/components/job-card";
import { Reveal } from "@/components/reveal";
import { EmptyState } from "@/components/dashboard-ui";
import { matchPercent } from "@/lib/match";
import { useViewer } from "@/lib/use-viewer";
import { browse } from "@/lib/content";
import type { Job } from "@/types/database";

/**
 * Auth/saved-job/skills state for the results grid lives client-side (see
 * `app/api/viewer/route.ts`) so the search itself — the expensive part —
 * can run on the anon-key client in `app/jobs/page.tsx` without paying for
 * `auth.getUser()` on every anonymous/crawler hit.
 */
export function ResultsEmpty() {
  const { data } = useViewer();
  return (
    <EmptyState
      title={browse.emptyTitle}
      body={browse.emptyBody}
      action={
        <>
          <Link href="/jobs" className="btn-primary">
            {browse.clearAll}
          </Link>
          <Link href={postJobHref(data.role)} className="btn-ghost">
            {browse.emptyEmployerNudge}
          </Link>
        </>
      }
    />
  );
}

export function ResultsGrid({ jobs, returnTo }: { jobs: Job[]; returnTo: string }) {
  const { data } = useViewer();
  const savedIds = new Set(data.savedJobIds);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {jobs.map((row, i) => (
        <Reveal key={row.id} delay={Math.min(i * 0.03, 0.18)}>
          <JobCard
            job={row}
            saved={savedIds.has(row.id)}
            showSave={data.signedIn}
            returnTo={returnTo}
            matchPercent={matchPercent(row.required_skills, data.skills)}
          />
        </Reveal>
      ))}
    </div>
  );
}
