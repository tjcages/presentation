"use client";

/**
 * Responsive app shell: fixed desktop rail, mobile behind-navigation.
 *
 * Owns geometry, gestures, and mounting rules. The host supplies navigation
 * content, page content, and optional mobile dock / profile slots — branding,
 * routes, and data stay in the app.
 *
 * Desktop: the rail is `position: fixed` and out of document flow. The surface
 * pads by `--pr-shell-rail-width` once. Do not pass a competing `relative`
 * class onto the rail — Tailwind merge would pull it back into flow and double
 * the content offset.
 *
 * Mobile: the rail sits behind; the page surface translates/scales with a
 * sampled spring. Open-state radius and shadow are static. The optional
 * `mobileDock` mounts only when the viewport is mobile — never merely hidden
 * with `md:hidden`.
 */

import * as React from "react";

import { useIsMobile, usePrefersReducedMotion } from "./_media.js";
import {
  useMobileNavProgress,
  type MobileNavProgress,
} from "./_mobile-nav.js";

export interface ShellContextValue {
  isMobile: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /** Desktop rail expanded/collapsed. */
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  /** Left-edge open gesture is armed (mobile + closed + edgeOpen). */
  edgeOpen: boolean;
}

const ShellContext = React.createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const context = React.useContext(ShellContext);
  if (!context) {
    throw new Error("useShell must be used within <Shell>.");
  }
  return context;
}

/** Returns null outside `<Shell>` — for host chrome that adapts when nested. */
export function useOptionalShell(): ShellContextValue | null {
  return React.useContext(ShellContext);
}

export interface ShellProps {
  /**
   * Current path (or any route key). When it changes, behind-nav snaps closed
   * so only page Presentation animates.
   */
  path?: string;
  /** Navigation rail content — desktop fixed rail and mobile behind panel. */
  rail: React.ReactNode;
  /**
   * Mobile-only account/settings dock. Mounted only when the viewport is
   * mobile; omitted entirely on desktop.
   */
  mobileDock?: React.ReactNode;
  /**
   * Enable the left-edge open gesture when the nav is closed.
   * Hosts typically set this at URL-derived root depth and leave deeper pages
   * to Presentation's swipe-back.
   * @default true
   */
  edgeOpen?: boolean;
  /** Controlled behind-nav open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Uncontrolled initial open state. @default false */
  defaultOpen?: boolean;
  /** Controlled desktop expanded state. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Uncontrolled initial desktop expanded state. @default true */
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Shell({
  path,
  rail,
  mobileDock,
  edgeOpen = true,
  open: openProp,
  onOpenChange,
  defaultOpen = false,
  expanded: expandedProp,
  onExpandedChange,
  defaultExpanded = true,
  children,
  className,
  style,
}: ShellProps) {
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();

  const [openUncontrolled, setOpenUncontrolled] = React.useState(defaultOpen);
  const open = openProp ?? openUncontrolled;
  const setOpen = React.useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (openProp === undefined) setOpenUncontrolled(next);
    },
    [onOpenChange, openProp],
  );

  const [expandedUncontrolled, setExpandedUncontrolled] =
    React.useState(defaultExpanded);
  const expanded = expandedProp ?? expandedUncontrolled;
  const setExpanded = React.useCallback(
    (next: boolean) => {
      onExpandedChange?.(next);
      if (expandedProp === undefined) setExpandedUncontrolled(next);
    },
    [onExpandedChange, expandedProp],
  );

  const toggle = React.useCallback(() => {
    if (isMobile) setOpen(!open);
    else setExpanded(!expanded);
  }, [expanded, isMobile, open, setExpanded, setOpen]);

  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const progress = useMobileNavProgress({
    enabled: isMobile,
    open,
    setOpen,
    surfaceRef,
    interruptKey: path,
    reducedMotion,
  });

  const context = React.useMemo<ShellContextValue>(
    () => ({
      isMobile,
      open,
      setOpen,
      toggle,
      expanded,
      setExpanded,
      edgeOpen,
    }),
    [edgeOpen, expanded, isMobile, open, setExpanded, setOpen, toggle],
  );

  React.useEffect(() => {
    if (!isMobile || !open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMobile, open]);

  return (
    <ShellContext.Provider value={context}>
      <div
        data-slot="pr-shell"
        data-mobile={isMobile ? "true" : undefined}
        data-pr-shell-nav={isMobile ? (open ? "open" : "closed") : undefined}
        data-pr-shell-expanded={expanded ? "true" : "false"}
        className={cn("pr-shell", className)}
        style={style}
      >
        <ShellRailInternal isMobile={isMobile} open={open}>
          {rail}
          {isMobile && mobileDock ? mobileDock : null}
        </ShellRailInternal>

        <ShellSurfaceInternal
          surfaceRef={surfaceRef}
          isMobile={isMobile}
          open={open}
          setOpen={setOpen}
          edgeOpen={edgeOpen}
          progress={progress}
        >
          {children}
        </ShellSurfaceInternal>
      </div>
    </ShellContext.Provider>
  );
}

function ShellRailInternal({
  isMobile,
  open,
  children,
}: {
  isMobile: boolean;
  open: boolean;
  children: React.ReactNode;
}) {
  if (isMobile) {
    return (
      <aside
        data-slot="pr-shell-rail"
        id="pr-shell-rail"
        data-mobile="behind"
        data-state={open ? "open" : "closed"}
        className="pr-shell-rail pr-shell-rail--behind"
        aria-hidden={!open || undefined}
      >
        <div className="pr-shell-rail-inner" inert={!open || undefined}>
          {children}
        </div>
      </aside>
    );
  }

  return (
    <aside
      data-slot="pr-shell-rail"
      id="pr-shell-rail"
      data-mobile="false"
      className="pr-shell-rail pr-shell-rail--desktop"
    >
      <div className="pr-shell-rail-inner">{children}</div>
    </aside>
  );
}

function ShellSurfaceInternal({
  surfaceRef,
  isMobile,
  open,
  setOpen,
  edgeOpen,
  progress,
  children,
}: {
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  isMobile: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  edgeOpen: boolean;
  progress: MobileNavProgress;
  children: React.ReactNode;
}) {
  const showEdge =
    isMobile && !progress.cardActive && edgeOpen && !open;

  return (
    <>
      {showEdge ? (
        <div
          data-slot="pr-shell-edge"
          aria-hidden
          style={{ width: progress.edgeWidth }}
          {...progress.edgeHandlers}
        />
      ) : null}
      <div
        ref={surfaceRef}
        data-slot="pr-shell-surface"
        data-pr-shell-nav={
          isMobile ? (progress.cardActive ? "open" : "closed") : undefined
        }
        data-pr-shell-dragging={progress.dragging ? "true" : undefined}
        className="pr-shell-surface"
      >
        <div
          className={isMobile ? "pr-shell-surface-body" : undefined}
          style={isMobile ? undefined : { display: "contents" }}
          inert={isMobile && progress.cardActive ? true : undefined}
          aria-hidden={isMobile && progress.cardActive ? true : undefined}
        >
          {children}
        </div>
        {isMobile && progress.cardActive ? (
          <div
            role="button"
            tabIndex={0}
            data-slot="pr-shell-dismiss"
            aria-label="Close navigation"
            className="pr-shell-dismiss"
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setOpen(false);
              }
            }}
            {...progress.dismissHandlers}
          />
        ) : null}
      </div>
    </>
  );
}

/**
 * Close the mobile behind-nav when a destination is chosen. Hosts wire this
 * to nav link clicks so the real page push and the shell close happen together.
 */
export function useShellNavigate(
  navigate: (path: string) => void,
): (path: string) => void {
  const { isMobile, setOpen } = useShell();
  return React.useCallback(
    (path: string) => {
      if (isMobile) setOpen(false);
      navigate(path);
    },
    [isMobile, navigate, setOpen],
  );
}

export interface ShellMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label. @default "Open navigation" */
  label?: string;
}

/**
 * Mobile menu control. Hidden on desktop via CSS; opens behind-nav on press.
 * Totem-style hosts often prefer edge-swipe alone — this exists so demos and
 * hosts without custom chrome still have a discoverable open affordance.
 */
export function ShellMenuButton({
  label = "Open navigation",
  className,
  onClick,
  ...props
}: ShellMenuButtonProps) {
  const { isMobile, open, setOpen } = useShell();
  return (
    <button
      type="button"
      className={cn("pr-shell-menu", className)}
      aria-label={label}
      aria-expanded={isMobile ? open : undefined}
      aria-controls={isMobile ? "pr-shell-rail" : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        setOpen(true);
      }}
      {...props}
    >
      <ShellMenuIcon />
    </button>
  );
}

function ShellMenuIcon() {
  return (
    <svg
      className="pr-shell-menu-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
