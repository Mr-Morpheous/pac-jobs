import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ArrowLeft, Flag } from "lucide-react";
import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { JobDetail } from "@/components/job-detail";
import { ApplyPanel } from "@/components/apply-panel";
import { RelatedJobs } from "@/components/related-jobs";
import { ShareButton } from "@/components/share-button";
import { job as jobCopy } from "@/lib/content";
import type { Job } from "@/types/database";

export const revalidate = 300;

const SELECT = `
  *,
  category:job_categories!category_id(*),
  location:job_locations(*)
`;

/**
 * Public content — no session needed, so this runs on the anon-key client
 * inside unstable_cache and can actually be served from the ISR cache.
 * Viewer-specific data (apply-form prefill, "already applied", view counter)
 * lives client-side instead — see `components/apply-panel.tsx` and
 * `app/api/viewer/route.ts` — because reading cookies()/headers() here, as
 * the old version did, forces the whole route dynamic regardless of the
 * `revalidate` export above.
 */
const getJob = unstable_cache(
  async (slug: string): Promise<Job | null> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("jobs")
      .select(SELECT)
      .eq("slug", slug)
      .eq("status", "published")
      .single();
    return (data as unknown as Job) ?? null;
  },
  ["job-by-slug"],
  { revalidate: 300 }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) return { title: jobCopy.notFound };

  // No employer in the title or description — the company behind a role is
  // admin-only, and metadata is the most public surface there is.
  return {
    title: `${job.title} | PAC Jobs`,
    description: `${job.title} — ${
      job.is_remote ? "Remote" : (job.location?.name ?? "Kenya")
    }. Listed by PAC Africa.`,
  };
}

/**
 * Three related roles in one query using an `or` filter.
 *
 * Previously fired up to 2 sequential DB calls: one for category, then if
 * that came back empty, a second for location. Now fetches up to 6 candidates
 * (3 by category + 3 by location) in a single round-trip and picks the best 3
 * — category matches are preferred by sorting them first.
 *
 * Public content, same reasoning as `getJob` above: anon client inside
 * unstable_cache rather than the cookie-bound one, keyed on the job so it
 * stays cacheable per listing.
 */
const getRelated = unstable_cache(
  async (job: Job): Promise<Job[]> => {
    if (!job.category_id && !job.location_id) return [];

    const supabase = createPublicClient();

    const filters: string[] = [];
    if (job.category_id) filters.push(`category_id.eq.${job.category_id}`);
    if (job.location_id) filters.push(`location_id.eq.${job.location_id}`);

    const { data } = await supabase
      .from("jobs")
      .select(SELECT)
      .eq("status", "published")
      .neq("id", job.id)
      .or(filters.join(","))
      .order("created_at", { ascending: false })
      .limit(6);

    if (!data?.length) return [];

    // Prefer category matches; fill remaining slots with location matches.
    const byCategory = (data as unknown as Job[]).filter(
      (j) => j.category_id === job.category_id
    );
    if (byCategory.length >= 3) return byCategory.slice(0, 3);

    const byLocation = (data as unknown as Job[]).filter(
      (j) => j.category_id !== job.category_id
    );
    return [...byCategory, ...byLocation].slice(0, 3);
  },
  ["related-jobs"],
  { revalidate: 300 }
);

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();

  const related = await getRelated(job);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors duration-150 ease-out hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {jobCopy.allRoles}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="clay p-6 md:p-8">
          <JobDetail job={job} />
        </div>

        {/* Sticky apply panel. No company block — the employer is admin-only. */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="clay p-6">
            <h2 className="font-display text-lg font-600 text-ink">
              {jobCopy.apply}
            </h2>

            <ApplyPanel jobId={job.id} slug={job.slug} jobTitle={job.title} />

            <div className="mt-5 space-y-2 border-t border-line pt-5">
              <ShareButton title={job.title} />
              <a
                href={`mailto:hello@pac.africa?subject=${encodeURIComponent(
                  `Report listing: ${job.title}`
                )}&body=${encodeURIComponent(`Listing: /jobs/${job.slug}\n\nWhat is wrong:`)}`}
                className="btn-ghost w-full text-xs"
              >
                <Flag className="h-3.5 w-3.5" aria-hidden />
                {jobCopy.report}
              </a>
            </div>
          </div>
        </aside>
      </div>

      <RelatedJobs related={related} returnTo={`/jobs/${job.slug}`} />
    </div>
  );
}
