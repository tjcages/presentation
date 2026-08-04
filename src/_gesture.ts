/**
 * The back gesture.
 *
 * ## Why this does not use `touch-action`
 *
 * The obvious way to build a horizontal drag is `touch-action: pan-y` on the
 * dragged element, telling the browser "vertical scrolling is yours, the
 * horizontal axis is mine". It works — and it silently breaks every
 * horizontally scrollable descendant, because `touch-action` is resolved as
 * the *intersection* of the values down the ancestor chain. A wide table, a
 * carousel, or a capability matrix nested anywhere inside the panel stops
 * panning sideways, and nothing about the CSS says why.
 *
 * That is survivable when the panel is a full-screen portal overlay with
 * nothing complicated inside it. It is not survivable for a stack mounted
 * inline on a real page.
 *
 * So this declares nothing to the browser. It hit-tests the touch against the
 * screen edge, runs its own direction lock, and only calls `preventDefault()`
 * once it is certain the gesture is horizontal and started at the edge. Every
 * touch that is not that — which is nearly all of them — is never intercepted,
 * so nested scrollers behave exactly as if this file did not exist.
 *
 * ## Shape
 *
 * The decision logic is a plain state machine over `(x, y, time)` with no DOM
 * in it, so the direction lock, the slop threshold, and the velocity maths are
 * testable directly. [[attachBackGesture]] is the thin wiring that feeds it
 * real touch events.
 */

export interface BackGestureConfig {
  /** How far from the leading edge a touch must start, in px. @default 35 */
  edgeWidth?: number;
  /** Movement before the machine commits to an axis, in px. @default 8 */
  slop?: number;
  /** Fraction of the width past which a release pops. @default 0.35 */
  commitRatio?: number;
  /** Release velocity that pops regardless of distance, in px/s. @default 600 */
  commitVelocity?: number;
  /** Width of the surface being dragged, in px. Read lazily — it changes on rotate. */
  width: () => number;
}

/** What the caller should do about the event it just fed in. */
export type BackGestureIntent =
  | { type: "idle" }
  /** Horizontal drag confirmed. Consume the event and follow the finger. */
  | { type: "drag"; offset: number; progress: number }
  /** Released past the threshold — finish the pop. */
  | { type: "commit"; offset: number; progress: number; velocity: number }
  /** Released short, or the finger went vertical — return to rest. */
  | { type: "cancel"; offset: number; progress: number };

type Phase =
  /** No gesture, or one that has been disqualified. */
  | "idle"
  /** Started at the edge, axis not yet decided. */
  | "pending"
  /** Locked horizontal. Owns the touch from here. */
  | "dragging";

const IDLE: BackGestureIntent = { type: "idle" };

/** Velocity window, in ms. Long enough to smooth jitter, short enough to feel like a flick. */
const VELOCITY_WINDOW_MS = 80;

interface Sample {
  dx: number;
  t: number;
}

export interface BackGesture {
  down(x: number, y: number, t: number): BackGestureIntent;
  move(x: number, y: number, t: number): BackGestureIntent;
  up(t: number): BackGestureIntent;
  /** Drop any in-flight gesture (touchcancel, unmount, a pop from elsewhere). */
  reset(): void;
  readonly phase: Phase;
}

export function createBackGesture(config: BackGestureConfig): BackGesture {
  const {
    edgeWidth = 35,
    slop = 8,
    commitRatio = 0.35,
    commitVelocity = 600,
    width,
  } = config;

  let phase: Phase = "idle";
  let startX = 0;
  let startY = 0;
  let offset = 0;
  let samples: Sample[] = [];

  /** Progress is clamped: dragging *back* past the origin is not a thing. */
  const progressOf = (px: number): number => {
    const w = width();
    if (w <= 0) return 0;
    return Math.max(0, Math.min(1, px / w));
  };

  const reset = (): void => {
    phase = "idle";
    offset = 0;
    samples = [];
  };

  /**
   * Velocity over the trailing window rather than between the last two moves.
   * A single-frame derivative is noisy enough that whether a flick pops comes
   * down to which millisecond the finger happened to lift on.
   */
  const velocity = (now: number): number => {
    const last = samples[samples.length - 1];
    if (!last) return 0;
    let oldest = last;
    for (let i = samples.length - 1; i >= 0; i--) {
      const sample = samples[i];
      if (!sample || last.t - sample.t > VELOCITY_WINDOW_MS) break;
      oldest = sample;
    }
    // Also stale if the finger simply stopped and rested before lifting —
    // that is a deliberate placement, not a flick, and must read as zero.
    const dt = Math.max(last.t, now) - oldest.t;
    if (dt <= 0) return 0;
    return ((last.dx - oldest.dx) / dt) * 1000;
  };

  return {
    get phase() {
      return phase;
    },

    down(x, y, t) {
      reset();
      // The only cheap way to be sure a horizontal drag is *the back gesture*
      // and not a swipe inside a carousel: it has to start at the edge.
      if (x >= edgeWidth) return IDLE;
      phase = "pending";
      startX = x;
      startY = y;
      samples = [{ dx: 0, t }];
      return IDLE;
    },

    move(x, y, t) {
      if (phase === "idle") return IDLE;

      const dx = x - startX;
      const dy = y - startY;

      if (phase === "pending") {
        // Under the slop the finger has not said anything yet. Staying quiet
        // here is what lets a tap on a control near the edge still be a tap.
        if (Math.abs(dx) <= slop && Math.abs(dy) <= slop) return IDLE;
        // Vertical wins ties: an ambiguous drag on a scrollable page should
        // scroll, because a wrongly-swallowed scroll is far more annoying than
        // a back gesture that needs a second try.
        if (Math.abs(dy) >= Math.abs(dx)) {
          reset();
          return IDLE;
        }
        // Leading-edge drags only. Flicking left from the left edge is not a
        // back gesture, and treating it as one fights any horizontal scroller
        // that happens to sit under the edge.
        if (dx <= 0) {
          reset();
          return IDLE;
        }
        phase = "dragging";
      }

      offset = Math.max(0, dx);
      samples.push({ dx: offset, t });
      // Keep the window bounded — a slow drag can otherwise run for thousands
      // of moves. Two windows' worth is plenty of history.
      const cutoff = t - VELOCITY_WINDOW_MS * 2;
      while (samples.length > 2 && (samples[0]?.t ?? t) < cutoff) samples.shift();

      return { type: "drag", offset, progress: progressOf(offset) };
    },

    up(t) {
      if (phase !== "dragging") {
        reset();
        return IDLE;
      }
      const v = velocity(t);
      const progress = progressOf(offset);
      const settled = { offset, progress };
      // An unmeasurable surface — unmounted, `display: none`, pre-layout —
      // has no threshold to clear. A fast drag across it still reports a real
      // velocity, and popping the route on that is a phantom pop.
      const committed =
        width() > 0 && (progress > commitRatio || v > commitVelocity);
      reset();
      return committed
        ? { type: "commit", ...settled, velocity: v }
        : { type: "cancel", ...settled };
    },

    reset,
  };
}

/**
 * Wire a [[BackGesture]] to an element's touch events.
 *
 * `touchmove` is registered non-passive so the machine can consume the event
 * once it has locked horizontal — but `preventDefault` is called *only* on
 * that branch, so a vertical scroll or a sideways swipe inside a nested
 * scroller is never touched. `touchstart` stays passive: at that point the
 * gesture has not been decided and swallowing it would cost scroll
 * responsiveness on every tap.
 */
export function attachBackGesture(
  element: HTMLElement,
  gesture: BackGesture,
  onIntent: (intent: BackGestureIntent) => void,
): () => void {
  const point = (e: TouchEvent): Touch | undefined => e.touches[0] ?? e.changedTouches[0];

  const onStart = (e: TouchEvent): void => {
    // A second finger during a drag means a pinch or a two-finger scroll —
    // neither is a back gesture, and continuing would fight the browser.
    if (e.touches.length > 1) {
      gesture.reset();
      onIntent({ type: "cancel", offset: 0, progress: 0 });
      return;
    }
    const t = point(e);
    if (t) gesture.down(t.clientX, t.clientY, e.timeStamp);
  };

  const onMove = (e: TouchEvent): void => {
    const t = point(e);
    if (!t) return;
    const intent = gesture.move(t.clientX, t.clientY, e.timeStamp);
    if (intent.type === "drag") {
      // Only here. See the note at the top of this file.
      if (e.cancelable) e.preventDefault();
      onIntent(intent);
    }
  };

  const onEnd = (e: TouchEvent): void => {
    const intent = gesture.up(e.timeStamp);
    if (intent.type !== "idle") onIntent(intent);
  };

  const onCancel = (): void => {
    const active = gesture.phase === "dragging";
    gesture.reset();
    if (active) onIntent({ type: "cancel", offset: 0, progress: 0 });
  };

  element.addEventListener("touchstart", onStart, { passive: true });
  element.addEventListener("touchmove", onMove, { passive: false });
  element.addEventListener("touchend", onEnd, { passive: true });
  element.addEventListener("touchcancel", onCancel, { passive: true });

  return () => {
    element.removeEventListener("touchstart", onStart);
    element.removeEventListener("touchmove", onMove);
    element.removeEventListener("touchend", onEnd);
    element.removeEventListener("touchcancel", onCancel);
  };
}
