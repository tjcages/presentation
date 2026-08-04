"use client";

import type { AdminKitLink } from "./context";
import type { NavConfig, NavItem } from "./types";
import { AppSidebar, type NavStackScreen } from "./app-sidebar";
import { AdminKitProvider } from "./context";
import { cn } from "./lib/cn";
import { SidebarInset, SidebarProvider } from "./primitives/sidebar";

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
 * The dashboard frame: sidebar + optional top bar + content.
 * Default pages use the window/document scroller (better mobile touch
 * scrolling). Self-scroll pages lock to the small viewport instead.
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
  return (
    <AdminKitProvider Link={Link} pathname={pathname}>
      <SidebarProvider
        resizable={resizable}
        className={selfScroll ? "h-svh max-h-svh overflow-hidden" : undefined}
      >
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
        <SidebarInset
          className={cn(
            "min-w-0",
            // Document-scroll pages must NOT keep the inset's default
            // `min-h-0` — that collapses content height on mobile WebKit once
            // the nested scrollport is gone. Self-scroll keeps `min-h-0` so
            // the locked `h-svh` shell can resolve inner `h-full` panes.
            selfScroll ? "min-h-0" : "min-h-auto",
            // Full-bleed pages: drop the opaque canvas AND the padding
            // transition. Both promote the inset onto its own compositing
            // layer, which makes the sidebar's backdrop-filter silently skip
            // blurring the content behind. Full-bleed pages paint their own
            // surface anyway.
            fullBleed && "md:!bg-transparent md:!pl-0 md:!transition-none",
          )}
        >
          {topBar}
          <div
            className={cn(
              "min-w-0",
              // Default: natural block height so the document grows and
              // window-scrolls (content passes behind the fixed tab bar).
              // Self-scroll: flex-1 + min-h-0 + clip so nested panes resolve.
              // Full-bleed: overflow-visible for frosted sidebar blur.
              fullBleed
                ? "min-h-0 flex-1 overflow-visible"
                : selfScroll
                  ? "min-h-0 flex-1 overflow-hidden"
                  : undefined,
            )}
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AdminKitProvider>
  );
}
