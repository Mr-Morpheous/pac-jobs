"use client";

import { JobCard } from "@/components/job-card";
import { useViewer } from "@/lib/use-viewer";
import { job as jobCopy } from "@/lib/content";
import type { Job } from "@/types/database";

/** `showSave` depends on auth state, hence the client component — see
 * `components/apply-panel.tsx` for why this page resolves it client-side. */
export function RelatedJobs({ related, returnTo }: { related: Job[]; returnTo: string }) {
  const { data } = useViewer();
  if (related.length === 0) return null;
  return (
    <section className="mt-14">
      <h2 className="mb-5 font-display text-xl font-600 tracking-tight text-ink">
        {jobCopy.related}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((row) => (
          <JobCard key={row.id} job={row} showSave={data.signedIn} returnTo={returnTo} />
        ))}
      </div>
    </section>
  );
}
