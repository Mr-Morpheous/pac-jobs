"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme";
import { useViewer } from "@/lib/use-viewer";
import { dashboardPathFor, postJobHref } from "@/lib/role-routes";
import { nav, site } from "@/lib/content";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

/**
 * Auth state resolved client-side via `useViewer` — this renders in the root
 * layout on every route, so resolving it server-side (as it used to, reading
 * cookies() through lib/supabase/server.ts) forced every single page in the
 * app to render dynamically, static informational pages included. Signed-out
 * is the default render, matching the majority of traffic (anonymous
 * visitors, crawlers); a signed-in visitor sees a brief swap to their real
 * nav after hydration instead of the old zero-flash server render, and the
 * sign-in/sign-out links here no longer work with JavaScript disabled — both
 * deliberate trade-offs for making the rest of the site cacheable.
 */
export function PublicNav() {
  const { data } = useViewer();
  const signedIn = data.signedIn;
  const dashboardHref = data.role ? dashboardPathFor(data.role) : null;
  const postHref = postJobHref(data.role);

  const { scrollY } = useScroll();
  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Brief §2: compress past 60px.
  useMotionValueEvent(scrollY, "change", (y) => setCompact(y > 60));

  // Close on route change — otherwise the overlay survives navigation.
  useEffect(() => setMenuOpen(false), [pathname]);

  // A full-screen overlay must not leave the page behind it scrollable.
  useEffect(() => {
    if (!menuOpen) return;
    lockScroll();
    return () => unlockScroll();
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 px-4 pt-4">
        <motion.div
          // Height and shadow are the whole scroll effect. Animating them via
          // Framer keeps it interruptible if the user scrolls back up mid-way.
          animate={{
            paddingTop: compact ? 8 : 14,
            paddingBottom: compact ? 8 : 14,
          }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className={`clay translucent mx-auto flex max-w-6xl items-center gap-3 px-4
                      transition-[box-shadow,background-color] duration-300 ease-out
                      ${compact ? "shadow-clay-lifted bg-surface/80 backdrop-blur-xl" : ""}`}
        >
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3"
            aria-label={`${site.name} home`}
          >
            <Logo height={32} priority />
            <span className="hidden h-5 w-px bg-line sm:block" aria-hidden />
            <span className="eyebrow hidden sm:block">Jobs</span>
          </Link>

          {/* prefetch off: this bar is sticky and above the fold on every
              page, so without it these four links fire an RSC-prefetch edge
              request on every single pageview before a visitor does anything. */}
          <div className="ml-auto hidden items-center gap-4 lg:flex">
            <Link href="/jobs" prefetch={false} className="text-sm text-muted transition-colors duration-150 ease-out hover:text-ink">
              {nav.browse}
            </Link>
            <Link href="/for-talent" prefetch={false} className="text-sm text-muted transition-colors duration-150 ease-out hover:text-ink">
              {nav.forTalent}
            </Link>
            <Link href="/employers" prefetch={false} className="text-sm text-muted transition-colors duration-150 ease-out hover:text-ink">
              {nav.forEmployers}
            </Link>
            <Link href="/about" prefetch={false} className="text-sm text-muted transition-colors duration-150 ease-out hover:text-ink">
              {nav.about}
            </Link>
          </div>

          <div className="ml-4 hidden items-center gap-1.5 lg:flex">
            {signedIn && dashboardHref ? (
              <>
                <Link href={postHref} className="btn-primary">
                  {nav.post}
                </Link>
                <Link href={dashboardHref} className="btn-ghost">
                  {nav.dashboard}
                </Link>
                <form action="/auth/signout" method="post">
                  <button type="submit" className="btn-ghost">
                    {nav.signOut}
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/auth/signup" className="btn-accent">
                  {nav.getStarted}
                </Link>
                <Link href="/auth/login" className="btn-ghost text-xs">
                  {nav.signIn}
                </Link>
              </>
            )}
            <ThemeToggle className="ml-1" />
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={nav.openMenu}
            aria-expanded={menuOpen}
            className="press ml-auto grid h-9 w-9 place-items-center rounded-pill text-ink lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </motion.div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-xl lg:hidden"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              className="flex h-full flex-col p-6"
            >
              <div className="flex items-center justify-between">
                <Logo height={32} />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label={nav.closeMenu}
                  className="press grid h-10 w-10 place-items-center rounded-pill text-ink"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>

              {/* Generous tap targets, per the brief. */}
              <nav className="mt-10 flex flex-col gap-2">
                <Link href="/jobs" prefetch={false} className="clay px-5 py-4 text-lg text-ink">
                  {nav.browse}
                </Link>
                <Link href="/for-talent" prefetch={false} className="clay px-5 py-4 text-lg text-ink">
                  {nav.forTalent}
                </Link>
                <Link href="/employers" prefetch={false} className="clay px-5 py-4 text-lg text-ink">
                  {nav.forEmployers}
                </Link>
                <Link href="/about" prefetch={false} className="clay px-5 py-4 text-lg text-ink">
                  {nav.about}
                </Link>
                {signedIn && dashboardHref ? (
                  <>
                    <Link href={postHref} className="clay px-5 py-4 text-lg text-accent-text">
                      {nav.post}
                    </Link>
                    <Link href={dashboardHref} className="clay px-5 py-4 text-lg text-ink">
                      {nav.dashboard}
                    </Link>
                    <form action="/auth/signout" method="post">
                      <button type="submit" className="clay w-full px-5 py-4 text-left text-lg text-muted">
                        {nav.signOut}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link href="/auth/signup" className="clay px-5 py-4 text-lg text-accent-text">
                      {nav.getStarted}
                    </Link>
                    <Link href="/auth/login" className="clay px-5 py-4 text-lg text-ink">
                      {nav.signIn}
                    </Link>
                  </>
                )}
              </nav>

              <div className="mt-auto flex items-center justify-between pt-8">
                <span className="eyebrow">{nav.themeToggle}</span>
                <ThemeToggle />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
