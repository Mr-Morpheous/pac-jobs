import { PublicNav } from "@/components/public-nav";

/**
 * Thin wrapper kept so app/layout.tsx doesn't need touching. The actual auth
 * resolution moved into PublicNav itself (client-side, via useViewer) — see
 * the comment on PublicNav for why: this renders on every route via the root
 * layout, so resolving it server-side forced every page in the app dynamic.
 */
export function SiteHeader() {
  return <PublicNav />;
}
