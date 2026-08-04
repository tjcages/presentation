import { describe, expect, it } from "vitest";

import { createBackGesture } from "../_gesture";

const WIDTH = 400;
const make = (overrides = {}) =>
  createBackGesture({ width: () => WIDTH, ...overrides });

describe("back gesture — what it refuses to claim", () => {
  it("ignores a touch that starts away from the edge", () => {
    const g = make();
    g.down(200, 300, 0);
    expect(g.phase).toBe("idle");
    expect(g.move(280, 300, 16)).toEqual({ type: "idle" });
  });

  it("abandons the gesture when the finger goes vertical", () => {
    const g = make();
    g.down(10, 300, 0);
    expect(g.move(14, 340, 16)).toEqual({ type: "idle" });
    expect(g.phase).toBe("idle");
    // Still dead even if the finger later turns horizontal — a scroll that
    // has begun must not be stolen mid-flick.
    expect(g.move(200, 340, 32)).toEqual({ type: "idle" });
  });

  it("treats an equal-diagonal drag as vertical", () => {
    const g = make();
    g.down(10, 300, 0);
    expect(g.move(30, 320, 16)).toEqual({ type: "idle" });
  });

  it("stays quiet inside the slop, so an edge tap is still a tap", () => {
    const g = make();
    g.down(10, 300, 0);
    expect(g.move(15, 302, 16)).toEqual({ type: "idle" });
    expect(g.phase).toBe("pending");
  });

  it("does not claim a leftward drag from the leading edge", () => {
    const g = make();
    g.down(30, 300, 0);
    expect(g.move(10, 300, 16)).toEqual({ type: "idle" });
    expect(g.phase).toBe("idle");
  });

  it("reports nothing on release when no drag ever started", () => {
    const g = make();
    g.down(10, 300, 0);
    g.move(15, 302, 16);
    expect(g.up(32)).toEqual({ type: "idle" });
  });
});

describe("back gesture — tracking", () => {
  it("locks horizontal and follows the finger", () => {
    const g = make();
    g.down(10, 300, 0);
    const locked = g.move(40, 302, 16);
    expect(locked).toMatchObject({ type: "drag" });
    expect(g.phase).toBe("dragging");

    const moved = g.move(210, 305, 32);
    expect(moved).toMatchObject({ type: "drag", offset: 200, progress: 0.5 });
  });

  it("clamps progress when dragged back past the origin", () => {
    const g = make();
    g.down(10, 300, 0);
    g.move(40, 300, 16);
    expect(g.move(-100, 300, 32)).toMatchObject({ offset: 0, progress: 0 });
  });

  it("keeps following vertically once locked — a drag is not cancelled by drift", () => {
    const g = make();
    g.down(10, 300, 0);
    g.move(40, 300, 16);
    expect(g.move(120, 500, 32)).toMatchObject({ type: "drag", offset: 110 });
  });
});

describe("back gesture — the release decision", () => {
  it("commits past the distance threshold", () => {
    const g = make();
    g.down(0, 300, 0);
    g.move(40, 300, 16);
    g.move(200, 300, 200); // 50% > 35%
    expect(g.up(200)).toMatchObject({ type: "commit" });
  });

  it("cancels short of the threshold when the finger was resting", () => {
    const g = make();
    g.down(0, 300, 0);
    g.move(40, 300, 16);
    g.move(80, 300, 32);
    // Long pause at rest: not a flick, whatever happened before it.
    g.move(80, 300, 400);
    expect(g.up(400)).toMatchObject({ type: "cancel", offset: 80 });
  });

  it("commits a short flick on velocity alone", () => {
    const g = make();
    g.down(0, 300, 0);
    g.move(40, 300, 16);
    // 60px in 32ms ≈ 1875px/s, only 25% across — distance says no, speed says yes.
    g.move(100, 300, 48);
    const intent = g.up(48);
    expect(intent.type).toBe("commit");
    expect(intent.type === "commit" && intent.velocity).toBeGreaterThan(600);
  });

  it("does not commit a slow drag that covers the same distance", () => {
    const g = make();
    g.down(0, 300, 0);
    g.move(40, 300, 100);
    g.move(100, 300, 900);
    expect(g.up(900)).toMatchObject({ type: "cancel" });
  });

  it("resets after a release, so the next touch starts clean", () => {
    const g = make();
    g.down(0, 300, 0);
    g.move(200, 300, 32);
    g.up(48);
    expect(g.phase).toBe("idle");
    expect(g.move(300, 300, 64)).toEqual({ type: "idle" });
  });

  it("survives a zero-width surface without dividing by it", () => {
    const g = createBackGesture({ width: () => 0 });
    g.down(0, 300, 0);
    expect(g.move(40, 300, 16)).toMatchObject({ progress: 0 });
    expect(g.up(32)).toMatchObject({ type: "cancel" });
  });
});
