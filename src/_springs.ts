/**
 * Springs, as CSS.
 *
 * A spring is the curve that makes a push read as native rather than as a
 * slide — position overshoots slightly and settles, instead of decelerating
 * into a wall. Animation libraries ship a physics integrator to get this. CSS
 * ships `linear()`, which takes an arbitrary list of stops and interpolates
 * between them, so a spring can be *sampled* once and handed to the platform
 * as a plain easing string.
 *
 * That is the whole trick: simulate the spring here, emit `linear(...)`, and
 * let the browser's compositor run it. Works with CSS transitions, CSS
 * animations, and `Element.animate()` alike, with no runtime on the frame.
 */

export interface Spring {
  /** Higher = faster, tighter. */
  stiffness: number;
  /** Higher = less overshoot. Roughly `2 * sqrt(stiffness)` is critical. */
  damping: number;
  /** @default 1 */
  mass?: number;
}

export interface SpringEasing {
  /** A CSS `linear(...)` easing string. */
  easing: string;
  /** How long the spring takes to settle, in ms. */
  duration: number;
}

/** Below this displacement *and* velocity, the spring has stopped moving. */
const REST = 0.001;

/**
 * Below this displacement, the spring has stopped moving *visibly*.
 *
 * A near-critically-damped spring creeps the last fraction of a percent for
 * as long again as the whole visible motion took. Sampling that tail is
 * accurate and useless: the curve sits at 1 while the duration keeps running,
 * which reads as a fast animation followed by dead time. 0.2% of the travel
 * is well under a pixel on any real surface.
 */
const VISUAL_REST = 0.002;
/** Bail-out so an undamped spring can't spin forever. */
const MAX_MS = 6000;
/** Fixed integration step. 1ms is well inside stability for UI-scale springs. */
const STEP_MS = 1;

const cache = new Map<string, SpringEasing>();

/**
 * Sample a spring into a CSS `linear()` easing plus its settle duration.
 *
 * Memoized — the sample loop is cheap (a few thousand additions) but there is
 * no reason to repeat it per render, and the identity stability matters when
 * the result is handed to `Element.animate()`.
 */
export function springEasing(spring: Spring, samples = 40): SpringEasing {
  const { stiffness, damping, mass = 1 } = spring;
  const key = `${stiffness}/${damping}/${mass}/${samples}`;
  const hit = cache.get(key);
  if (hit) return hit;

  // Displacement from rest, normalized: 1 = fully away, 0 = arrived.
  // Progress (what CSS wants) is therefore `1 - x`.
  let x = 1;
  let v = 0;
  const dt = STEP_MS / 1000;
  const frames: number[] = [1 - x];

  let elapsed = 0;
  while (elapsed < MAX_MS) {
    // Semi-implicit Euler: update velocity from the *current* position, then
    // position from the *new* velocity. Stays stable where explicit Euler
    // drifts and gains energy.
    const a = (-stiffness * x - damping * v) / mass;
    v += a * dt;
    x += v * dt;
    elapsed += STEP_MS;
    frames.push(1 - x);
    if (Math.abs(x) < REST && Math.abs(v) < REST) break;
  }

  // Cut the invisible tail. Everything after the last frame that is still
  // meaningfully away from 1 is time the animation spends already arrived.
  let last = frames.length - 1;
  while (last > 1 && Math.abs(1 - frames[last - 1]!) < VISUAL_REST) last--;
  const visible = frames.slice(0, last + 1);
  const duration = Math.max(STEP_MS, (visible.length - 1) * STEP_MS);

  // Resample the (1ms-resolution) simulation down to `samples` stops. More
  // stops track the curve better; 40 is indistinguishable from the real thing
  // at UI durations and keeps the CSS string short.
  const stops: string[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const frame = visible[Math.round(t * (visible.length - 1))] ?? 1;
    // Pin the endpoints exactly: a spring that ends at 0.9997 leaves the panel
    // a fraction of a pixel off, which is visible as a seam against an edge.
    const value = i === 0 ? 0 : i === samples - 1 ? 1 : frame;
    stops.push(`${round(value)} ${round(t * 100)}%`);
  }

  const result: SpringEasing = {
    easing: `linear(${stops.join(", ")})`,
    duration,
  };
  cache.set(key, result);
  return result;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * The house springs. Ported from the socials mobile shell, whose push is the
 * smoothest of the implementations this package is merged from — the thing
 * that makes it read well is that position springs while opacity runs a much
 * shorter plain tween, so the fade is over before the slide has settled.
 */
export const SPRINGS = {
  /** Tap-driven push and pop. */
  push: { stiffness: 420, damping: 40 },
  /** Released past the threshold: finish the pop. Softer, since the gesture already carried it most of the way. */
  commit: { stiffness: 300, damping: 35 },
  /** Released short of the threshold: snap back. Stiff and overdamped — a bounce here reads as a bug, not as physics. */
  settle: { stiffness: 500, damping: 50 },
} as const satisfies Record<string, Spring>;

/** Opacity crossfade. Deliberately shorter than any spring above. */
export const FADE_MS = 160;
export const FADE_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
