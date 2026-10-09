"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ApplyForm } from "@/components/apply-form";
import { useViewer } from "@/lib/use-viewer";
import { gate } from "@/lib/content";

/**
 * The apply-form prefill (profile details, "already applied"), the
 * `?applied=1`/`?apply_error=` confirmation query, and the view counter all
 * used to be resolved server-side in `app/jobs/[slug]/page.tsx` — reading
 * cookies() *and* searchParams there is what made the route dynamic on every
 * request despite its `revalidate` export (Next treats both as "dynamic
 * APIs" that opt a route out of static rendering). All three move here:
 * viewer state via `useViewer` (`app/api/viewer/route.ts`), the query via
 * `useSearchParams`, the view counter via a fire-and-forget POST on mount
 * (`app/api/jobs/view/route.ts`).
 *
 * `useSearchParams` requires a Suspense boundary in the App Router, which is
 * why this file exports a wrapped `ApplyPanel` rather than the bare
 * component — the page importing it stays simple.
 *
 * Renders the guest shape until `useViewer` resolves — anonymous visitors
 * (the majority, including crawlers) never see anything else.
 */
function ApplyPanelInner({
  jobId,
  slug,
  jobTitle,
}: {
  jobId: string;
  slug: string;
  jobTitle: string;
}) {
  const { data } = useViewer(jobId);
  const searchParams = useSearchParams();
  const justApplied = searchParams.get("applied") === "1";
  const error = searchParams.get("apply_error");

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    // Same bot list the old server-side check used — a scraper can lie about
    // its user agent, but this removes the large, honest, self-declaring
    // share. Crawlers that never run JavaScript never reach this at all,
    // which undercounts real crawler traffic more completely than the old
    // regex did.
    const BOT =
      /bot|crawler|spider|crawling|slurp|bingpreview|headlesschrome|lighthouse|monitoring|preview/i;
    if (BOT.test(navigator.userAgent)) return;
    fetch("/api/jobs/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
      keepalive: true,
    }).catch(() => {
      // Vanity counter — nothing about the page depends on it.
    });
    // Once per mount only — a re-render from useViewer resolving must not
    // fire a second view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  return (
    <>
      <p className="mb-5 mt-1 text-sm text-muted">
        {data.viewer
          ? data.viewer.role === "seeker"
            ? "Your details are filled in from your profile."
            : "Viewing as staff."
          : gate.noAccountNeeded}
      </p>

      <ApplyForm
        slug={slug}
        jobTitle={jobTitle}
        viewer={data.viewer}
        appliedAt={data.appliedAt}
        justApplied={justApplied}
        error={error}
      />
    </>
  );
}

function ApplyPanelFallback({ slug, jobTitle }: { slug: string; jobTitle: string }) {
  return (
    <>
      <p className="mb-5 mt-1 text-sm text-muted">{gate.noAccountNeeded}</p>
      <ApplyForm slug={slug} jobTitle={jobTitle} viewer={null} />
    </>
  );
}

export function ApplyPanel(props: { jobId: string; slug: string; jobTitle: string }) {
  return (
    <Suspense fallback={<ApplyPanelFallback slug={props.slug} jobTitle={props.jobTitle} />}>
      <ApplyPanelInner {...props} />
    </Suspense>
  );
}
