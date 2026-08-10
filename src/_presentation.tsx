"use client";

/**
 * The stack itself.
 *
 * Depth comes from the URL, the transition comes from CSS, and the gesture
 * comes from raw touch events with no `touch-action` declared anywhere. What
 * is left for this file is the wiring between those three, plus the four
 * details that separate a push that works from one that feels right: keeping
 * the departing level alive long enough to animate, revealing the level a
 * swipe is heading toward, not letting the page height snap mid-transition,
 * and putting the scroll position back where it was.
 */

import * as React from "react";

import {
  BarSlots,
  ExitBoundary,
  NavBar,
  PresentationProvider,
} from "./_chrome.js";
import type { PresentationContextValue } from "./_chrome.js";
import { attachBackGesture, createBackGesture } from "./_gesture.js";
import { useLevelMemory, usePresence, whenSettled } from "./_presence.js";
import { resolvePresentation } from "./_resolve.js";
import type { PresentSpec, Resolver, StackEntry } from "./_resolve.js";
import { SPRINGS, springEasing } from "./_springs.js";

export interface PresentationProps {
  /** Current path, from the host router. */
  path: string;
  /** Host router navigation. Used by the back button and by a released swipe. */
  navigate: (path: string) => void;
  /** Where a path sits in the stack. See `createResolver`. */
  resolve: Resolver;
  /**
   * The level's content, from the host router.
   *
   * Omit it to run rail-only: a stack that is nothing but its levels, which is
   * what a sidebar is. Admin mounts NavStack that way — `rootRight={null}`,
   * full-width left rail, no gap — so the levels push inside the sidebar with
   * no detail pane beside them.
   */
  children?: React.ReactNode;
  /**
   * How levels present themselves — one style, or one per breakpoint.
   * Resolved in CSS, so this costs no media query and no hydration reflow.
   * @default "auto"
   */
  present?: PresentSpec;
  /** Host link component, so the back affordance is a real anchor. */
  Link?: React.ComponentProps<typeof NavBar>["Link"];
  /** Replace the default bar entirely. Return null for no bar. */
  renderBar?: (
    entry: StackEntry,
    helpers: { back: () => void },
  ) => React.ReactNode;
  /** Suppress the built-in bar without replacing it — for a host with its own chrome. */
  bar?: boolean;
  /**
   * Content for the list rail, per level.
   *
   * Supplying this turns on the two-rail presentation: the rail and the
   * content pane move together on every push, which is what "synced rails"
   * means and what a static sidebar beside an animating pane does not do.
   *
   * The rail is keyed by *depth*, not by path, so swapping between siblings at
   * the same depth leaves the list alone and only moves the highlight inside
   * it — re-animating a list you are still standing in reads as a glitch.
   *
   * Rendered at every breakpoint so the tree does not change shape; CSS shows
   * it only where the resolved presentation is `rails`.
   */
  rail?: (entry: StackEntry) => React.ReactNode;
  /** Left-edge swipe to go back. @default true */
  swipe?: boolean;
  /** Restore each level's scroll position when it is returned to. @default true */
  restoreScroll?: boolean;
  className?: string;
}

/** Distance in px from the leading edge where a back swipe may begin. */
const EDGE_WIDTH = 35;

export function Presentation({
  path,
  navigate,
  resolve,
  children,
  present = "auto",
  Link,
  renderBar,
  bar = true,
  rail,
  swipe = true,
  restoreScroll = true,
  className,
}: PresentationProps) {
  const entry = resolve(path);
  const depth = entry?.depth ?? 0;
  // Rail level, which is not the URL depth: `/settings` and
  // `/settings/appearance` are two rows of one list.
  const level = entry?.level ?? depth;
  const styles = resolvePresentation(present, entry);

  // Push or pop, decided during render. The direction has to be known on the
  // same render that swaps the key — an effect runs a frame later, by which
  // time the arriving level has already painted where it was going.
  const [track, setTrack] = React.useState({
    path,
    depth,
    level,
    dir: 1,
    sameLevel: false,
  });
  const moved = path !== track.path;
  /**
   * A move within one rail level.
   *
   * `admin-kit` keys both rails `level-${depth}`, so this re-keys neither and
   * nothing animates — the list highlight and the page content change in
   * place. Note this is *level*, not URL depth: going from `/settings` to
   * `/settings/appearance` is a segment deeper but the same list, and treating
   * it as a push is what made the sidebar slide when it should have sat still.
   *
   * Tracked here rather than expressed as a key, because the same tree has to
   * keep doing a real push on a phone, where that move genuinely is one. Which
   * of the two applies is a breakpoint question, settled in CSS.
   */
  const sameLevel = moved ? level === track.level : track.sameLevel;
  const dir = moved
    ? depth === track.depth
      ? track.dir
      : depth > track.depth
        ? 1
        : -1
    : track.dir;
  if (moved) setTrack({ path, depth, level, dir, sameLevel });
  const direction = dir >= 0 ? "forward" : "back";

  const { entries, release } = usePresence(path, children);
  const recall = useLevelMemory(depth, children);

  // The rail is its own presence, keyed by rail level: every row of one list
  // shares a key, so moving between them re-keys nothing and the list is left
  // alone — only the highlight inside it moves. The pane is keyed by path
  // because a phone still pushes; on the rails side `data-same-level` zeroes
  // its travel so it lands where admin-kit does.
  const railNode = rail && entry ? rail(entry) : null;
  const railPresence = usePresence(`level-${level}`, railNode);

  const stackRef = React.useRef<HTMLDivElement>(null);
  const parentPath = entry?.parent?.path;

  const back = React.useCallback(() => {
    if (parentPath) navigate(parentPath);
  }, [navigate, parentPath]);

  useScrollMemory(path, direction, restoreScroll);
  usePinnedHeight(stackRef, entries.length > 1);
  const dragging = useBackSwipe({
    stackRef,
    enabled: swipe && Boolean(parentPath) && styles.base === "push",
    onCommit: back,
  });

  const context = React.useMemo<PresentationContextValue>(
    () => ({ entry, depth, dismiss: back, present: navigate }),
    [entry, depth, back, navigate],
  );

  // A path outside the stack is not this component's business — render it
  // untouched rather than wrapping it in chrome that does not apply.
  if (!entry) return <>{children}</>;

  const beneath = dragging ? recall(depth - 1) : undefined;
  const push = springEasing(SPRINGS.push);
  // A stack with no content is all rail: the sidebar case.
  const railOnly = children == null;

  return (
    <PresentationProvider value={context}>
      <div
        ref={stackRef}
        className={className ? `pr-stack ${className}` : "pr-stack"}
        data-present={styles.base}
        data-present-sm={styles.sm}
        data-present-md={styles.md}
        data-present-lg={styles.lg}
        data-depth={depth}
        data-level={level}
        data-same-level={sameLevel ? "" : undefined}
        data-rail-only={railOnly ? "" : undefined}
        // The push spring lives in `_springs.ts`. It is published under its own
        // names rather than as `--pr-duration`/`--pr-ease` directly: an inline
        // declaration outranks every stylesheet rule, so writing the generic
        // names here would force the push's timing onto `rails`, `fade` and
        // `none` too. Only the `push` block reads these.
        style={
          {
            "--pr-push-duration": `${push.duration}ms`,
            "--pr-push-ease": push.easing,
          } as React.CSSProperties
        }
      >
        {rail ? (
          <div className="pr-rail">
            {railPresence.entries.map((item) => (
              <Level
                key={item.key}
                state={item.state}
                direction={direction}
                depth={level}
                onSettled={
                  item.state === "exit"
                    ? () => railPresence.release(item.key)
                    : undefined
                }
              >
                {item.state === "exit" ? (
                  <ExitBoundary>{item.value}</ExitBoundary>
                ) : (
                  item.value
                )}
              </Level>
            ))}
          </div>
        ) : null}

        {railOnly ? null : (
          <div className="pr-pane">
            {beneath !== undefined ? (
              <div className="pr-level" data-role="beneath" aria-hidden="true">
                <ExitBoundary>{beneath}</ExitBoundary>
              </div>
            ) : null}
            {dragging ? <div className="pr-backdrop" /> : null}

            {entries.map((item) => {
              const exiting = item.state === "exit";
              const level = exiting ? resolve(item.key) : entry;
              return (
                <Level
                  key={item.key}
                  state={item.state}
                  direction={direction}
                  // zIndex by depth so the front level always covers the one
                  // behind, whichever way the stack is moving.
                  depth={level?.depth ?? depth}
                  onSettled={exiting ? () => release(item.key) : undefined}
                >
                  {/*
                   * The slot provider wraps the bar *and* the page, because the
                   * page is where `<Presentation.Title>` lives and it needs a
                   * target to portal into.
                   */}
                  <BarSlots>
                    {bar && level?.parent ? (
                      renderBar ? (
                        renderBar(level, { back })
                      ) : (
                        <NavBar entry={level} onBack={back} Link={Link} />
                      )
                    ) : null}
                    {exiting ? (
                      <ExitBoundary>{item.value}</ExitBoundary>
                    ) : (
                      item.value
                    )}
                  </BarSlots>
                </Level>
              );
            })}
          </div>
        )}
      </div>
    </PresentationProvider>
  );
}

function Level({
  state,
  direction,
  depth,
  onSettled,
  children,
}: {
  state: "enter" | "exit";
  direction: "forward" | "back";
  depth: number;
  onSettled?: () => void;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!onSettled) return;
    const element = ref.current;
    if (!element) return;
    let live = true;
    // Resolves immediately when reduced motion has flattened the animation
    // away, which `animationend` would not — it never fires, and the departing
    // level would sit on top of the page forever.
    void whenSettled(element).then(() => {
      if (live) onSettled();
    });
    return () => {
      live = false;
    };
  }, [onSettled]);

  return (
    <div
      ref={ref}
      className="pr-level"
      data-state={state}
      data-direction={direction}
      data-role={state === "exit" ? "leaving" : "top"}
      style={{ zIndex: depth }}
      // A level on its way out must not take focus or clicks — it is a
      // picture of a page the user has already left.
      inert={state === "exit" ? true : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Remember where each level was scrolled to, and put it back on the way up.
 *
 * iOS does this and its absence is felt rather than noticed: you scroll a long
 * list, open a row, come back, and you are at the top again with no idea where
 * you were. Only pops restore — arriving somewhere new should start at the top.
 */
function useScrollMemory(
  path: string,
  direction: "forward" | "back",
  enabled: boolean,
) {
  const positions = React.useRef(new Map<string, number>());

  React.useEffect(() => {
    if (!enabled) return;
    const remembered = positions.current;
    // Runs on the way *out* of this path, which is the only moment its scroll
    // position is still true.
    return () => {
      remembered.set(path, window.scrollY);
    };
  }, [path, enabled]);

  React.useLayoutEffect(() => {
    if (!enabled) return;
    if (direction !== "back") {
      window.scrollTo(0, 0);
      return;
    }
    const remembered = positions.current.get(path);
    if (remembered !== undefined) window.scrollTo(0, remembered);
    // `direction` is deliberately not a dependency: it is derived from the
    // same render as `path`, and re-running on its own would scroll the user
    // somewhere they did not navigate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled]);
}

/**
 * Hold the stack's height while two levels overlap.
 *
 * The departing level is absolutely positioned so the two do not stack
 * vertically — which means for the length of the transition the stack is only
 * as tall as the arriving level. Pushing from a long page to a short one
 * therefore collapses the document mid-animation and the scroll position
 * lurches. Pinning the taller of the two until the transition ends costs one
 * measurement and removes the jump.
 */
function usePinnedHeight(
  ref: React.RefObject<HTMLDivElement | null>,
  overlapping: boolean,
) {
  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!overlapping) {
      element.style.removeProperty("min-height");
      return;
    }
    element.style.setProperty("min-height", `${element.offsetHeight}px`);
    return () => {
      element.style.removeProperty("min-height");
    };
  }, [ref, overlapping]);
}

/**
 * The interactive back swipe.
 *
 * While the finger is down the transform is written straight to a custom
 * property and the CSS animation is off, so the panel tracks the touch with
 * nothing easing between them. On release the same properties are handed a
 * transition whose timing function is a sampled spring, which is what lets the
 * motion resume from wherever the drag stopped rather than restarting from
 * zero — the thing a keyframe animation cannot do.
 *
 * Navigation is committed only once that animation has finished, so the URL
 * never changes underneath a moving panel.
 */
function useBackSwipe({
  stackRef,
  enabled,
  onCommit,
}: {
  stackRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
  onCommit: () => void;
}) {
  const [dragging, setDragging] = React.useState(false);
  // Held in a ref so a changed `onCommit` does not tear down and re-attach the
  // touch listeners mid-drag.
  const commitRef = React.useRef(onCommit);
  React.useEffect(() => {
    commitRef.current = onCommit;
  }, [onCommit]);

  React.useEffect(() => {
    const stack = stackRef.current;
    if (!enabled || !stack) return;

    let cleanupRelease: (() => void) | undefined;

    const set = (prop: string, value: string) =>
      stack.style.setProperty(prop, value);
    const clear = () => {
      stack.removeAttribute("data-dragging");
      stack.removeAttribute("data-releasing");
      for (const prop of [
        "--pr-drag",
        "--pr-progress",
        "--pr-release-duration",
        "--pr-release-ease",
      ]) {
        stack.style.removeProperty(prop);
      }
      setDragging(false);
    };

    /** Run the panel to `target`, then hand back control. */
    const settleTo = (
      from: { offset: number; progress: number },
      target: { offset: number; progress: number },
      spring: { stiffness: number; damping: number },
      done: () => void,
    ) => {
      cleanupRelease?.();
      const { easing, duration } = springEasing(spring);
      set("--pr-drag", `${from.offset}px`);
      set("--pr-progress", `${from.progress}`);
      set("--pr-release-duration", `${duration}ms`);
      set("--pr-release-ease", easing);
      stack.setAttribute("data-releasing", "");
      // Flush so the transition has a start value to leave from.
      void stack.offsetWidth;
      set("--pr-drag", `${target.offset}px`);
      set("--pr-progress", `${target.progress}`);

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        cleanupRelease?.();
        cleanupRelease = undefined;
        done();
      };
      const onEnd = (event: TransitionEvent) => {
        if (event.propertyName === "--pr-drag") finish();
      };
      stack.addEventListener("transitionend", onEnd);
      // Custom-property transitions need `@property` registration to run at
      // all. Where that is unavailable the value jumps and `transitionend`
      // never fires, so the panel would stick. Land it on a timer instead.
      const timer = window.setTimeout(finish, duration + 80);
      cleanupRelease = () => {
        stack.removeEventListener("transitionend", onEnd);
        window.clearTimeout(timer);
      };
    };

    const gesture = createBackGesture({
      edgeWidth: EDGE_WIDTH,
      width: () => stack.clientWidth,
    });

    const detach = attachBackGesture(stack, gesture, (intent) => {
      switch (intent.type) {
        case "drag": {
          cleanupRelease?.();
          cleanupRelease = undefined;
          stack.removeAttribute("data-releasing");
          stack.setAttribute("data-dragging", "");
          set("--pr-drag", `${intent.offset}px`);
          set("--pr-progress", `${intent.progress}`);
          setDragging(true);
          return;
        }
        case "commit": {
          settleTo(
            intent,
            { offset: stack.clientWidth, progress: 1 },
            SPRINGS.commit,
            () => {
              // The navigation lands while `data-dragging` still suppresses the
              // keyframes, so the arriving level is already sitting at rest
              // where the drag left it and does not re-animate from off-screen.
              commitRef.current();
              requestAnimationFrame(clear);
            },
          );
          return;
        }
        case "cancel": {
          settleTo(intent, { offset: 0, progress: 0 }, SPRINGS.settle, clear);
          return;
        }
      }
    });

    return () => {
      detach();
      cleanupRelease?.();
      clear();
    };
  }, [enabled, stackRef]);

  return dragging;
}
