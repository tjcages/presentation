/**
 * Keeping a level on screen after it has left the URL.
 *
 * The router hands over exactly one thing: the content for the *current*
 * path. A push, though, needs two levels visible at once — the arriving one
 * sliding in, the departing one parallaxing out — for as long as the
 * animation runs. Something has to hold the old one after React has moved on.
 *
 * That is all this file does. [[usePresence]] keeps the previous value around,
 * flagged `exit`, until the caller says its animation has finished.
 * [[useLevelMemory]] keeps one value per depth so a back-swipe can reveal the
 * level it is swiping toward *before* the URL has changed to it.
 *
 * Both freeze the value at the moment it was current. That matters: a
 * departing level re-rendered against the new route's data is a level
 * destructuring props that are already gone.
 */

import * as React from "react";

export type PresenceState = "enter" | "exit";

export interface PresenceEntry<T> {
  key: string;
  /** Frozen at the render this key was current. */
  value: T;
  state: PresenceState;
}

export interface Presence<T> {
  /** Oldest first; the last entry is always the current one. */
  entries: PresenceEntry<T>[];
  /** Drop an exited entry once its animation has finished. */
  release: (key: string) => void;
}

interface PresenceStore<T> {
  key: string;
  entries: PresenceEntry<T>[];
}

/**
 * Hold `value` under `key`, retaining prior values as `exit` entries.
 *
 * The swap happens *during render* rather than in an effect. The direction of
 * a push is only knowable on the same render that changes the key, and an
 * effect runs a frame later — by then the new level has already painted at its
 * resting position and the animation has nothing left to animate.
 */
export function usePresence<T>(key: string, value: T): Presence<T> {
  const [store, setStore] = React.useState<PresenceStore<T>>(() => ({
    key,
    entries: [{ key, value, state: "enter" }],
  }));

  let entries = store.entries;

  if (key !== store.key) {
    entries = [
      // Anything still on screen is now leaving. A key we are returning *to*
      // is pulled out of the exiting set and revived below, so a fast
      // back-back-forward never ends up with the same key twice.
      ...store.entries
        .filter((entry) => entry.key !== key)
        .map((entry) =>
          entry.state === "exit" ? entry : { ...entry, state: "exit" as const },
        ),
      { key, value, state: "enter" as const },
    ];
    setStore({ key, entries });
  } else {
    // Same key, new content (a revalidation, a streamed-in segment). Only the
    // live entry follows along — exiting ones stay frozen on purpose.
    const current = store.entries[store.entries.length - 1];
    if (current && current.value !== value) {
      entries = [
        ...store.entries.slice(0, -1),
        { ...current, value, state: "enter" as const },
      ];
      setStore({ key, entries });
    }
  }

  const release = React.useCallback((released: string) => {
    setStore((prev) => {
      // Never release the live entry, however late the animation event lands.
      if (released === prev.key) return prev;
      const next = prev.entries.filter((entry) => entry.key !== released);
      return next.length === prev.entries.length ? prev : { ...prev, entries: next };
    });
  }, []);

  return { entries, release };
}

/**
 * Remember the most recent value at each depth.
 *
 * A back-swipe has to show the level underneath while the finger is still
 * down — which is before any navigation has happened, so the router has not
 * been asked for that level and cannot supply it. The level being swiped
 * toward is, however, the level that was on screen a moment ago, so keeping
 * the last value seen at each depth is enough to render it.
 *
 * Deep links are the exception: arriving straight at depth 2 leaves nothing
 * remembered at depth 1, so a swipe there reveals the backdrop instead of a
 * page. That is a real gap and a cheap one — the alternative is speculatively
 * fetching the parent route on touch-down, which costs a request per aborted
 * swipe.
 */
export function useLevelMemory<T>(depth: number, value: T): (depth: number) => T | undefined {
  const memory = React.useRef(new Map<number, T>());

  // Recorded after the commit rather than during render: a gesture can only
  // start once the level is on screen, so there is no window in which this is
  // read before it has been written.
  React.useEffect(() => {
    const levels = memory.current;
    levels.set(depth, value);
    // Anything deeper than the current level is unreachable by a back gesture
    // and would otherwise pin content — and its data — indefinitely.
    for (const known of levels.keys()) {
      if (known > depth) levels.delete(known);
    }
  }, [depth, value]);

  return React.useCallback((at: number) => memory.current.get(at), []);
}

/**
 * Resolve once every animation on `element` (and its subtree) has finished.
 *
 * `animationend` is the obvious hook and the wrong one: it does not fire at
 * all when reduced motion has flattened the animation away, which would strand
 * the departing level on screen forever. `getAnimations()` reports an empty
 * list in exactly that case, so this resolves immediately instead.
 */
export function whenSettled(element: Element): Promise<void> {
  // Typed as optional deliberately: jsdom and older engines do not implement
  // it, and an absent list means the same thing as an empty one.
  const host = element as { getAnimations?: (o?: GetAnimationsOptions) => Animation[] };
  const animations = host.getAnimations?.({ subtree: true }) ?? [];
  if (animations.length === 0) return Promise.resolve();
  return Promise.all(
    // A cancelled animation rejects; that still counts as settled.
    animations.map((animation) => animation.finished.catch(() => undefined)),
  ).then(() => undefined);
}
