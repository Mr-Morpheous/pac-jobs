"use client";

import { useEffect, useState } from "react";
import type { ViewerResponse } from "@/app/api/viewer/route";

const SIGNED_OUT: ViewerResponse = {
  signedIn: false,
  role: null,
  savedJobIds: [],
  skills: null,
  viewer: null,
  appliedAt: null,
};

/**
 * Up to 9 components call useViewer() independently on a single page (nav,
 * personalization, job cards, apply panel...), each previously firing its
 * own `/api/viewer` request on mount — a job detail page alone fired ~5.
 * This in-flight cache collapses concurrent calls for the same query string
 * into one real fetch; every other caller just awaits the same promise.
 * Deleted as soon as it resolves, so it never serves stale data across
 * separate page loads, only dedupes the simultaneous mounts of one.
 */
const inFlight = new Map<string, Promise<ViewerResponse>>();

function fetchViewer(qs: string): Promise<ViewerResponse> {
  const existing = inFlight.get(qs);
  if (existing) return existing;
  const promise = fetch(`/api/viewer${qs}`)
    .then((r) => (r.ok ? (r.json() as Promise<ViewerResponse>) : SIGNED_OUT))
    .catch(() => SIGNED_OUT)
    .finally(() => {
      inFlight.delete(qs);
    });
  inFlight.set(qs, promise);
  return promise;
}

/**
 * Fetches `/api/viewer` once on mount. Every page using this renders the
 * signed-out shape first (matching the server-rendered fallback exactly, so
 * there's no layout shift) and swaps in the real viewer state once it
 * resolves — see `app/api/viewer/route.ts` for why this moved off the page's
 * server render.
 */
export function useViewer(jobId?: string): { data: ViewerResponse; loading: boolean } {
  const [data, setData] = useState<ViewerResponse>(SIGNED_OUT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const qs = jobId ? `?jobId=${encodeURIComponent(jobId)}` : "";
    fetchViewer(qs)
      .then((d) => {
        if (active) setData(d);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [jobId]);

  return { data, loading };
}
