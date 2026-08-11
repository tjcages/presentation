"use client";

/**
 * Viewport helpers for the shell.
 *
 * Page presentation styles still resolve in CSS so a resize never remounts a
 * level. The shell needs a JS mobile flag for two reasons Totem already proved:
 * conditional dock mounting (CSS `md:hidden` alone can leak), and pointer
 * gestures that must not attach on desktop.
 *
 * Initial state is `false` so the first client render matches SSR markup —
 * the rail mounts in its desktop shape, then flips once after mount. That
 * avoids a hydration mismatch; the dock simply is not mounted until the
 * matchMedia result is known.
 */

import * as React from "react";

import { BREAKPOINTS } from "./_resolve.js";

/** Matches Totem / Tailwind `md`: widths below this are mobile. */
export const SHELL_MOBILE_MAX = BREAKPOINTS.md - 1;

export function useIsMobile(maxWidth = SHELL_MOBILE_MAX): boolean {
  const [mobile, setMobile] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const sync = () => {
      setMobile(window.innerWidth <= maxWidth);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [maxWidth]);

  return mobile;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return reduced;
}
