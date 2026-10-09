import Link from "next/link";
import type { Metadata } from "next";
import { Search, X, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { unstable_cache } from "next/cache";
import { ResultsEmpty, ResultsGrid } from "@/components/jobs-results";
import {
  browse,
  jobTypeLabels,
  employmentLevelLabels,
  postedWithinOptions,
  sortOptions,
} from "@/lib/content";
import type {
  EmploymentLevel,
  Job,
  JobCategory,
  JobLocation,
  JobType,
} from "@/types/database";

export const revalidate = 120;

const PER_PAGE = 12;

const SELECT = `
  *,
  category:job_categories!category_id(*),
  location:job_locations(*)
`;

interface Params {
  q?: string;
  category?: string;
  location?: string;
  type?: string;
  level?: string;
  since?: string;
  remote?: string;
  sort?: string;
  page?: string;
}

const getCachedCategories = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("job_categories")
      .select("id, name")
      .order("name")
      .limit(300);
    return (data as Pick<JobCategory, "id" | "name">[]) ?? [];
  },
  ["job_categories_all"],
  { revalidate: 3600 }
);

const getCachedLocations = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("job_locations")
      .select("id, name")
      .order("name")
      .limit(200);
    return (data as Pick<JobLocation, "id" | "name">[]) ?? [];
  },
  ["job_locations_all"],
  { revalidate: 3600 }
);

async function lookupName(
  table: "job_categories" | "job_locations",
  id: string | undefined
): Promise<string | undefined> {
  if (!id) return undefined;
  const rows = table === "job_categories"
    ? await getCachedCategories()
    : await getCachedLocations();
  return rows.find((r) => r.id === id)?.name;
}

/**
 * Previously absent — every filtered/paginated /jobs URL shared the root
 * layout's generic title and description regardless of category, location or
 * search term. The `?location=<id>` filter in particular is server-rendered
 * and genuinely crawlable, so it deserves metadata that actually reflects it.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Params>;
}): Promise<Metadata> {
  const params = await searchParams;
  const [categoryName, locationName] = await Promise.all([
    lookupName("job_categories", params.category),
    lookupName("job_locations", params.location),
  ]);

  let title: string;
  if (categoryName && locationName) title = `${categoryName} jobs in ${locationName}`;
  else if (categoryName) title = `${categoryName} jobs`;
  else if (locationName) title = `Jobs in ${locationName}`;
  else if (params.q) title = `Jobs matching "${params.q}"`;
  else title = "Browse Jobs";

  const description =
    title === "Browse Jobs"
      ? "Search vetted job listings across Kenya and East Africa, filterable by category, location, type, and experience level."
      : `Vetted ${title.toLowerCase()} on PAC Jobs — updated as employers post them.`;

  return { title, description };
}

/** Rebuilds the current URL with changes applied; null clears a param. */
function href(current: Params, changes: Partial<Record<keyof Params, string | null>>) {
  const next = new URLSearchParams();
  const merged = { ...current, ...changes } as Record<string, string | null | undefined>;
  for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
  const qs = next.toString();
  return qs ? `/jobs?${qs}` : "/jobs";
}

/**
 * Browse Jobs (brief §5).
 *
 * Sidebar filters on desktop, a <details> panel on mobile — no JavaScript, so
 * filtering works before hydration and with JS off. Every filter lives in the
 * URL, which makes any result set shareable.
 *
 * Card grid with pagination, not the two-pane master-detail this page used to
 * be: the brief is explicit that a card click goes to the job page rather than
 * opening a drawer.
 *
 * Categories and locations stay as selects driven by the live 165 and 65 rows
 * rather than a curated checkbox list — a decision taken deliberately so no
 * historical taxonomy is discarded.
 */
export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const supabase = createPublicClient();
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PER_PAGE;

  let query = supabase
    .from("jobs")
    .select(SELECT, { count: "exact" })
    .eq("status", "published");

  if (params.q) {
    // websearch parsing: raw input like "c++" or "sales & marketing" is a valid
    // phrase to a person and a syntax error to plain tsquery.
    query = query.textSearch("fts", params.q, { type: "websearch" });
  }
  if (params.category) query = query.eq("category_id", params.category);
  if (params.location) query = query.eq("location_id", params.location);
  if (params.type && params.type in jobTypeLabels) {
    query = query.eq("job_type", params.type as JobType);
  }
  if (params.level && params.level in employmentLevelLabels) {
    query = query.eq("employment_level", params.level as EmploymentLevel);
  }
  if (params.remote === "1") query = query.eq("is_remote", true);
  if (params.since) {
    const days = Number.parseInt(params.since, 10);
    if (Number.isFinite(days) && days > 0) {
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
      query = query.gte("created_at", cutoff);
    }
  }

  // Salary is optional, so unpriced roles sort last rather than first — a null
  // is "not stated", not "pays nothing".
  if (params.sort === "salary") {
    query = query
      .order("salary_max", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: params.sort === "oldest" });
  }

  const [{ data, count, error }, filters] = await Promise.all([
    query.range(from, from + PER_PAGE - 1),
    (async () => {
      const [categories, locations] = await Promise.all([
        getCachedCategories(),
        getCachedLocations(),
      ]);
      return { categories, locations };
    })(),
  ]);

  const jobs = (data as unknown as Job[]) ?? [];
  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));

  const active = [
    params.q && { label: `“${params.q}”`, clear: href(params, { q: null, page: null }) },
    params.type && {
      label: jobTypeLabels[params.type as JobType] ?? params.type,
      clear: href(params, { type: null, page: null }),
    },
    params.level && {
      label: employmentLevelLabels[params.level as EmploymentLevel] ?? params.level,
      clear: href(params, { level: null, page: null }),
    },
    params.remote === "1" && {
      label: browse.remoteOnly,
      clear: href(params, { remote: null, page: null }),
    },
    params.since && {
      label:
        postedWithinOptions.find((o) => o.value === params.since)?.label ??
        `${params.since}d`,
      clear: href(params, { since: null, page: null }),
    },
    params.category && {
      label: filters.categories.find((c) => c.id === params.category)?.name ?? "Category",
      clear: href(params, { category: null, page: null }),
    },
    params.location && {
      label: filters.locations.find((l) => l.id === params.location)?.name ?? "Location",
      clear: href(params, { location: null, page: null }),
    },
  ].filter(Boolean) as { label: string; clear: string }[];

  const filterPanel = (
    <FilterPanel params={params} filters={filters} />
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* SEARCH ----------------------------------------------------- */}
      <form action="/jobs" className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
            aria-hidden
          />
          <label htmlFor="q" className="sr-only">
            {browse.searchLabel}
          </label>
          <input
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder={browse.searchPlaceholder}
            className="field pl-10"
          />
        </div>
        {/* Chip state lives in the URL, so it must survive a form submit. */}
        {params.type && <input type="hidden" name="type" value={params.type} />}
        {params.level && <input type="hidden" name="level" value={params.level} />}
        {params.remote && <input type="hidden" name="remote" value={params.remote} />}
        {params.since && <input type="hidden" name="since" value={params.since} />}
        {params.sort && <input type="hidden" name="sort" value={params.sort} />}
        <button type="submit" className="btn-accent shrink-0 px-6">
          {browse.searchCta}
        </button>
      </form>

      {active.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="eyebrow">{browse.filteredBy}</span>
          {active.map((f) => (
            <Link key={f.label} href={f.clear} className="chip chip-active">
              {f.label}
              <X className="h-3 w-3" aria-hidden />
              <span className="sr-only">{browse.removeFilter}</span>
            </Link>
          ))}
          <Link href="/jobs" className="btn-ghost px-3 py-1 text-xs">
            {browse.clearAll}
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* FILTERS — sidebar on desktop, disclosure on mobile ------- */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <details className="clay group p-4 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-ink">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              {browse.filtersCta}
            </summary>
            <div className="mt-5">{filterPanel}</div>
          </details>
          <div className="hidden lg:block">{filterPanel}</div>
        </aside>

        {/* RESULTS -------------------------------------------------- */}
        <div>
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="font-display text-xl font-600 tracking-tight text-ink">
              {browse.resultCount(total)}
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="eyebrow">{browse.sortBy}</span>
              {sortOptions.map((opt) => {
                const on = (params.sort ?? "recent") === opt.value;
                return (
                  <Link
                    key={opt.value}
                    href={href(params, { sort: opt.value, page: null })}
                    className={`rounded-pill px-2.5 py-1 text-xs transition-colors duration-150 ease-out ${
                      on ? "text-accent-text font-medium" : "text-muted hover:text-ink"
                    }`}
                  >
                    {opt.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {error ? (
            <div className="clay p-10 text-center">
              <p className="font-display text-lg font-600 text-ink">Search failed</p>
              <p className="mt-2 text-sm text-muted">{error.message}</p>
            </div>
          ) : jobs.length === 0 ? (
            <ResultsEmpty />
          ) : (
            <>
              <ResultsGrid jobs={jobs} returnTo={href(params, {})} />

              <div className="mt-8 flex items-center justify-between gap-4">
                <p className="text-xs text-muted">
                  {browse.showingRange(from + 1, from + jobs.length, total)}
                </p>
                {lastPage > 1 && (
                  <div className="flex items-center gap-2">
                    <PageLink
                      to={page > 1 ? href(params, { page: page === 2 ? null : String(page - 1) }) : null}
                      label={browse.prev}
                      icon="prev"
                    />
                    <span className="font-mono text-xs text-muted">
                      {page} / {lastPage}
                    </span>
                    <PageLink
                      to={page < lastPage ? href(params, { page: String(page + 1) }) : null}
                      label={browse.next}
                      icon="next"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterPanel({
  params,
  filters,
}: {
  params: Params;
  filters: {
    categories: Pick<JobCategory, "id" | "name">[];
    locations: Pick<JobLocation, "id" | "name">[];
  };
}) {
  return (
    <div className="space-y-6">
      {/* Selects, not checkbox lists: 165 categories and 65 locations came
          across from WordPress and are kept whole. */}
      <form action="/jobs" className="space-y-4">
        {params.q && <input type="hidden" name="q" value={params.q} />}
        {params.sort && <input type="hidden" name="sort" value={params.sort} />}

        <div>
          <label htmlFor="f-category" className="eyebrow mb-2 block">
            {browse.category}
          </label>
          <select
            id="f-category"
            name="category"
            defaultValue={params.category ?? ""}
            className="field"
          >
            <option value="">{browse.anyCategory}</option>
            {filters.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="f-location" className="eyebrow mb-2 block">
            {browse.location}
          </label>
          <select
            id="f-location"
            name="location"
            defaultValue={params.location ?? ""}
            className="field"
          >
            <option value="">{browse.anyLocation}</option>
            {filters.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-secondary w-full text-xs">
          Apply
        </button>
      </form>

      <FilterGroup title={browse.employmentType}>
        {Object.entries(jobTypeLabels).map(([value, label]) => (
          <ChipLink
            key={value}
            label={label}
            active={params.type === value}
            to={href(params, { type: params.type === value ? null : value, page: null })}
          />
        ))}
      </FilterGroup>

      <FilterGroup title={browse.experience}>
        {Object.entries(employmentLevelLabels).map(([value, label]) => (
          <ChipLink
            key={value}
            label={label}
            active={params.level === value}
            to={href(params, { level: params.level === value ? null : value, page: null })}
          />
        ))}
      </FilterGroup>

      <FilterGroup title={browse.postedWithin}>
        {postedWithinOptions.map((opt) => (
          <ChipLink
            key={opt.value}
            label={opt.label}
            active={params.since === opt.value}
            to={href(params, {
              since: params.since === opt.value ? null : opt.value,
              page: null,
            })}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Remote">
        <ChipLink
          label={browse.remoteOnly}
          active={params.remote === "1"}
          to={href(params, { remote: params.remote === "1" ? null : "1", page: null })}
        />
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="eyebrow mb-2.5">{title}</h2>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function ChipLink({
  label,
  active,
  to,
}: {
  label: string;
  active: boolean;
  to: string;
}) {
  return (
    <Link href={to} className={`chip ${active ? "chip-active" : ""}`}>
      {label}
    </Link>
  );
}

function PageLink({
  to,
  label,
  icon,
}: {
  to: string | null;
  label: string;
  icon: "prev" | "next";
}) {
  const Icon = icon === "prev" ? ChevronLeft : ChevronRight;
  const body = (
    <>
      {icon === "prev" && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {label}
      {icon === "next" && <Icon className="h-3.5 w-3.5" aria-hidden />}
    </>
  );
  if (!to) {
    return (
      <span className="btn-ghost pointer-events-none px-3 py-1.5 text-xs opacity-40">
        {body}
      </span>
    );
  }
  return (
    <Link href={to} className="btn-secondary px-3 py-1.5 text-xs">
      {body}
    </Link>
  );
}
