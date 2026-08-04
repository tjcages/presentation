import type { FavoriteRef } from "./nav-preferences";

/** A single navigation destination rendered as a sidebar menu button. */
export interface NavItem {
  title: string;
  /** Absolute route path, e.g. "/pricing". Must map to a registered route. */
  to: string;
  icon?: React.ComponentType<{ className?: string }>;
  /**
   * Pre-rendered leading element for items whose icon is data (a partner
   * logo, an avatar) rather than a glyph. Wins over `icon`.
   */
  iconNode?: React.ReactNode;
  /** Match the path exactly instead of by prefix (use for "/"). */
  end?: boolean;
  /**
   * Extra path prefixes that also mark this item active (e.g. Albums staying
   * lit on /product/...). Matched as exact or `${prefix}/...`.
   */
  activePrefixes?: string[];
  /**
   * Trailing count badge. Hidden when 0/undefined — a "0" badge reads as
   * broken.
   */
  badge?: number;
  /**
   * Explicit active state, for items whose identity lives in the query string
   * where pathname matching can't tell siblings apart. When set it overrides
   * the path-based check entirely.
   */
  active?: boolean;
  /** "outline" renders the row as a bordered button (primary actions like New Album). */
  variant?: "default" | "outline";
  favorite?: FavoriteRef;
  sortableId?: string;
  /**
   * Opaque permission tag. The kit never reads it — the host filters the
   * config before handing it over, because only the host knows what its
   * capability strings mean. It lives on the item so the destination and the
   * permission it requires stay in one place instead of in a parallel map
   * that silently rots when a route moves.
   */
  capability?: string;
}

/** A labeled cluster of nav items. Omit `label` for the primary, unlabeled group. */
export interface NavGroup {
  label?: string;
  items: NavItem[];
  /**
   * Render the group label as a chevron toggle and start the items condensed.
   * The group auto-expands when one of its items is the active route.
   */
  collapsible?: boolean;
  /** Initial expanded state. Users can still toggle the group afterward. */
  defaultOpen?: boolean;
  /** Keep entity groups closed when their active item was opened elsewhere. */
  autoExpandActive?: boolean;
}

/**
 * The single source of truth for the app's sidebar navigation. Adding a page
 * is one entry here — the sidebar and the nav↔routes contract test both read
 * from this.
 */
export interface NavConfig {
  groups: NavGroup[];
  /** Items pinned to the sidebar footer (e.g. Settings). */
  footer?: NavItem[];
}
