"use client";

import * as React from "react";
import { Shell, useShell } from "@tjcages/presentation";

import type { AdminKitLink } from "./context";
import type { NavConfig, NavItem } from "./types";
import { AppSidebar, type NavStackScreen } from "./app-sidebar";
import { AdminKitProvider } from "./context";
import { cn } from "./lib/cn";
import { SidebarProvider } from "./primitives/sidebar";

export interface AppShellProps {
  nav: NavConfig;
  /** Current pathname (drives active nav state). */
  pathname: string;
  /** Host link component, e.g. a next/link wrapper. */
  Link: AdminKitLink;
  /** Sidebar branding (logo + name). */
  brand?: React.ReactNode;
  /** Pinned at the very top of the sidebar, above the nav (the profile selector). */
  profileSlot?: React.ReactNode;
  /** User-pinned destinations, resolved against current server data. */
  favorites?: NavItem[];
  /** Up to four recently visited albums, partners, or labels. */
  recents?: NavItem[];
  /** Contextual levels pushed onto the sidebar nav (e.g. a product's section switcher). */
  sidebarScreens?: NavStackScreen[];
  /** Pop a pushed sidebar level (back button). */
  onSidebarBack?: () => void;
  /** Label on the sidebar back button. */
  sidebarBackLabel?: string;
  /** Top bar rendered above the scrollable content (search, switchers, etc.). */
  topBar?: React.ReactNode;
  /** Enable drag-to-resize on the sidebar edge. @default true */
  resizable?: boolean;
  /**
   * Render the page edge-to-edge under the sidebar — the inset drops its
   * sidebar-width left padding and its scroll container stops clipping
   * horizontally, so page content paints from `x = 0` and scrolls behind
   * the sidebar's frosted glass. Pages that opt in are responsible for
   * keeping their own chrome (toolbars, headers) clear of the sidebar via
   * `pl-[calc(var(--sidebar-rail-width,0px)+…)]`.
   * @default false
   */
  fullBleed?: boolean;
  /**
   * The page manages its OWN scrolling (e.g. a view with a pinned composer).
   * Locks the shell to `h-svh` and clips the content area so the page's
   * inner `h-full` flex layout resolves — unlike `fullBleed`, this keeps
   * the canvas background + sidebar padding.
   * @default false
   */
  selfScroll?: boolean;
  children: React.ReactNode;
}

/**
 * Demo app frame driven by `@tjcages/presentation` `<Shell>`.
 *
 * Geometry, fixed desktop rail, and mobile behind-nav live in the package.
 * This file only wires Totem-shaped slots (brand, nav data, dock).
 */
export function AppShell({
  nav,
  pathname,
  Link,
  brand,
  profileSlot,
  favorites,
  recents,
  sidebarScreens,
  onSidebarBack,
  sidebarBackLabel,
  topBar,
  resizable = true,
  fullBleed = false,
  selfScroll = false,
  children,
}: AppShellProps) {
  // Root-depth destinations own the edge-open gesture; deeper URL stacks
  // leave the edge to Presentation swipe-back.
  const atRootDepth =
    (sidebarScreens?.length ?? 0) === 0 &&
    !/^\/settings\/.+/.test(pathname) &&
    !/^\/crm\/.+/.test(pathname) &&
    !/^\/pricing\/.+/.test(pathname) &&
    !/^\/product\/.+/.test(pathname);

  return (
    <AdminKitProvider Link={Link} pathname={pathname}>
      <Shell
        path={pathname}
        edgeOpen={atRootDepth}
        className={selfScroll ? "h-svh max-h-svh overflow-hidden" : undefined}
        style={
          {
            // Demo: light, high-contrast shell so the rail is unmistakable.
            "--pr-shell-surface": "#ffffff",
            "--pr-shell-rail-surface": "#f4f4f5",
            "--pr-shell-rail-border": "#e4e4e7",
            colorScheme: "light",
          } as React.CSSProperties
        }
        rail={
          <SidebarProvider resizable={resizable} className="contents">
            <AppSidebar
              nav={nav}
              brand={brand}
              profileSlot={profileSlot}
              favorites={favorites}
              recents={recents}
              sidebarScreens={sidebarScreens}
              onSidebarBack={onSidebarBack}
              sidebarBackLabel={sidebarBackLabel}
            />
          </SidebarProvider>
        }
        mobileDock={<DemoMobileDock nav={nav} Link={Link} profile={profileSlot} />}
      >
        {topBar}
        <div
          className={cn(
            "min-w-0",
            fullBleed
              ? "min-h-0 flex-1 overflow-visible"
              : selfScroll
                ? "min-h-0 flex-1 overflow-hidden"
                : undefined,
            fullBleed && "md:!pl-0",
          )}
        >
          {children}
        </div>
      </Shell>
    </AdminKitProvider>
  );
}

function DemoMobileDock({
  nav,
  Link,
  profile,
}: {
  nav: NavConfig;
  Link: AdminKitLink;
  profile?: React.ReactNode;
}) {
  const { setOpen } = useShell();
  const footer = nav.footer ?? [];
  if (footer.length === 0 && !profile) return null;

  return (
    <div data-slot="pr-shell-dock" className="pr-shell-demo-dock">
      <div className="pr-shell-demo-dock-account">{profile}</div>
      <div className="pr-shell-demo-dock-actions">
        {footer.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.title}
              className="pr-shell-demo-dock-button"
              onClick={() => setOpen(false)}
            >
              {Icon ? <Icon className="size-5" /> : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
