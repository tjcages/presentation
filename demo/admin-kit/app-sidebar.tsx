"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, LayoutLeft, Star01 } from "@untitledui/icons";
import { AnimatePresence, motion } from "framer-motion";

import {
  AtRootLevel,
  Presentation,
  PresentationScope,
  type StackEntry,
} from "@tjcages/presentation";

import type { NavConfig, NavGroup, NavItem } from "./types";
import { isNavItemActive, useAdminKit } from "./context";
import { cn } from "./lib/cn";
import { useOptionalNavPreferences } from "./nav-preferences-context";

/** One pushed sidebar level. Same shape `NavStack` took. */
export interface NavStackScreen {
  id: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./primitives/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarResizeHandle,
  useSidebar,
} from "./primitives/sidebar";

/** Path-based active check shared by nav rows, the footer, and group auto-expand. */
function isItemActive(item: NavItem, pathname: string): boolean {
  return (
    isNavItemActive(pathname, item.to, item.end) ||
    (item.activePrefixes?.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    ) ??
      false)
  );
}

function NavMenuItem({ item }: { item: NavItem }) {
  const { Link, pathname } = useAdminKit();
  const active = item.active ?? isItemActive(item, pathname);
  return (
    <SidebarMenuItem className="flex items-center">
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.title}
        variant={item.variant}
        className="w-auto! flex-1"
      >
        <Link to={item.to} end={item.end}>
          {item.iconNode ?? (item.icon ? <item.icon /> : null)}
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
      <FavoriteAction item={item} />
      {(item.badge ?? 0) > 0 && (
        <SidebarMenuBadge className="text-foreground-300 tabular-nums group-data-[collapsible=icon]:hidden">
          {item.badge}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}

function FavoriteAction({ item }: { item: NavItem }) {
  const preferences = useOptionalNavPreferences();
  const favorite = item.favorite;
  if (!favorite || !preferences) return null;
  const favorited = preferences.isFavorite(favorite);

  return (
    <button
      type="button"
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favorited}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        preferences.toggleFavorite(favorite);
      }}
      className={cn(
        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ring-sidebar-ring outline-hidden flex h-[34px] w-8 shrink-0 items-center justify-center rounded-md transition-[color,opacity,scale] duration-150 focus-visible:ring-2 active:scale-[0.96] group-data-[collapsible=icon]:hidden",
        "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 md:opacity-0",
        favorited && "text-accent-100 opacity-100 md:opacity-100",
      )}
    >
      <Star01 className={cn("size-3.5!", favorited && "fill-current")} />
    </button>
  );
}

function CollapseButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <div className="flex justify-end pt-1.5 group-data-[collapsible=icon]:justify-center">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-md transition-colors",
          "text-foreground-300 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          "motion-reduce:transition-none",
        )}
      >
        <LayoutLeft className="size-3.5 shrink-0" />
      </button>
    </div>
  );
}

const groupLabelClassName = cn(
  "text-foreground-200",
  // Collapsed: keep the row's height (don't pull to 0 with -mt-8) so items
  // below never shift. Swap the text for a thin divider.
  "group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:opacity-100",
);

function GroupLabelDivider() {
  return (
    <span
      aria-hidden
      className="bg-sidebar-border hidden h-px w-full rounded-full group-data-[collapsible=icon]:block"
    />
  );
}

function GroupItems({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroupContent>
      <SidebarMenu>
        {items.map((item) => (
          <NavMenuItem key={item.to} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  );
}

/**
 * Group behind a chevron toggle. Auto-expands when one of its items becomes
 * the active route. On the icon rail the trigger is inert (the label collapses
 * to a divider), so the group only shows there when it was already open or
 * holds the active route.
 */
function CollapsibleNavGroup({ group }: { group: NavGroup }) {
  const { pathname } = useAdminKit();
  const hasActiveChild = group.items.some(
    (item) => item.active ?? isItemActive(item, pathname),
  );
  const shouldAutoExpand = group.autoExpandActive !== false && hasActiveChild;

  const [open, setOpen] = React.useState(group.defaultOpen ?? shouldAutoExpand);
  const [prevAutoExpand, setPrevAutoExpand] = React.useState(shouldAutoExpand);
  if (shouldAutoExpand !== prevAutoExpand) {
    setPrevAutoExpand(shouldAutoExpand);
    if (shouldAutoExpand) setOpen(true);
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarGroup className="p-0">
        <SidebarGroupLabel asChild className={groupLabelClassName}>
          <CollapsibleTrigger className="w-full cursor-pointer group-data-[collapsible=icon]:pointer-events-none">
            <span className="truncate group-data-[collapsible=icon]:hidden">
              {group.label}
            </span>
            <ChevronRight
              aria-hidden
              className="size-3! ml-auto shrink-0 transition-transform duration-200 ease-out group-data-[collapsible=icon]:hidden group-data-[state=open]/collapsible:rotate-90 motion-reduce:transition-none"
            />
            <GroupLabelDivider />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <GroupItems items={group.items} />
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

/** Level 0 of the sidebar stack — the config-driven nav. */
function EntitySection({ label, items }: { label: string; items: NavItem[] }) {
  if (items.length === 0) return null;
  return (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel className={groupLabelClassName}>
        <span className="truncate group-data-[collapsible=icon]:hidden">
          {label}
        </span>
        <GroupLabelDivider />
      </SidebarGroupLabel>
      <GroupItems items={items} />
    </SidebarGroup>
  );
}

function RootNav({
  nav,
  favorites,
  recents,
}: {
  nav: NavConfig;
  favorites: NavItem[];
  recents: NavItem[];
}) {
  const firstEntityGroup = nav.groups.findIndex(
    (group) => group.label === "Partners" || group.label === "Labels",
  );
  const primaryGroups =
    firstEntityGroup === -1
      ? nav.groups
      : nav.groups.slice(0, firstEntityGroup);
  const entityGroups =
    firstEntityGroup === -1 ? [] : nav.groups.slice(firstEntityGroup);

  const renderGroups = (groups: NavGroup[]) =>
    groups.map((group, i) =>
      group.collapsible && group.label ? (
        <CollapsibleNavGroup key={group.label} group={group} />
      ) : (
        <SidebarGroup key={group.label ?? `group-${i}`} className="p-0">
          {group.label && (
            <SidebarGroupLabel className={groupLabelClassName}>
              <span className="truncate group-data-[collapsible=icon]:hidden">
                {group.label}
              </span>
              <GroupLabelDivider />
            </SidebarGroupLabel>
          )}
          <GroupItems items={group.items} />
        </SidebarGroup>
      ),
    );

  return (
    <div className="flex flex-col gap-2">
      {renderGroups(primaryGroups)}
      <EntitySection label="Favorites" items={favorites} />
      {renderGroups(entityGroups)}
      <EntitySection label="Recents" items={recents} />
    </div>
  );
}

export interface AppSidebarProps {
  nav: NavConfig;
  /** Branding rendered in the sidebar header (logo + name). */
  brand?: React.ReactNode;
  /** Pinned at the very top of the sidebar, above the nav (the profile selector). */
  profileSlot?: React.ReactNode;
  /**
   * Contextual levels pushed onto the sidebar nav (e.g. a product's section
   * switcher). When present (and the sidebar is expanded on desktop) the nav
   * becomes an iOS-style push stack (`NavStack`), configured here as a single
   * column.
   */
  sidebarScreens?: NavStackScreen[];
  /** Pop a pushed sidebar level (back button). */
  onSidebarBack?: () => void;
  /** Label on the sidebar back button (e.g. "Albums"). */
  sidebarBackLabel?: string;
  favorites?: NavItem[];
  recents?: NavItem[];
}

/** Config-driven sidebar. The nav structure comes entirely from `nav`. */
export function AppSidebar({
  nav,
  brand,
  profileSlot,
  sidebarScreens,
  onSidebarBack,
  sidebarBackLabel,
  favorites = [],
  recents = [],
}: AppSidebarProps) {
  const { state, isMobile } = useSidebar();
  const { pathname } = useAdminKit();
  const root = <RootNav nav={nav} favorites={favorites} recents={recents} />;
  // Mount `NavStack` *continuously* while the sidebar is expanded on desktop —
  // that's what makes the push/pop animate (screens grow from 0 → 1 inside an
  // already-mounted stack). Collapsed-icon and mobile-Sheet keep the static
  // root (NavStack's mobile path portals full-screen to <body>, which is
  // correct for a page but wrong in a sidebar).
  const useStack = state === "expanded" && !isMobile;

  return (
    // Publishes the pushed-level depth to the footer, which is a sibling of
    // the levels rather than a descendant and so cannot read it otherwise.
    <PresentationScope level={sidebarScreens?.length ?? 0}>
    <Sidebar collapsible="icon">
      {brand && <SidebarHeader className="p-0">{brand}</SidebarHeader>}

      <SidebarContent className="**:data-[sidebar=menu-button]:gap-3 px-2 pt-4">
        {/* Profile selector pinned above the nav — stays put while sidebar
            screens push/pop below it (it scopes the whole app, not a level). */}
        {profileSlot && <div className="pb-3">{profileSlot}</div>}
        {useStack ? (
          <SidebarLevels
            root={root}
            screens={sidebarScreens ?? []}
            onBack={onSidebarBack}
            backLabel={sidebarBackLabel}
          />
        ) : (
          root
        )}
      </SidebarContent>

      <SidebarFooter className="px-2 pb-4">
        <div className="flex w-full flex-col">
          {nav.footer && nav.footer.length > 0 && (
            <AtRootLevel>
            <SidebarMenu className="**:data-[sidebar=menu-button]:gap-3">
              {/* When a footer item *is* the current page, slide it out — the
                  pushed sidebar screen has already taken over the main rail,
                  so leaving the footer entry behind would double-show the
                  destination. Matches the 25% x + fade NavStack uses. */}
              <AnimatePresence initial={false}>
                {nav.footer
                  .filter((item) => !isItemActive(item, pathname))
                  .map((item) => (
                    <motion.div
                      key={item.to}
                      initial={{ opacity: 0, x: "-25%", height: 0 }}
                      animate={{ opacity: 1, x: "0%", height: "auto" }}
                      exit={{ opacity: 0, x: "-25%", height: 0 }}
                      transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <NavMenuItem item={item} />
                    </motion.div>
                  ))}
              </AnimatePresence>
            </SidebarMenu>
            </AtRootLevel>
          )}
          <CollapseButton />
        </div>
      </SidebarFooter>

      <SidebarResizeHandle />
    </Sidebar>
    </PresentationScope>
  );
}


/**
 * The sidebar's pushed levels, driven by `@tjcages/presentation`.
 *
 * This is where NavStack used to sit. The host has already worked out how deep
 * it is — `screens.length` — so the resolver here is synthetic: it reports that
 * depth rather than parsing a URL. The package does not care where the number
 * comes from, only that it is stable and derived, which is the whole point of
 * keeping depth out of component state.
 *
 * Rail-only: no children, so there is no detail pane and the levels take the
 * sidebar's full width. That is exactly how NavStack was configured here
 * (`rootRight={null}`, `leftWidthClassName="w-full"`, `gapClassName=""`).
 */
function SidebarLevels({
  root,
  screens,
  onBack,
  backLabel = "Back",
}: {
  root: React.ReactNode;
  screens: NavStackScreen[];
  onBack?: () => void;
  backLabel?: string;
}) {
  const { pathname } = useAdminKit();
  const depth = screens.length;

  const resolve = React.useCallback(
    (path: string): StackEntry => ({
      depth,
      level: depth,
      path,
      title: backLabel,
    }),
    [depth, backLabel],
  );

  const rail = React.useCallback(
    () => (
      <>
        {depth > 0 && onBack ? (
          <BackButton label={backLabel} onClick={onBack} />
        ) : null}
        {depth > 0 ? screens[depth - 1]?.left : root}
      </>
    ),
    [depth, onBack, backLabel, screens, root],
  );

  return (
    <Presentation
      path={pathname}
      navigate={() => undefined}
      resolve={resolve}
      present="rails"
      rail={rail}
      bar={false}
      swipe={false}
      restoreScroll={false}
    />
  );
}

/** NavStack's back affordance, unchanged. */
function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-foreground-300 hover:text-foreground-100 -ml-1 mb-3 inline-flex w-full min-w-0 items-center gap-1 rounded-md px-1 py-1 text-sm font-medium transition-colors"
    >
      <ChevronLeft className="size-4 shrink-0" />
      <span className="truncate text-left">{label}</span>
    </button>
  );
}
