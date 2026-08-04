/**
 * @tjcages/presentation
 *
 * URL-derived push navigation: an iOS-style page push on a phone, synced rails
 * on a desktop, a drawer for a single view — chosen per breakpoint, in CSS.
 *
 * Router-free by design. The host supplies the current path, a way to
 * navigate, and a resolver saying where a path sits in the stack; nothing here
 * imports a router, and nothing here keeps a stack in memory that could fall
 * out of step with the URL.
 *
 * ```tsx
 * import { Presentation, createResolver } from "@tjcages/presentation";
 * import "@tjcages/presentation/presentation.css";
 *
 * const resolve = createResolver({
 *   root: "/settings",
 *   title: "Settings",
 *   routes: [{ path: "/settings/access", title: "Access" }],
 * });
 *
 * <Presentation
 *   path={pathname}
 *   navigate={router.push}
 *   resolve={resolve}
 *   present={{ base: "push", md: "rails" }}
 *   Link={Link}
 * >
 *   {children}
 * </Presentation>
 * ```
 */

export { Presentation, type PresentationProps } from "./_presentation";

export {
  PresentationTitle as Title,
  PresentationActions as Actions,
  usePresentation,
  NavBar,
  type NavBarProps,
  type PresentationContextValue,
} from "./_chrome";

export {
  createResolver,
  resolvePresentation,
  humanize,
  BREAKPOINTS,
  type Breakpoint,
  type PresentSpec,
  type PresentationStyle,
  type Resolver,
  type ResolverOptions,
  type RouteDescriptor,
  type StackEntry,
  type StackLevel,
} from "./_resolve";

export { SPRINGS, springEasing, FADE_MS, FADE_EASE, type Spring, type SpringEasing } from "./_springs";

// Exported so a host can build a gesture on a surface this package does not
// own — a drawer's grabber, a custom panel — with the same direction lock and
// the same refusal to declare `touch-action`.
export {
  createBackGesture,
  attachBackGesture,
  type BackGesture,
  type BackGestureConfig,
  type BackGestureIntent,
} from "./_gesture";
