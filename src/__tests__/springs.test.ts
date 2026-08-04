import { describe, expect, it } from "vitest";

import { SPRINGS, springEasing } from "../_springs";

const stops = (easing: string): number[] =>
  easing
    .slice("linear(".length, -1)
    .split(", ")
    .map((stop) => Number(stop.split(" ")[0]));

describe("springEasing", () => {
  it("emits a CSS linear() easing pinned to both endpoints", () => {
    const { easing } = springEasing(SPRINGS.push);
    expect(easing.startsWith("linear(")).toBe(true);
    const values = stops(easing);
    // Landing at 0.9997 leaves the panel a fraction of a pixel off the edge.
    expect(values[0]).toBe(0);
    expect(values[values.length - 1]).toBe(1);
  });

  it("settles in a plausible UI duration", () => {
    const { duration } = springEasing(SPRINGS.push);
    expect(duration).toBeGreaterThan(150);
    expect(duration).toBeLessThan(900);
  });

  it("makes a stiffer spring finish sooner", () => {
    const slow = springEasing({ stiffness: 120, damping: 20 });
    const fast = springEasing({ stiffness: 500, damping: 40 });
    expect(fast.duration).toBeLessThan(slow.duration);
  });

  it("overshoots when underdamped and does not when overdamped", () => {
    const bouncy = springEasing({ stiffness: 400, damping: 12 });
    expect(Math.max(...stops(bouncy.easing))).toBeGreaterThan(1);

    // `settle` runs on a cancelled swipe, where any bounce reads as a bug.
    const firm = springEasing(SPRINGS.settle);
    expect(Math.max(...stops(firm.easing))).toBeLessThanOrEqual(1);
  });

  it("is monotonic while overdamped — no jitter from the integrator", () => {
    const values = stops(springEasing(SPRINGS.settle).easing);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]!).toBeGreaterThanOrEqual(values[i - 1]!);
    }
  });

  it("returns the identical object for the same spring", () => {
    // The result is handed to Element.animate(); a new string per render would
    // restart the animation.
    expect(springEasing(SPRINGS.push)).toBe(springEasing(SPRINGS.push));
  });
});
