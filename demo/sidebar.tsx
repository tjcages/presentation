/**
 * Totem admin's settings sidebar, reproduced.
 *
 * Every class string here is copied verbatim from the real components rather
 * than translated by eye:
 *
 *   SidebarGroupLabel / SidebarMenu / SidebarMenuItem / SidebarMenuButton
 *     packages/admin-kit/src/primitives/sidebar.tsx
 *   SettingsNav (heading, search box, rows)
 *     packages/admin-kit/src/settings-nav.tsx
 *   SectionsMenu (the pushed Access level)
 *     apps/admin/src/components/navigation/_sidebar-sections.tsx
 *   SETTINGS_NAV / ACCESS_SECTIONS (labels + icons)
 *     apps/admin/src/nav-settings.ts, .../navigation/_sections.ts
 *
 * The parts that only exist inside the app shell — the sidebar context, the
 * collapsed-rail variants, tooltips, capability filtering, keyword search
 * sub-rows — are dropped, because there is no collapsible rail here to drive
 * them. Nothing that affects how a row *looks* is dropped.
 */

import * as React from "react";
import {
  Calculator,
  ClockRewind,
  Contrast01,
  CpuChip01,
  LayoutLeft,
  Lock01,
  PuzzlePiece01,
  SearchMd,
  User01,
  Users01,
  XClose,
} from "@untitledui/icons";

type IconType = React.ComponentType<{ className?: string }>;

/* ── Registries, matching the app's ─────────────────────────────────────── */

export interface NavRow {
  id: string;
  label: string;
  to: string;
  end?: boolean;
  icon: IconType;
}

/** `apps/admin/src/nav-settings.ts` — same order, same labels, same icons. */
export const SETTINGS_NAV: NavRow[] = [
  { id: "general", label: "General", to: "/settings", end: true, icon: User01 },
  { id: "appearance", label: "Appearance", to: "/settings/appearance", icon: Contrast01 },
  { id: "navigation", label: "Navigation", to: "/settings/navigation", icon: LayoutLeft },
  { id: "access", label: "Access", to: "/settings/access", icon: Lock01 },
  { id: "pricing", label: "Pricing", to: "/settings/pricing", icon: Calculator },
  { id: "models", label: "Models", to: "/settings/models", icon: CpuChip01 },
  { id: "integrations", label: "Integrations", to: "/settings/integrations", icon: PuzzlePiece01 },
];

/**
 * `ACCESS_SECTIONS` in `_sections.ts` — id order and icons included.
 *
 * These are `?tab=` views on one route, not routes of their own. That is the
 * app's actual shape, and it matters here: switching between them never
 * changes the path, so the stack sees no navigation at all and nothing
 * animates, which is exactly what the app does.
 */
export const ACCESS_SECTIONS = [
  { id: "people", label: "People", icon: Users01 },
  { id: "agents", label: "Agents", icon: CpuChip01 },
  { id: "roles", label: "Roles", icon: Lock01 },
  { id: "activity", label: "Activity", icon: ClockRewind },
] as const;

export const ACCESS_BASE = "/settings/access";

/** `sectionHref` — the default section is addressed without a param. */
export function sectionHref(id: string): string {
  return id === "people" ? ACCESS_BASE : `${ACCESS_BASE}?tab=${id}`;
}

/* ── Primitives ─────────────────────────────────────────────────────────── */

function cn(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function SidebarGroupLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-sidebar="group-label"
      className={cn(
        "text-sidebar-foreground/70 ring-sidebar-ring outline-hidden flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidebarMenu({ children }: { children: React.ReactNode }) {
  return (
    <ul
      data-sidebar="menu"
      // `**:data-[sidebar=menu-button]:gap-3` — SettingsNav and SectionsMenu
      // both widen the icon gap from the primitive's default 2.
      className="flex w-full min-w-0 flex-col gap-1 **:data-[sidebar=menu-button]:gap-3"
    >
      {children}
    </ul>
  );
}

export function SidebarMenuItem({ children }: { children: React.ReactNode }) {
  return <li className="group/menu-item relative">{children}</li>;
}

/**
 * The row.
 *
 * The active state is the detail most likely to be got wrong: it is **not** a
 * filled pill. The row keeps a transparent background and turns its label and
 * icon `accent-100` — the primitive's own comment calls this the Kumo
 * (Cloudflare dashboard) vocabulary. Hover is the only thing that fills.
 */
export const SIDEBAR_MENU_BUTTON = cn(
  "peer/menu-button group/menu-button ring-sidebar-ring outline-hidden flex w-full min-w-0 cursor-pointer items-center gap-2 overflow-hidden rounded-lg text-left font-medium",
  "transition-[color,background-color,padding] duration-300 ease-out motion-reduce:transition-none",
  "[&>svg]:text-foreground-300 [&>svg]:size-4 [&>svg]:shrink-0",
  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  "active:bg-sidebar-accent active:text-sidebar-accent-foreground",
  "data-[active=true]:text-accent-100 data-[active=true]:hover:bg-sidebar-accent data-[active=true]:[&>svg]:text-accent-100 data-[active=true]:bg-transparent",
  "focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
  "[&>span:last-child]:truncate",
  // size: default
  "min-h-[34px] px-3 py-1.5 text-sm",
);

/* ── The two levels ─────────────────────────────────────────────────────── */

export interface RailLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
  "data-active"?: boolean;
  "data-sidebar"?: string;
}

/** `isNavItemActive` — exact match for `end`, prefix match otherwise. */
function isActive(pathname: string, to: string, end?: boolean): boolean {
  return end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
}

/** admin-kit's `SettingsNav`: heading, search box, then the section rows. */
export function SettingsRail({
  pathname,
  Link,
}: {
  pathname: string;
  Link: React.ComponentType<RailLinkProps>;
}) {
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const q = query.trim().toLowerCase();
  const rows = q
    ? SETTINGS_NAV.filter((item) => item.label.toLowerCase().includes(q))
    : SETTINGS_NAV;

  return (
    <div className="flex flex-col gap-1">
      <SidebarGroupLabel className="text-foreground-300/70">
        <span className="truncate">Settings</span>
      </SidebarGroupLabel>

      <div className="relative mb-2">
        <SearchMd className="text-foreground-300 pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              inputRef.current?.blur();
            }
          }}
          placeholder="Search settings..."
          className={cn(
            "border-border-100 bg-background-200/70 text-foreground-100 placeholder:text-foreground-300",
            "focus-visible:border-ring focus-visible:ring-accent-100/40 h-8 w-full rounded-md border pl-8 pr-8 text-sm",
            "outline-none transition-shadow focus-visible:ring-[3px]",
          )}
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="text-foreground-300 hover:text-foreground-100 absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center"
          >
            <XClose className="size-3.5" />
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="text-foreground-300 px-3 py-2 text-sm">No settings found</p>
      ) : (
        <SidebarMenu>
          {rows.map((item) => {
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.id}>
                <Link
                  href={item.to}
                  data-sidebar="menu-button"
                  data-active={!query && isActive(pathname, item.to, item.end)}
                  className={SIDEBAR_MENU_BUTTON}
                >
                  <Icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      )}
    </div>
  );
}

/** `SectionsMenu` — the level Access pushes: a title, then its sibling views. */
export function AccessRail({
  section,
  Link,
}: {
  section: string;
  Link: React.ComponentType<RailLinkProps>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <SidebarGroupLabel className="text-foreground-300/70 flex items-center gap-1 pr-1">
        <span className="min-w-0 flex-1 truncate">Access</span>
      </SidebarGroupLabel>
      <SidebarMenu>
        {ACCESS_SECTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <SidebarMenuItem key={item.id}>
              <Link
                href={sectionHref(item.id)}
                data-sidebar="menu-button"
                data-active={section === item.id}
                className={SIDEBAR_MENU_BUTTON}
              >
                <Icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </div>
  );
}
