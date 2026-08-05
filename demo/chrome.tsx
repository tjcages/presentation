/**
 * The app chrome, mirroring `apps/admin/src/components/_app-chrome.tsx`.
 *
 * `NAV` is copied from `apps/admin/src/nav.ts`. The settings branch of
 * `sidebarScreens` is the same shape and the same rule: one screen for the
 * settings level, a second when the path is inside a registered sub-level.
 *
 * The parts that only exist with a backend — capability filtering, the
 * DB-driven Partners group, favorites/recents, the command palette — are left
 * out. Everything that decides how the sidebar looks or moves is here.
 */

import * as React from "react";
import {
  BarChartSquare01,
  ChevronSelectorVertical,
  Disc01,
  File02,
  Settings01,
  Tag01,
  Users01,
} from "@untitledui/icons";

import { AppShell, type NavStackScreen } from "./admin-kit";
import { BrandMark } from "./admin-kit/branding";
import { SettingsNav } from "./admin-kit/settings-nav";
import { cn } from "./admin-kit/lib/cn";
import type { AdminKitLinkProps } from "./admin-kit/context";
import type { NavConfig } from "./admin-kit/types";
import { SETTINGS_NAV } from "./nav-settings";
import { SectionLevelNav } from "./sidebar-sections";
import { findSectionLevel, findSettingsSubLevel } from "./sections";

/** `apps/admin/src/nav.ts`. */
export const NAV: NavConfig = {
  groups: [
    {
      label: "Workspace",
      items: [
        { title: "Albums", to: "/", icon: Disc01, end: true, activePrefixes: ["/product", "/new-album"] },
        { title: "Analytics", to: "/analytics", icon: BarChartSquare01, end: true },
        { title: "Roster", to: "/crm", icon: Users01 },
        { title: "Labels", to: "/pricing", icon: Tag01 },
      ],
    },
    {
      label: "Website",
      collapsible: true,
      defaultOpen: true,
      autoExpandActive: true,
      items: [{ title: "Policies", to: "/policies", icon: File02, activePrefixes: ["/policies"] }],
    },
  ],
  footer: [{ title: "Settings", to: "/settings", icon: Settings01 }],
};

const USER = { name: "Tyler J. Cagle", email: "ty@audiophysical.com" };

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

/** `<Brand />` — the waveform mark beside the wordmark. */
function Brand() {
  return (
    <div className="flex h-14 items-center gap-2 px-3.5 group-data-[collapsible=icon]:px-2">
      <BrandMark className="text-accent-100 h-5 w-auto shrink-0" />
      <span className="text-foreground-100 truncate text-[15px] font-medium group-data-[collapsible=icon]:hidden">
        Totem
      </span>
    </div>
  );
}

/** `<SidebarProfileRow />` — who you are, with the switcher affordance. */
function SidebarProfileRow() {
  return (
    <button
      type="button"
      className={cn(
        "hover:bg-sidebar-accent flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors",
      )}
    >
      <span className="bg-accent-100 flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-medium text-white">
        {initials(USER.name)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-foreground-100 truncate text-sm font-medium">{USER.name}</span>
        <span className="text-foreground-300 truncate text-xs">{USER.email}</span>
      </span>
      <ChevronSelectorVertical className="text-foreground-300 ml-auto size-4 shrink-0" />
    </button>
  );
}

export function AppChrome({
  pathname,
  search,
  navigate,
  Link,
  children,
}: {
  pathname: string;
  search: string;
  navigate: (to: string) => void;
  Link: React.ComponentType<AdminKitLinkProps>;
  children: React.ReactNode;
}) {
  /**
   * `_app-chrome.tsx`'s settings branch, unchanged in shape: the settings
   * level always, plus the sub-level's own screen when the path is inside one.
   * Back goes *out* of the level it is on — to `/settings` from a sub-level,
   * to Albums from the settings level itself.
   */
  const { sidebarScreens, onSidebarBack, sidebarBackLabel } = React.useMemo((): {
    sidebarScreens?: NavStackScreen[];
    onSidebarBack?: () => void;
    sidebarBackLabel?: string;
  } => {
    if (pathname.startsWith("/settings")) {
      const screens: NavStackScreen[] = [
        { id: "app-settings", left: <SettingsNav groups={SETTINGS_NAV} />, right: null },
      ];

      const subLevel = findSettingsSubLevel(pathname);
      if (subLevel) {
        screens.push({
          id: subLevel.basePath,
          left: <SectionLevelNav level={subLevel} search={search} />,
          right: null,
        });
        return {
          sidebarScreens: screens,
          onSidebarBack: () => navigate("/settings"),
          sidebarBackLabel: "Settings",
        };
      }

      return {
        sidebarScreens: screens,
        onSidebarBack: () => navigate("/"),
        sidebarBackLabel: "Albums",
      };
    }

    // Registered areas (Roster, Labels) push their own level, so their pages
    // live in the sidebar instead of as extra rows in the flat root nav. One
    // lookup, no if-chain — see SECTION_LEVELS.
    const level = findSectionLevel(pathname);
    if (level) {
      return {
        sidebarScreens: [
          { id: level.basePath, left: <SectionLevelNav level={level} search={search} />, right: null },
        ],
        onSidebarBack: () => navigate("/"),
        sidebarBackLabel: "Albums",
      };
    }

    return {};
  }, [pathname, search, navigate]);

  return (
    <AppShell
      nav={NAV}
      pathname={pathname}
      Link={Link}
      brand={<Brand />}
      profileSlot={
        <div className="group-data-[collapsible=icon]:hidden">
          <SidebarProfileRow />
        </div>
      }
      sidebarScreens={sidebarScreens}
      onSidebarBack={onSidebarBack}
      sidebarBackLabel={sidebarBackLabel}
    >
      <main className="!bg-transparent pt-2 pb-28 md:pt-6 md:pb-12">{children}</main>
    </AppShell>
  );
}
