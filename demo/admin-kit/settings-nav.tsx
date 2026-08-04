"use client";

import * as React from "react";
import { SearchMd, XClose } from "@untitledui/icons";

import { isNavItemActive, useAdminKit } from "./context";
import { cn } from "./lib/cn";
import {
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./primitives/sidebar";

/** A deep-search target inside a section — a field label plus where it lives. */
export interface SettingsNavKeyword {
  label: string;
  /** Element id scrolled into view when this result is picked. */
  anchor?: string;
  /**
   * Destination override, when the field lives somewhere other than the
   * section's own path — a tab behind `?tab=`, say. An anchor alone cannot
   * reach those: the target element isn't mounted until the tab is selected,
   * so `scrollIntoView` finds nothing and the result silently does nothing.
   */
  to?: string;
}

/** A single settings section, rendered as one row in the section nav. */
export interface SettingsNavItem {
  /** Stable id — React key, and the match target when the host drives `activeId`. */
  id: string;
  label: string;
  /** Destination handed to the host-injected Link. */
  to: string;
  /** Match the path exactly instead of by prefix (use for the index section). */
  end?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  /** One-line hint under the label. */
  description?: string;
  /**
   * Field labels inside this section. Lets search surface a section by its
   * *contents*, not just its title — the difference between "where do I set
   * the recap address" working and not.
   */
  keywords?: SettingsNavKeyword[];
  /** Opaque permission tag — see `NavItem.capability`. The host filters. */
  capability?: string;
}

/** A labeled cluster of sections. Omit `label` for an unheaded group. */
export interface SettingsNavGroup {
  label?: string;
  items: SettingsNavItem[];
}

export interface SettingsNavMatch {
  item: SettingsNavItem;
  /** Populated only when the query hit a keyword rather than the title. */
  matchedKeywords: SettingsNavKeyword[];
}

export interface SettingsNavSearchGroup {
  label?: string;
  matches: SettingsNavMatch[];
}

/**
 * Search sections by title AND keyword. Pure — unit-tested separately from the
 * component so the matching rules can't silently drift.
 */
export function searchSettingsNav(
  groups: SettingsNavGroup[],
  query: string,
): SettingsNavSearchGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return groups.map((group) => ({
      label: group.label,
      matches: group.items.map((item) => ({ item, matchedKeywords: [] })),
    }));
  }
  const out: SettingsNavSearchGroup[] = [];
  for (const group of groups) {
    const matches: SettingsNavMatch[] = [];
    for (const item of group.items) {
      const labelMatch = item.label.toLowerCase().includes(q);
      const matchedKeywords = (item.keywords ?? []).filter((keyword) =>
        keyword.label.toLowerCase().includes(q),
      );
      if (labelMatch || matchedKeywords.length > 0) {
        // A title hit is the answer — don't bury it under keyword sub-rows.
        matches.push({
          item,
          matchedKeywords: labelMatch ? [] : matchedKeywords,
        });
      }
    }
    if (matches.length > 0) out.push({ label: group.label, matches });
  }
  return out;
}

/** Wrap every occurrence of `query` in `text` with a highlight `<mark>`. */
export function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            className="text-foreground-100 bg-accent-100/15 -mx-0.5 rounded px-0.5 font-medium"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

function scrollToAnchor(anchor?: string) {
  if (!anchor || typeof document === "undefined") return;
  // Give a cross-route navigation time to mount the target first.
  setTimeout(() => {
    document
      .getElementById(anchor)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 200);
}

export interface SettingsNavProps {
  groups: SettingsNavGroup[];
  /** Label above the section list. @default "Settings" */
  heading?: string;
  /** Show the search box. @default true */
  searchable?: boolean;
  searchPlaceholder?: string;
  /**
   * Force which section reads as active, by `id`. Use when section identity
   * lives in the query string (`?section=…`) rather than the pathname —
   * otherwise active state is derived from `to` + `end`.
   */
  activeId?: string;
  className?: string;
}

/**
 * Data-driven settings section nav, sized for a pushed sidebar level. Search
 * matches section titles *and* their `keywords`, highlighting the hit and
 * offering jump-to-field sub-rows for keyword matches with an `anchor`.
 *
 * ⌘F focuses the box only while this level is actually on screen — collapsed
 * rail and mobile leave ⌘F to whatever owns the page.
 */
export function SettingsNav({
  groups,
  heading = "Settings",
  searchable = true,
  searchPlaceholder = "Search settings...",
  activeId,
  className,
}: SettingsNavProps) {
  const { pathname } = useAdminKit();
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!searchable) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "f") return;
      // offsetParent is null while this level is hidden (collapsed rail /
      // mobile) — don't steal ⌘F from the page there.
      if (!inputRef.current?.offsetParent) return;
      e.preventDefault();
      inputRef.current.focus();
      inputRef.current.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchable]);

  const results = searchSettingsNav(groups, searchable ? query : "");
  const total = results.reduce((n, group) => n + group.matches.length, 0);
  const isActive = (item: SettingsNavItem) =>
    activeId !== undefined
      ? activeId === item.id
      : isNavItemActive(pathname, item.to, item.end);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <SidebarGroupLabel className="text-foreground-300/70">
        <span className="truncate">{heading}</span>
      </SidebarGroupLabel>

      {searchable ? (
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
            placeholder={searchPlaceholder}
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
      ) : null}

      {total === 0 ? (
        <p className="text-foreground-300 px-3 py-2 text-sm">
          No settings found
        </p>
      ) : (
        results.map((group, i) => (
          <SettingsNavGroupRows
            key={group.label ?? `group-${i}`}
            group={group}
            query={query}
            isActive={isActive}
            onNavigate={() => setQuery("")}
          />
        ))
      )}
    </div>
  );
}

function SettingsNavGroupRows({
  group,
  query,
  isActive,
  onNavigate,
}: {
  group: SettingsNavSearchGroup;
  query: string;
  isActive: (item: SettingsNavItem) => boolean;
  onNavigate: () => void;
}) {
  const { Link } = useAdminKit();
  return (
    <>
      {group.label ? (
        <SidebarGroupLabel className="text-foreground-300/70">
          <span className="truncate">{group.label}</span>
        </SidebarGroupLabel>
      ) : null}
      <SidebarMenu className="**:data-[sidebar=menu-button]:gap-3">
        {group.matches.map(({ item, matchedKeywords }) => {
          const Icon = item.icon;
          return (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                asChild
                isActive={!query && isActive(item)}
                tooltip={item.label}
              >
                <Link to={item.to} end={item.end} onClick={onNavigate}>
                  {Icon ? <Icon /> : null}
                  <span>{highlightMatch(item.label, query)}</span>
                </Link>
              </SidebarMenuButton>

              {matchedKeywords.length > 0 ? (
                <div className="mb-1 ml-3 mt-0.5 flex flex-col gap-0.5">
                  {matchedKeywords.map((keyword) => (
                    <Link
                      key={keyword.label}
                      to={(() => {
                        const base = keyword.to ?? item.to;
                        return keyword.anchor
                          ? `${base}#${keyword.anchor}`
                          : base;
                      })()}
                      onClick={() => {
                        onNavigate();
                        scrollToAnchor(keyword.anchor);
                      }}
                      className={cn(
                        "text-foreground-300 hover:text-foreground-100 hover:bg-sidebar-accent",
                        "border-border-100 flex w-full items-center rounded-r-md border-l py-1 pl-2.5 pr-2 text-left text-xs transition-colors",
                      )}
                    >
                      <span className="truncate">
                        {highlightMatch(keyword.label, query)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </>
  );
}
