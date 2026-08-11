"use client";

/**
 * Mobile behind-navigation progress.
 *
 * The page surface moves right to reveal the rail. Transform is written
 * directly — including on release, where a sampled spring becomes the CSS
 * timing function — so the compositor animates `transform` rather than a
 * registered progress custom property that forces style recalc every frame.
 *
 * Radius and shadow stay static while the card is active (`cardActive`); they
 * are not interpolated. Scale creates the visual inset while the surface stays
 * full-bleed.
 */

import * as React from "react";

import { SPRINGS, springEasing, type Spring } from "./_springs.js";

/** Leading-edge hit target for opening the nav, in px. */
export const MOBILE_NAV_EDGE_WIDTH = 32;
/** Progress past which a release opens (or stays open). */
export const MOBILE_NAV_COMMIT_RATIO = 0.5;
/** Release velocity (px/s) that forces open; negative forces close. */
export const MOBILE_NAV_COMMIT_VELOCITY = -650;
/** Movement below this is treated as a tap, not a drag. */
export const MOBILE_NAV_TAP_SLOP = 8;
/** Open-state scale — full-bleed surface, inset via scale. */
export const MOBILE_NAV_OPEN_SCALE = 0.96;

const DEFAULT_TRAVEL = 304;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Rubber-band past 0..1 so an over-drag still tracks the finger. */
function rubberband(progress: number): number {
  if (progress >= 0 && progress <= 1) return progress;
  if (progress < 0) return progress * 0.22;
  return 1 + (progress - 1) * 0.22;
}

export function measureMobileNavTravel(surface: HTMLElement | null): number {
  if (!surface) return DEFAULT_TRAVEL;
  const styles = getComputedStyle(surface);
  const widthToken = styles.getPropertyValue("--pr-shell-nav-width").trim();
  const gapToken = styles.getPropertyValue("--pr-shell-nav-gap").trim();
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;width:${widthToken || "19rem"}`;
  surface.appendChild(probe);
  const width = probe.getBoundingClientRect().width || DEFAULT_TRAVEL;
  probe.style.width = gapToken || "0.5rem";
  const gap = probe.getBoundingClientRect().width;
  probe.remove();
  return width + gap;
}

export function readMobileNavProgress(
  surface: HTMLElement | null,
  travel: number,
): number {
  if (!surface) return 0;
  const transform = getComputedStyle(surface).transform;
  if (transform && transform !== "none" && travel > 0) {
    try {
      return clamp01(new DOMMatrixReadOnly(transform).m41 / travel);
    } catch {
      // Fall through to the progress property.
    }
  }
  const raw = parseFloat(
    getComputedStyle(surface).getPropertyValue("--pr-shell-nav-progress"),
  );
  return Number.isFinite(raw) ? clamp01(raw) : 0;
}

/**
 * Write progress as a direct transform. Also mirrors the numeric progress onto
 * the surface and wrapper for host chrome that fades with open state — that
 * property is *not* what the release transitions.
 */
export function writeMobileNavProgress(
  surface: HTMLElement | null,
  progress: number,
  travel: number,
): void {
  if (!surface) return;
  const value = clamp01(progress);
  const token = String(value);
  const scale = 1 - (1 - MOBILE_NAV_OPEN_SCALE) * value;
  surface.style.setProperty("--pr-shell-nav-progress", token);
  surface.style.transform = `translate3d(${travel * value}px, 0, 0) scale(${scale})`;
  const shell = surface.closest('[data-slot="pr-shell"]') as HTMLElement | null;
  shell?.style.setProperty("--pr-shell-nav-progress", token);
}

export interface MobileNavProgressOptions {
  enabled: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  surfaceRef: React.RefObject<HTMLElement | null>;
  /**
   * When this value changes (typically the URL path), snap the nav closed so
   * only page Presentation animates.
   */
  interruptKey?: string;
  reducedMotion?: boolean;
}

export interface MobileNavProgress {
  dragging: boolean;
  /** True while the open-state card treatment (radius/shadow) should apply. */
  cardActive: boolean;
  dismissHandlers: {
    onPointerDown: (event: React.PointerEvent) => void;
    onPointerMove: (event: React.PointerEvent) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
  };
  edgeHandlers: {
    onPointerDown: (event: React.PointerEvent) => void;
    onPointerMove: (event: React.PointerEvent) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
  };
  edgeWidth: number;
}

export function useMobileNavProgress({
  enabled,
  open,
  setOpen,
  surfaceRef,
  interruptKey,
  reducedMotion = false,
}: MobileNavProgressOptions): MobileNavProgress {
  const draggingRef = React.useRef(false);
  const cleanupRelease = React.useRef<(() => void) | null>(null);
  const generation = React.useRef(0);
  const travelRef = React.useRef(DEFAULT_TRAVEL);
  const startProgress = React.useRef(0);
  const maxAbsDelta = React.useRef(0);
  const startX = React.useRef(0);
  const velocitySample = React.useRef({ x: 0, t: 0, v: 0 });
  const progressRef = React.useRef(0);
  const [dragging, setDragging] = React.useState(false);
  const [cardActive, setCardActive] = React.useState(false);
  const interruptRef = React.useRef(interruptKey);

  const cancelRelease = React.useCallback(() => {
    generation.current += 1;
    cleanupRelease.current?.();
    cleanupRelease.current = null;
    const surface = surfaceRef.current;
    surface?.removeAttribute("data-pr-shell-releasing");
    surface?.style.removeProperty("--pr-shell-release-duration");
    surface?.style.removeProperty("--pr-shell-release-ease");
  }, [surfaceRef]);

  const resetClosed = React.useCallback(() => {
    cancelRelease();
    progressRef.current = 0;
    writeMobileNavProgress(surfaceRef.current, 0, travelRef.current);
    surfaceRef.current?.style.removeProperty("transform");
    surfaceRef.current?.removeAttribute("data-pr-shell-dragging");
    setCardActive(false);
    setDragging(false);
    draggingRef.current = false;
  }, [cancelRelease, surfaceRef]);

  const releaseTo = React.useCallback(
    (from: number, to: number, spring: Spring, done: () => void) => {
      const surface = surfaceRef.current;
      if (!surface) {
        done();
        return;
      }
      cancelRelease();
      const gen = generation.current;
      travelRef.current = measureMobileNavTravel(surface);

      if (reducedMotion) {
        writeMobileNavProgress(surface, to, travelRef.current);
        progressRef.current = to;
        done();
        return;
      }

      const { easing, duration } = springEasing(spring);
      setCardActive(true);
      writeMobileNavProgress(surface, from, travelRef.current);
      surface.style.setProperty("--pr-shell-release-duration", `${duration}ms`);
      surface.style.setProperty("--pr-shell-release-ease", easing);
      surface.setAttribute("data-pr-shell-releasing", "");
      void surface.offsetWidth;
      writeMobileNavProgress(surface, to, travelRef.current);
      progressRef.current = to;

      let finished = false;
      const finish = () => {
        if (finished || gen !== generation.current) return;
        finished = true;
        cleanupRelease.current?.();
        cleanupRelease.current = null;
        surface.removeAttribute("data-pr-shell-releasing");
        surface.style.removeProperty("--pr-shell-release-duration");
        surface.style.removeProperty("--pr-shell-release-ease");
        writeMobileNavProgress(surface, to, travelRef.current);
        progressRef.current = to;
        done();
      };
      const onEnd = (event: TransitionEvent) => {
        if (event.propertyName === "transform") finish();
      };
      surface.addEventListener("transitionend", onEnd);
      const timer = window.setTimeout(finish, duration + 80);
      cleanupRelease.current = () => {
        surface.removeEventListener("transitionend", onEnd);
        window.clearTimeout(timer);
      };
    },
    [cancelRelease, reducedMotion, surfaceRef],
  );

  React.useEffect(() => {
    if (interruptKey === undefined) return;
    if (interruptRef.current === interruptKey) return;
    interruptRef.current = interruptKey;
    if (!enabled) return;
    if (!open && progressRef.current < 0.001 && !cardActive) return;
    resetClosed();
    if (open) setOpen(false);
  }, [cardActive, enabled, interruptKey, open, resetClosed, setOpen]);

  React.useEffect(() => {
    if (!enabled) {
      resetClosed();
      return;
    }
    if (draggingRef.current) return;

    if (open) {
      travelRef.current = measureMobileNavTravel(surfaceRef.current);
      const from = readMobileNavProgress(surfaceRef.current, travelRef.current);
      progressRef.current = from;
      releaseTo(from, 1, from > 0.02 ? SPRINGS.commit : SPRINGS.push, () => {
        setCardActive(true);
        progressRef.current = 1;
      });
      return;
    }

    if (
      progressRef.current < 0.001 &&
      readMobileNavProgress(surfaceRef.current, travelRef.current) < 0.001
    ) {
      resetClosed();
      return;
    }

    travelRef.current = measureMobileNavTravel(surfaceRef.current);
    const from = readMobileNavProgress(surfaceRef.current, travelRef.current);
    releaseTo(from, 0, from < 0.98 ? SPRINGS.commit : SPRINGS.push, () =>
      resetClosed(),
    );
  }, [enabled, open, releaseTo, resetClosed, surfaceRef]);

  React.useEffect(() => {
    if (!enabled) {
      writeMobileNavProgress(surfaceRef.current, 0, travelRef.current);
      return;
    }
    writeMobileNavProgress(surfaceRef.current, progressRef.current, travelRef.current);
  }, [enabled, surfaceRef]);

  const beginDrag = React.useCallback(
    (progress: number, clientX: number) => {
      cancelRelease();
      travelRef.current = measureMobileNavTravel(surfaceRef.current);
      draggingRef.current = true;
      startProgress.current = progress;
      maxAbsDelta.current = 0;
      startX.current = clientX;
      velocitySample.current = { x: clientX, t: performance.now(), v: 0 };
      progressRef.current = progress;
      writeMobileNavProgress(surfaceRef.current, progress, travelRef.current);
      setDragging(true);
      setCardActive(true);
    },
    [cancelRelease, surfaceRef],
  );

  const moveDrag = React.useCallback(
    (clientX: number) => {
      if (!draggingRef.current) return;
      const delta = clientX - startX.current;
      maxAbsDelta.current = Math.max(maxAbsDelta.current, Math.abs(delta));
      const now = performance.now();
      const dt = now - velocitySample.current.t;
      if (dt > 0) {
        velocitySample.current.v =
          ((clientX - velocitySample.current.x) / dt) * 1000;
        velocitySample.current.x = clientX;
        velocitySample.current.t = now;
      }
      const next = rubberband(
        startProgress.current + delta / travelRef.current,
      );
      progressRef.current = next;
      writeMobileNavProgress(surfaceRef.current, next, travelRef.current);
    },
    [surfaceRef],
  );

  const endDrag = React.useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const progress = clamp01(progressRef.current);
    progressRef.current = progress;
    writeMobileNavProgress(surfaceRef.current, progress, travelRef.current);
    const velocity = velocitySample.current.v;
    const shouldOpen =
      velocity > Math.abs(MOBILE_NAV_COMMIT_VELOCITY)
        ? true
        : velocity < MOBILE_NAV_COMMIT_VELOCITY
          ? false
          : progress >= MOBILE_NAV_COMMIT_RATIO;
    if (shouldOpen !== open) {
      setOpen(shouldOpen);
      return;
    }
    releaseTo(progress, shouldOpen ? 1 : 0, SPRINGS.settle, () => {
      if (shouldOpen) {
        setCardActive(true);
        progressRef.current = 1;
      } else {
        resetClosed();
      }
    });
  }, [open, releaseTo, resetClosed, setOpen, surfaceRef]);

  return {
    dragging,
    cardActive,
    dismissHandlers: React.useMemo(
      () => ({
        onPointerDown: (event: React.PointerEvent) => {
          if (!enabled || !open) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          travelRef.current = measureMobileNavTravel(surfaceRef.current);
          beginDrag(
            readMobileNavProgress(surfaceRef.current, travelRef.current),
            event.clientX,
          );
        },
        onPointerMove: (event: React.PointerEvent) => {
          if (draggingRef.current) moveDrag(event.clientX);
        },
        onPointerUp: () => {
          if (!draggingRef.current) return;
          if (maxAbsDelta.current < MOBILE_NAV_TAP_SLOP) {
            draggingRef.current = false;
            setDragging(false);
            setOpen(false);
            return;
          }
          endDrag();
        },
        onPointerCancel: () => endDrag(),
      }),
      [beginDrag, enabled, endDrag, moveDrag, open, setOpen, surfaceRef],
    ),
    edgeHandlers: React.useMemo(
      () => ({
        onPointerDown: (event: React.PointerEvent) => {
          if (!enabled || open) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          beginDrag(0, event.clientX);
        },
        onPointerMove: (event: React.PointerEvent) => {
          if (draggingRef.current) moveDrag(event.clientX);
        },
        onPointerUp: () => {
          if (!draggingRef.current) return;
          if (maxAbsDelta.current < MOBILE_NAV_TAP_SLOP) {
            draggingRef.current = false;
            setDragging(false);
            resetClosed();
            return;
          }
          endDrag();
        },
        onPointerCancel: () => endDrag(),
      }),
      [beginDrag, enabled, endDrag, moveDrag, open, resetClosed],
    ),
    edgeWidth: MOBILE_NAV_EDGE_WIDTH,
  };
}
