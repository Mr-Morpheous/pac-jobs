"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { CV_ACCEPT } from "@/lib/cv";
import { gate } from "@/lib/content";
import { ConsentClause } from "@/components/consent-clause";
import { submitApplication } from "@/app/jobs/actions";
import type { UserRole } from "@/types/database";

export type ApplyViewer = {
  id: string;
  role: UserRole;
  fullName: string | null;
  email: string;
  phone: string | null;
  /** Object path or legacy URL of the CV on their profile, if any. */
  cvUrl: string | null;
};

/**
 * The apply card.
 *
 * Posts to a server action rather than writing to Supabase from the browser.
 * That is a security change, not a refactor: the old version carried the anon
 * key and inserted directly, which meant the write endpoint was open to anyone
 * who read the page source, and no rate limit could reach it because the request
 * never touched our origin. See app/jobs/actions.ts and migration 024.
 *
 * A side effect worth having: the form now works with JavaScript disabled. The
 * only thing client-side state still does is toggle which CV to send.
 */
export function ApplyForm({
  slug,
  jobTitle,
  viewer,
  appliedAt,
  justApplied = false,
  error,
}: {
  slug: string;
  jobTitle: string;
  viewer: ApplyViewer | null;
  /** Set when this viewer already has an application on this job. */
  appliedAt?: string | null;
  /** From ?applied=1 — the only way to show a guest their submission landed. */
  justApplied?: boolean;
  /**
   * A CODE from ?apply_error, not a message. Resolved against gate.applyErrors
   * below and dropped if unrecognised, so the query string cannot put words of
   * its own choosing inside this card — see app/jobs/actions.ts.
   */
  error?: string | null;
}) {
  const errorMessage = error ? (gate.applyErrors[error] ?? null) : null;
  // Signed-in applicants with a usable CV on file default to reusing it — the
  // whole point of having an account is not re-uploading the same document.
  const hasProfileCv = Boolean(viewer?.cvUrl && !viewer.cvUrl.startsWith("http"));
  const [reuseCv, setReuseCv] = useState(hasProfileCv);
  const [consented, setConsented] = useState(false);

  // ── Sent ─────────────────────────────────────────────────────────────
  if (justApplied) {
    return (
      <div className="text-sm">
        <p className="mb-1 font-display text-base font-600 text-ink">
          {gate.sent.title}
        </p>
        <p className="text-muted">
          {viewer ? gate.sent.bodySignedIn : gate.sent.bodyGuest}
        </p>
        {viewer && (
          <Link
            href="/dashboard/seeker/applications"
            className="btn-secondary mt-4 w-full justify-center"
          >
            {gate.alreadyApplied.action}
          </Link>
        )}
      </div>
    );
  }

  // ── Already applied ──────────────────────────────────────────────────
  if (appliedAt) {
    return (
      <div className="text-sm">
        <p className="mb-1 font-display text-base font-600 text-ink">
          {gate.alreadyApplied.title}
        </p>
        <p className="text-muted">
          {gate.alreadyApplied.submittedOn(
            new Date(appliedAt).toLocaleDateString("en-KE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          )}
        </p>
        <Link
          href="/dashboard/seeker/applications"
          className="btn-secondary mt-4 w-full justify-center"
        >
          {gate.alreadyApplied.action}
        </Link>
      </div>
    );
  }

  // ── Employers and admins do not apply ────────────────────────────────
  if (viewer && viewer.role !== "seeker") {
    const copy = viewer.role === "admin" ? gate.adminViewing : gate.employerCannotApply;
    return (
      <div className="text-sm">
        <p className="mb-1 font-display text-base font-600 text-ink">{copy.title}</p>
        <p className="text-muted">{copy.body}</p>
        <Link
          href={viewer.role === "admin" ? "/admin" : "/dashboard/employer"}
          className="btn-secondary mt-4 w-full justify-center"
        >
          {copy.action}
        </Link>
      </div>
    );
  }

  // ── The form ─────────────────────────────────────────────────────────
  return (
    <form action={submitApplication} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="job_title" value={jobTitle} />

      {/* Honeypot. Off-screen rather than display:none — some bots skip hidden
          fields but fill positioned ones, and a real screen reader is told to
          ignore it. Never shown, never valid to fill. */}
      <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="apply-website">Leave this field empty</label>
        <input id="apply-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {viewer ? (
        <div className="clay-inset px-3 py-2.5">
          <p className="eyebrow mb-0.5">{gate.applyingAs}</p>
          <p className="truncate text-sm font-500 text-ink">
            {viewer.fullName?.trim() || viewer.email}
          </p>
          {viewer.fullName?.trim() && (
            <p className="truncate text-xs text-muted">{viewer.email}</p>
          )}
        </div>
      ) : (
        <div>
          <label htmlFor="apply-email" className="sr-only">
            Email address
          </label>
          <input
            id="apply-email"
            name="applicant_email"
            required
            type="email"
            autoComplete="email"
            placeholder="Email address"
            className="field"
          />
        </div>
      )}

      {/* Asked of everyone whose profile has no name on it — including signed-in
          users, since the employer sees this rather than an email address. */}
      <div>
        <label htmlFor="apply-name" className="sr-only">
          Full name
        </label>
        <input
          id="apply-name"
          name="applicant_name"
          required
          autoComplete="name"
          defaultValue={viewer?.fullName ?? ""}
          placeholder="Full name"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="apply-phone" className="sr-only">
          Phone number
        </label>
        <input
          id="apply-phone"
          name="applicant_phone"
          autoComplete="tel"
          defaultValue={viewer?.phone ?? ""}
          placeholder="Phone number"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="apply-years-experience" className="sr-only">
          Years of experience
        </label>
        <input
          id="apply-years-experience"
          name="years_experience"
          type="number"
          min={0}
          required
          placeholder="Years of experience"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="apply-expected-salary" className="sr-only">
          Expected salary
        </label>
        <input
          id="apply-expected-salary"
          name="expected_salary"
          type="number"
          min={0}
          required
          placeholder="Expected salary"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="apply-current-salary" className="sr-only">
          Current / last salary
        </label>
        <input
          id="apply-current-salary"
          name="current_salary"
          type="number"
          min={0}
          required
          placeholder="Current / last salary"
          className="field"
        />
      </div>

      <p className="text-xs text-muted">
        Kept confidential — shared only with the employer reviewing this
        application, never sold or given to anyone else.
      </p>

      <div>
        <label htmlFor="apply-cover" className="sr-only">
          Cover letter
        </label>
        <textarea
          id="apply-cover"
          name="cover_letter"
          placeholder="Cover letter (optional)"
          rows={4}
          className="field resize-none"
        />
      </div>

      {/* CV ---------------------------------------------------------- */}
      {hasProfileCv ? (
        <div className="space-y-2">
          <span className="eyebrow block">CV</span>
          <label className="flex items-start gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              name="reuse_cv"
              checked={reuseCv}
              onChange={(e) => setReuseCv(e.target.checked)}
              className="mt-0.5 accent-accent"
            />
            Use the CV on my profile
          </label>
          {!reuseCv && (
            <input
              type="file"
              name="cv"
              accept={CV_ACCEPT}
              className="w-full text-xs text-ink file:mr-3 file:cursor-pointer file:rounded-card file:border file:border-line file:bg-surface-raised file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink hover:file:border-accent"
            />
          )}
        </div>
      ) : (
        <div>
          <label htmlFor="apply-cv" className="eyebrow mb-2 block">
            CV (PDF, optional)
          </label>
          <input
            id="apply-cv"
            type="file"
            name="cv"
            accept={CV_ACCEPT}
            className="w-full text-xs text-ink file:mr-3 file:cursor-pointer file:rounded-card file:border file:border-line file:bg-surface-raised file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink hover:file:border-accent"
          />
          {viewer && (
            <p className="mt-1.5 text-xs text-muted">
              Adding it to{" "}
              <Link
                href="/dashboard/seeker/profile"
                className="text-accent-text hover:underline"
              >
                your profile
              </Link>{" "}
              means you will not have to attach it next time.
            </p>
          )}
        </div>
      )}

      <ConsentClause checked={consented} onChange={setConsented} />

      <SubmitButton disabled={!consented} />

      {errorMessage && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}

      {!viewer && (
        <p className="text-center text-xs text-muted">
          Have an account?{" "}
          <Link href="/auth/login" className="text-accent-text hover:underline">
            Sign in
          </Link>{" "}
          to apply faster and track it.
        </p>
      )}
    </form>
  );
}

function SubmitButton({ disabled = false }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="btn-accent w-full">
      {pending ? "Sending…" : "Apply now"}
    </button>
  );
}
