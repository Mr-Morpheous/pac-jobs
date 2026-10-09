"use client";

import { useState } from "react";
import { dataConsent } from "@/lib/content";

/**
 * Scroll-gated data-consent checkbox for the apply form (migration 033).
 *
 * This component is the UX only — fast feedback, nothing more. The real gate
 * is server-side: app/jobs/actions.ts independently rejects a submission
 * with no `consent` field present, so a scripted or JS-disabled POST cannot
 * bypass consent by skipping the scroll requirement. Same "client-side is
 * convenience, server-side is the rule" pattern this app already applies to
 * RLS and the profile-completion gate.
 *
 * `consent_version` is NOT taken from a form field — the server action reads
 * `dataConsent.version` directly from lib/content.ts, so a tampered form
 * can't claim consent to a different version than what was actually shown.
 */
export function ConsentClause({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setScrolledToBottom(true);
    }
  }

  return (
    <div>
      <p className="eyebrow mb-1.5">Applicant declaration &amp; data consent</p>
      <div
        onScroll={handleScroll}
        className="clay-inset h-56 overflow-y-auto whitespace-pre-line rounded-card p-4 text-xs leading-relaxed text-ink/80"
      >
        {dataConsent.clauseText}
      </div>

      <label className="mt-3 flex items-start gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          name="consent"
          required
          checked={checked}
          disabled={!scrolledToBottom}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 accent-accent disabled:opacity-40"
        />
        {dataConsent.checkboxLabel}
      </label>

      {!scrolledToBottom && (
        <p className="mt-1.5 text-xs text-muted">{dataConsent.scrollHint}</p>
      )}
    </div>
  );
}
