"use client";

import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "../lib/cn";
import { useIsMobile } from "../lib/use-is-mobile";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
const SIDEBAR_DEFAULT_WIDTH = 256;
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 480;

interface SidebarContextProps {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
  side: "left" | "right";
  resizable: boolean;
  width: number;
  setWidth: (width: number) => void;
  minWidth: number;
  maxWidth: number;
  isResizing: boolean;
  setIsResizing: (resizing: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

export const useSidebar = (): SidebarContextProps => {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
};

export const SidebarProvider = ({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  side = "left",
  resizable = false,
  defaultWidth = SIDEBAR_DEFAULT_WIDTH,
  minWidth = SIDEBAR_MIN_WIDTH,
  maxWidth = SIDEBAR_MAX_WIDTH,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: "left" | "right";
  resizable?: boolean;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}) => {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const [width, _setWidth] = React.useState(defaultWidth);
  const setWidth = React.useCallback(
    (value: number) => {
      _setWidth(Math.min(maxWidth, Math.max(minWidth, value)));
    },
    [minWidth, maxWidth],
  );

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }

      // This sets the cookie to keep the sidebar state.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open],
  );

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen, setOpenMobile]);

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
      side,
      resizable,
      width,
      setWidth,
      minWidth,
      maxWidth,
      isResizing,
      setIsResizing,
    }),
    [
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
      side,
      resizable,
      width,
      setWidth,
      minWidth,
      maxWidth,
      isResizing,
    ],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          data-resizing={isResizing ? "" : undefined}
          // Mirror the sidebar's own state onto the wrapper so descendants
          // (page chrome that needs to offset itself for the full-bleed
          // sidebar) can use group-data-[state=...]/sidebar-wrapper without
          // depending on peer-data — peers only work for direct siblings.
          data-state={state}
          data-mobile={isMobile ? "true" : undefined}
          style={
            {
              "--sidebar-width": resizable ? `${width}px` : SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              // The sidebar's effective visible width — what page chrome
              // should pad by to clear it. Sidebar collapses to icon-width
              // on desktop; on mobile the sidebar is a sheet so chrome
              // doesn't need to offset at all.
              "--sidebar-rail-width": isMobile
                ? "0px"
                : state === "collapsed"
                  ? SIDEBAR_WIDTH_ICON
                  : resizable
                    ? `${width}px`
                    : SIDEBAR_WIDTH,
              ...style,
            } as React.CSSProperties
          }
          className={cn(
            // Default: document/window scroll. `min-h-svh` (not dvh) so iOS
            // Safari chrome show/hide does not resize the shell. Self-scroll
            // pages pass `h-svh max-h-svh overflow-hidden` via className.
            "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
            isResizing && "select-none",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
}) => {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "bg-sidebar text-sidebar-foreground w-(--sidebar-width) flex h-full flex-col",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="text-sidebar-foreground group peer hidden md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* macOS-style full-bleed sidebar: the gap collapses to 0 so the inset
       *  next to us takes the full viewport width and content scrolls behind
       *  the sidebar's frosted glass. The inset re-pads itself by the sidebar
       *  width so visible content stays where it was. */}
      <div data-slot="sidebar-gap" className="w-0" />
      <div
        data-slot="sidebar-container"
        className={cn(
          "w-(--sidebar-width) fixed inset-y-0 z-10 hidden h-svh transition-[left,right,width] duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] md:flex",
          "group-data-[resizing]/sidebar-wrapper:transition-none",
          side === "left"
            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
          // Adjust the padding for floating and inset variants.
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
          // The frosted glass lives on the FIXED container, not the inner.
          // The inner shares its parent's compositing layer; Chromium needs
          // the backdrop-filter to be on the fixed/transformed layer itself
          // to actually composite the blur — putting it on the static inner
          // silently no-ops.
          "sidebar-frosted",
          className,
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export const SidebarResizeHandle = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const {
    side,
    resizable,
    open,
    setOpen,
    width,
    setWidth,
    minWidth,
    setIsResizing,
  } = useSidebar();
  const startX = React.useRef(0);
  const startWidth = React.useRef(0);
  const collapsing = React.useRef(false);

  if (!resizable) return null;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsResizing(true);
    startX.current = event.clientX;
    startWidth.current = width;
    collapsing.current = !open;

    const onPointerMove = (e: PointerEvent) => {
      const delta =
        side === "left"
          ? e.clientX - startX.current
          : startX.current - e.clientX;
      const next = startWidth.current + delta;
      // While collapsed, only re-expand once dragged back past the min width.
      if (collapsing.current) {
        if (next >= minWidth) {
          collapsing.current = false;
          setOpen(true);
          setWidth(next);
        }
        return;
      }
      // Dragging below the min collapses the sidebar to its icon rail.
      if (next < minWidth) {
        setOpen(false);
        collapsing.current = true;
        return;
      }
      setWidth(next);
    };

    const onPointerUp = () => {
      setIsResizing(false);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div
      data-sidebar="resize-handle"
      data-slot="sidebar-resize-handle"
      aria-label="Resize sidebar"
      onPointerDown={onPointerDown}
      className={cn(
        "absolute inset-y-0 z-20 hidden w-px cursor-col-resize bg-transparent transition-[transform,background-color,opacity] duration-300 ease-out sm:block",
        "origin-center will-change-transform after:absolute after:inset-y-0 after:-left-1 after:-right-2",
        // Invisible at rest; the wider `::after` overlay still catches the
        // pointer so the bar fades in once the user hovers near the edge.
        "hover:bg-border-100 active:bg-sidebar-accent opacity-0 hover:scale-x-[5] hover:opacity-100 active:scale-x-[2.25]",
        "motion-reduce:transition-none motion-reduce:hover:scale-x-100 motion-reduce:active:scale-x-100",
        side === "left" ? "right-0" : "left-0",
        className,
      )}
      {...props}
    />
  );
};

export const SidebarInset = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="sidebar-inset"
      className={cn(
        // The sidebar overlays the inset (gap is 0), so re-pad by the sidebar
        // width to keep visible content positioned. The `bg-canvas` paints
        // edge-to-edge — anything that escapes this padding will pass BEHIND
        // the sidebar and read as a soft blurred smear through its frosted
        // glass.
        "bg-canvas relative flex min-h-0 w-full flex-1 flex-col",
        "md:pl-(--sidebar-width) md:peer-data-[state=collapsed]:pl-(--sidebar-width-icon) md:peer-data-[collapsible=offcanvas]:pl-0",
        "transition-[padding] duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[resizing]/sidebar-wrapper:transition-none",
        "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
};

export const SidebarHeader = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
};

export const SidebarFooter = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
};

export const SidebarContent = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className,
      )}
      {...props}
    />
  );
};

export const SidebarGroup = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  );
};

export const SidebarGroupLabel = ({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) => {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        "text-sidebar-foreground/70 ring-sidebar-ring outline-hidden flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium transition-[height,margin,opacity,background-color] duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        /*
         * Collapsed, a heading becomes a rule. It has to be the *divider*
         * colour — inheriting the label's own muted text colour gives a line
         * that is lighter in one state than the other, which is what reads as
         * the colour being off. `border-100` is the token every other divider
         * in the app uses.
         */
        "group-data-[collapsible=icon]:h-px group-data-[collapsible=icon]:my-2",
        "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-6",
        "group-data-[collapsible=icon]:bg-border-100 group-data-[collapsible=icon]:px-0",
        "group-data-[collapsible=icon]:[&>span]:opacity-0",
        "[&>span]:transition-opacity [&>span]:duration-150",
        className,
      )}
      {...props}
    />
  );
};

export const SidebarGroupContent = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  );
};

export const SidebarMenu = ({
  className,
  ...props
}: React.ComponentProps<"ul">) => {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  );
};

export const SidebarMenuItem = ({
  className,
  ...props
}: React.ComponentProps<"li">) => {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  );
};

// Item styling follows the Kumo (Cloudflare dashboard) sidebar vocabulary:
// quiet rows, tint hover, and the ACTIVE row marked by accent text/icon on a
// transparent background instead of a filled pill.
const sidebarMenuButtonVariants = cva(
  cn(
    "peer/menu-button group/menu-button ring-sidebar-ring outline-hidden flex w-full min-w-0 cursor-pointer items-center gap-2 overflow-hidden rounded-lg text-left font-medium",
    "transition-[color,background-color,padding] duration-300 ease-out motion-reduce:transition-none",
    "[&>svg]:text-foreground-300 [&>svg]:size-4 [&>svg]:shrink-0",
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    "active:bg-sidebar-accent active:text-sidebar-accent-foreground",
    "data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground",
    "data-[active=true]:text-accent-100 data-[active=true]:hover:bg-sidebar-accent data-[active=true]:[&>svg]:text-accent-100 data-[active=true]:bg-transparent",
    "group-has-data-[sidebar=menu-action]/menu-item:pr-8",
    /*
     * The icon column never moves.
     *
     * The leading padding is the same in both states, so an icon sits at the
     * same x whether the rail is 3rem or 16rem — collapsing only takes width
     * away on the trailing side. The previous rule drifted the padding from
     * 12px to 8px along with the width, which reads as every icon sliding
     * left by 10px while the panel closes.
     *
     * The label is clipped by the row's own `overflow-hidden` as the rail
     * narrows, and fades while it goes. `display: none` cannot be
     * transitioned, so hiding it outright made the text disappear a frame
     * before the panel had finished closing.
     */
    "group-data-[collapsible=icon]:pr-2!",
    /*
     * Opening, the label waits for the panel to be most of the way out before
     * it fades in; closing, it leaves first. Matching the two durations makes
     * the text fade *while* the rail is clipping it, which looks like a
     * rendering fault rather than a transition.
     */
    "[&>span:last-child]:transition-opacity [&>span:last-child]:duration-150 [&>span:last-child]:delay-100",
    "group-data-[collapsible=icon]:[&>span:last-child]:opacity-0",
    "group-data-[collapsible=icon]:[&>span:last-child]:duration-100",
    "group-data-[collapsible=icon]:[&>span:last-child]:delay-0",
    "focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&>span:last-child]:truncate",
  ),
  {
    variants: {
      variant: {
        default: "",
        outline:
          "bg-background-100 shadow-[0_0_0_1px_var(--color-sidebar-border)] hover:shadow-[0_0_0_1px_var(--color-sidebar-accent)]",
      },
      size: {
        // `pl-2` matches the container's own padding so icon-left is
        // 8 + 8 = 16px, dead centre of the 3rem collapsed rail.
        default: "min-h-[34px] pl-2 pr-3 py-1.5 text-sm",
        sm: "min-h-[28px] px-2 py-1 text-xs",
        lg: "group-data-[collapsible=icon]:p-0! h-12 px-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export const SidebarMenuButton = ({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string | React.ComponentProps<typeof TooltipContent>;
} & VariantProps<typeof sidebarMenuButtonVariants>) => {
  const Comp = asChild ? Slot : "button";
  const { isMobile, state } = useSidebar();

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  );

  if (!tooltip) {
    return button;
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    };
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
        {...tooltip}
      />
    </Tooltip>
  );
};

export const SidebarMenuBadge = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        "text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
};
