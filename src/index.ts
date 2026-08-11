/**
 * @tjcages/presentation
 *
 * URL-derived push navigation and a responsive app shell: iOS-style page push
 * on a phone, synced rails on a desktop, fixed rail / behind-nav geometry —
 * chosen per breakpoint. Router-free, zero runtime dependencies.
 *
 * ```tsx
 * import { Presentation, Shell, createResolver } from "@tjcages/presentation";
 * import "@tjcages/presentation/presentation.css";
 *
 * const resolve = createResolver({
 *   root: "/settings",
 *   title: "Settings",
 *   routes: [{ path: "/settings/access", title: "Access" }],
 * });
 *
 * <Shell path={pathname} rail={<Nav />} mobileDock={<Dock />} edgeOpen={depth === 0}>
 *   <Presentation path={pathname} navigate={router.push} resolve={resolve}>
 *     {children}
 *   </Presentation>
 * </Shell>
 * ```
 */

export {
  Presentation,
  type PresentationProps,
  type PresentationSoundCue,
  type PresentationSoundMovement,
} from "./_presentation.js";

export {
  PresentationTitle as Title,
  PresentationActions as Actions,
  usePresentation,
  PresentationScope,
  AtRootLevel,
  NavBar,
  type NavBarProps,
  type PresentationContextValue,
} from "./_chrome.js";

export {
  Shell,
  useShell,
  useOptionalShell,
  useShellNavigate,
  type ShellProps,
  type ShellContextValue,
} from "./_shell.js";

export {
  useIsMobile,
  usePrefersReducedMotion,
  SHELL_MOBILE_MAX,
} from "./_media.js";

export {
  useMobileNavProgress,
  writeMobileNavProgress,
  readMobileNavProgress,
  measureMobileNavTravel,
  MOBILE_NAV_EDGE_WIDTH,
  MOBILE_NAV_COMMIT_RATIO,
  MOBILE_NAV_OPEN_SCALE,
  type MobileNavProgress,
  type MobileNavProgressOptions,
} from "./_mobile-nav.js";

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
} from "./_resolve.js";

export {
  SPRINGS,
  springEasing,
  FADE_MS,
  FADE_EASE,
  type Spring,
  type SpringEasing,
} from "./_springs.js";

// Exported so a host can build a gesture on a surface this package does not
// own — a drawer's grabber, a custom panel — with the same direction lock and
// the same refusal to declare `touch-action`.
export {
  createBackGesture,
  attachBackGesture,
  type BackGesture,
  type BackGestureConfig,
  type BackGestureIntent,
} from "./_gesture.js";
