/**
 * Where a path sits in the stack.
 *
 * Depth is derived from the URL and nothing else. That single decision is
 * what makes hardware back, the browser's own edge-swipe, and deep links all
 * work without this package knowing they happened — there is no in-memory
 * stack to fall out of sync, because there is no in-memory stack. A link
 * straight to depth 2 opens at depth 2, with a back affordance that goes *up*
 * a level rather than out of the section.
 *
 * Everything here is pure: no JSX, no hooks, no DOM. A host's route tests can
 * import it directly and assert on the shape of its navigation.
 */

/** How a level presents itself. */
export type PresentationStyle =
  /** Full-page horizontal push. The iOS navigation stack. */
  | "push"
  /** Two synced rails — a list and a detail — sliding together. */
  | "rails"
  /** Slides up from the bottom edge, host-rendered. */
  | "drawer"
  /** Crossfade in place. */
  | "fade"
  /** Swap with no transition at all. */
  | "none";

/**
 * A style, or a style per breakpoint.
 *
 * Breakpoints resolve in CSS rather than JavaScript, so `{ base: "push", md:
 * "rails" }` costs no media-query hook, no server-versus-client snapshot
 * guess, and no reflow after hydration. The tree is identical at every width;
 * only which keyframes apply changes.
 */
export type PresentSpec =
  | PresentationStyle
  /** Pick from the level's own shape — see [[resolvePresentation]]. */
  | "auto"
  | {
      base?: PresentationStyle | "auto";
      sm?: PresentationStyle | "auto";
      md?: PresentationStyle | "auto";
      lg?: PresentationStyle | "auto";
    };

export const BREAKPOINTS = { base: 0, sm: 640, md: 768, lg: 1024 } as const;
export type Breakpoint = keyof typeof BREAKPOINTS;

export interface StackLevel {
  path: string;
  title: string;
}

export interface StackEntry extends StackLevel {
  /** 0 is the root of the stack, not of the site. */
  depth: number;
  /** The level this one was pushed from. Absent at the root. */
  parent?: StackLevel;
  /**
   * Nothing is nested below this path.
   *
   * A leaf is a single view with nowhere further to go, which is the shape a
   * drawer suits; a level that is itself a container of other levels wants a
   * push, so the back affordance keeps meaning "up one". [[createResolver]]
   * derives this when it is given the route list; left undefined it simply
   * does not participate and `auto` falls back to pushing.
   */
  leaf?: boolean;
  /** Overrides the stack's own `present` for this level only. */
  present?: PresentSpec;
}

export type Resolver = (pathname: string) => StackEntry | null;

export interface RouteDescriptor {
  path: string;
  title?: string;
}

export interface ResolverOptions {
  /** The stack's root path, e.g. `/settings`. Depth 0. */
  root: string;
  /** Title for the root level. @default humanized last segment of `root` */
  title?: string;
  /**
   * Every path the stack can reach. Supplies titles and — more usefully —
   * lets `leaf` be derived, so `present: "auto"` can tell a container apart
   * from a single view without the host restating it per route.
   */
  routes?: RouteDescriptor[];
  /** Last word on a title, consulted before `routes` and the fallback. */
  titleFor?: (path: string) => string | undefined;
  /** Per-path presentation override, consulted before the stack's own. */
  presentFor?: (path: string) => PresentSpec | undefined;
}

/** `access-log` → `Access log`. The fallback for a path no registry claims. */
export function humanize(segment: string): string {
  const spaced = segment.replace(/[-_]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Drop a trailing slash, but never turn `/` into an empty string. */
function normalize(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] ?? pathname;
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export function createResolver(options: ResolverOptions): Resolver {
  const root = normalize(options.root);
  const rootTitle =
    options.title ?? humanize(root.slice(root.lastIndexOf("/") + 1));
  const routes = options.routes ?? [];
  const known = new Map(routes.map((r) => [normalize(r.path), r] as const));

  const titleOf = (path: string): string => {
    const explicit = options.titleFor?.(path);
    if (explicit) return explicit;
    if (path === root) return rootTitle;
    const route = known.get(path);
    if (route?.title) return route.title;
    return humanize(path.slice(path.lastIndexOf("/") + 1));
  };

  // Only meaningful when the host handed over a route list. Without one there
  // is no way to tell a leaf from a container, and guessing would be worse
  // than declining to answer.
  const leafOf = (path: string): boolean | undefined => {
    if (routes.length === 0) return undefined;
    const prefix = `${path}/`;
    for (const candidate of known.keys()) {
      if (candidate.startsWith(prefix)) return false;
    }
    return true;
  };

  return (pathname) => {
    const path = normalize(pathname);
    if (path !== root && !path.startsWith(`${root}/`)) return null;

    const segments = path.slice(root.length).split("/").filter(Boolean);
    const present = options.presentFor?.(path);

    if (segments.length === 0) {
      return { depth: 0, path: root, title: rootTitle, leaf: leafOf(root), present };
    }

    const parentPath =
      segments.length === 1 ? root : `${root}/${segments.slice(0, -1).join("/")}`;

    return {
      depth: segments.length,
      path,
      title: titleOf(path),
      parent: { path: parentPath, title: titleOf(parentPath) },
      leaf: leafOf(path),
      present,
    };
  };
}

/**
 * Collapse a [[PresentSpec]] into one concrete style per breakpoint.
 *
 * Wider breakpoints inherit from narrower ones, so `{ base: "push", md:
 * "rails" }` means push below `md` and rails at and above it — the same
 * cascade a utility-CSS user already expects, and the reason this can be
 * expressed as media queries instead of a resize listener.
 */
export function resolvePresentation(
  spec: PresentSpec | undefined,
  entry: StackEntry | null,
): Record<Breakpoint, PresentationStyle> {
  // A level's own `present` outranks the stack's, which is how one route
  // becomes a drawer without the other routes hearing about it.
  const source = entry?.present ?? spec ?? "auto";
  const byBreakpoint =
    typeof source === "string" ? { base: source } : source;

  const auto = autoStyle(entry);
  const order: Breakpoint[] = ["base", "sm", "md", "lg"];
  const out = {} as Record<Breakpoint, PresentationStyle>;

  let inherited: PresentationStyle = "push";
  for (const bp of order) {
    const declared = byBreakpoint[bp];
    if (declared) inherited = declared === "auto" ? auto : declared;
    out[bp] = inherited;
  }
  return out;
}

/**
 * What `auto` means: push.
 *
 * It used to promote a leaf to a drawer, on the theory that a single view with
 * nowhere further to go is drawer-shaped. In practice that makes two rows of
 * the same list open two different ways, which reads as a bug rather than as
 * an affordance — and the drawer here is not finished enough to earn it (no
 * dismiss gesture, no scrim, no detents).
 *
 * `leaf` is still resolved and still exported, so a host that wants that
 * behaviour can ask for it explicitly per route via `presentFor`. Choosing it
 * silently is what has to stop.
 */
function autoStyle(entry: StackEntry | null): PresentationStyle {
  void entry;
  return "push";
}
