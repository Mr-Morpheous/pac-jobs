-- ============================================================
-- 034 — Banded activity stats for the homepage
-- ============================================================
-- Migration 011 revoked anon's EXECUTE on stats() because an exact
-- application count is commercially sensitive and, on its own, reveals how
-- much personal data (names, emails, phone numbers behind those rows) the
-- site holds. That reasoning still holds — this is not a re-grant of
-- stats(), and stats() itself is untouched.
--
-- What's added instead is a *banded* figure: rounded down to one significant
-- digit times a power of ten (47 -> 40, 530 -> 500, 1,340 -> 1,000), wide
-- enough that the true count can't be reverse-engineered from what's shown.
-- Anything under 10 returns NULL rather than a small, precise-looking number.
-- The rounding happens inside this function, in SQL, before anything is
-- returned — a direct call to the RPC gets the same banded figure the
-- homepage does, never the exact count. Same principle as stats() itself
-- (comment on migration 005): expose the aggregate and nothing sharper.
-- ============================================================

create or replace function public.band_count(n bigint)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when n < 10 then null
    else (floor(n / power(10, floor(log(n::numeric))))
          * power(10, floor(log(n::numeric))))::int
  end;
$$;

comment on function public.band_count(bigint) is
  'Rounds down to one significant digit x a power of ten (47 -> 40, 1340 -> '
  '1000); NULL under 10. Used to expose approximate activity counts without '
  'revealing exact totals — see migration 034.';

create or replace function public.activity_bands()
returns table (recent_band integer, total_band integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.band_count(
      (select count(*) from public.applications
        where applied_at >= now() - interval '7 days')
    ) as recent_band,
    public.band_count(
      (select count(*) from public.applications)
    ) as total_band;
$$;

comment on function public.activity_bands() is
  'Banded (never exact) applications-this-week / applications-total figures '
  'for the homepage. See migration 034 for why this differs from stats().';

revoke execute on function public.band_count(bigint) from public;
revoke execute on function public.activity_bands() from public;
grant execute on function public.activity_bands() to anon, authenticated;
