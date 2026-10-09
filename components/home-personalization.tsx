"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { postJobHref } from "@/lib/role-routes";
import { JobCard } from "@/components/job-card";
import { Reveal } from "@/components/reveal";
import { useViewer } from "@/lib/use-viewer";
import { home } from "@/lib/content";
import type { Job } from "@/types/database";

/**
 * The hero CTAs and feed grid both depend on auth state, which
 * `app/page.tsx` deliberately never fetches server-side (see
 * `app/api/viewer/route.ts`). Both render the signed-out shape until
 * `useViewer` resolves, which is also exactly what an anonymous visitor
 * (the majority of traffic, including crawlers) sees permanently.
 */
export function HeroCtas() {
  const { data } = useViewer();
  // The seeker CTA's twin of postJobHref: signup for a stranger, the listings
  // for someone already signed in. `next` is a fixed literal, so there is no
  // open-redirect surface here.
  const seekerHref = data.role ? "/jobs" : "/auth/signup?next=/jobs";
  return (
    <>
      <Link href={seekerHref} className="btn-accent px-7 py-3">
        {home.seekerCta}
      </Link>
      {/* Rounded secondary with the arrow nudge, per the reference. */}
      <Link href={postJobHref(data.role)} className="btn-primary group px-7 py-3">
        {home.employerCta}
        <ArrowRight
          className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-safe:animate-nudge motion-safe:group-hover:animate-none"
          aria-hidden
        />
      </Link>
    </>
  );
}

export function FeedGrid({ rows }: { rows: Job[] }) {
  const { data } = useViewer();
  const savedIds = new Set(data.savedJobIds);

  if (rows.length === 0) {
    return (
      <div className="clay p-10 text-center md:p-16">
        <p className="font-display text-lg font-600 text-ink">{home.emptyTitle}</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          {home.emptyBody}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href={postJobHref(data.role)} className="btn-primary">
            {home.postCta}
          </Link>
          <Link href="/jobs" className="btn-ghost">
            {home.browseCta}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {rows.map((row, i) => (
        <Reveal key={row.id} delay={Math.min(i * 0.04, 0.24)}>
          <JobCard
            job={row}
            saved={savedIds.has(row.id)}
            showSave={data.signedIn}
            returnTo="/"
          />
        </Reveal>
      ))}
    </div>
  );
}
