import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { usePresence, useLevelMemory, whenSettled } from "../_presence";
import type { Presence } from "../_presence";

/** Drives a hook through renders and hands back its latest return value. */
function harness<P, R>(hook: (props: P) => R, initial: P) {
  const box: { current: R | undefined } = { current: undefined };
  function Probe({ props }: { props: P }) {
    box.current = hook(props);
    return null;
  }
  const view = render(<Probe props={initial} />);
  return {
    get result() {
      return box.current as R;
    },
    rerender: (props: P) => act(() => view.rerender(<Probe props={props} />)),
  };
}

interface Props { key: string; value: string }
const presenceHarness = (initial: Props) =>
  harness<Props, Presence<string>>((p) => usePresence(p.key, p.value), initial);

describe("usePresence", () => {
  it("starts with a single entering entry", () => {
    const h = presenceHarness({ key: "/a", value: "A" });
    expect(h.result.entries).toEqual([{ key: "/a", value: "A", state: "enter" }]);
  });

  it("retains the previous entry as exiting, on the same render as the swap", () => {
    const h = presenceHarness({ key: "/a", value: "A" });
    h.rerender({ key: "/b", value: "B" });
    expect(h.result.entries).toEqual([
      { key: "/a", value: "A", state: "exit" },
      { key: "/b", value: "B", state: "enter" },
    ]);
  });

  it("freezes the exiting value instead of re-rendering it against new data", () => {
    const h = presenceHarness({ key: "/a", value: "A" });
    h.rerender({ key: "/b", value: "B" });
    h.rerender({ key: "/b", value: "B-revalidated" });
    expect(h.result.entries[0]).toEqual({ key: "/a", value: "A", state: "exit" });
  });

  it("follows new content for the live entry", () => {
    const h = presenceHarness({ key: "/a", value: "A" });
    h.rerender({ key: "/a", value: "A-streamed" });
    expect(h.result.entries).toEqual([
      { key: "/a", value: "A-streamed", state: "enter" },
    ]);
  });

  it("revives a key it is navigated back to mid-exit, never duplicating it", () => {
    const h = presenceHarness({ key: "/a", value: "A" });
    h.rerender({ key: "/b", value: "B" });
    h.rerender({ key: "/a", value: "A" });

    const keys = h.result.entries.map((e) => e.key);
    expect(keys).toEqual(["/b", "/a"]);
    expect(h.result.entries.at(1)?.state).toBe("enter");
  });

  it("releases an exited entry once its animation reports back", () => {
    const h = presenceHarness({ key: "/a", value: "A" });
    h.rerender({ key: "/b", value: "B" });
    act(() => h.result.release("/a"));
    expect(h.result.entries).toEqual([{ key: "/b", value: "B", state: "enter" }]);
  });

  it("refuses to release the live entry, however late the event lands", () => {
    const h = presenceHarness({ key: "/a", value: "A" });
    act(() => h.result.release("/a"));
    expect(h.result.entries).toHaveLength(1);
  });

  it("stacks multiple exits when navigation outruns the animation", () => {
    const h = presenceHarness({ key: "/a", value: "A" });
    h.rerender({ key: "/b", value: "B" });
    h.rerender({ key: "/c", value: "C" });
    expect(h.result.entries.map((e) => [e.key, e.state])).toEqual([
      ["/a", "exit"],
      ["/b", "exit"],
      ["/c", "enter"],
    ]);
  });
});

interface MemProps { depth: number; value: string }

describe("useLevelMemory", () => {
  const memHarness = (initial: MemProps) =>
    harness<MemProps, (d: number) => string | undefined>(
      (p) => useLevelMemory(p.depth, p.value),
      initial,
    );

  it("hands back the level a back-swipe is heading toward", () => {
    const h = memHarness({ depth: 0, value: "root" });
    h.rerender({ depth: 1, value: "category" });
    expect(h.result(0)).toBe("root");
  });

  it("knows nothing about a level never visited — the deep-link gap", () => {
    const h = memHarness({ depth: 2, value: "deep" });
    expect(h.result(1)).toBeUndefined();
  });

  it("forgets levels deeper than the current one", () => {
    const h = memHarness({ depth: 0, value: "root" });
    h.rerender({ depth: 1, value: "category" });
    h.rerender({ depth: 2, value: "view" });
    h.rerender({ depth: 0, value: "root" });
    expect(h.result(1)).toBeUndefined();
    expect(h.result(2)).toBeUndefined();
  });
});

describe("whenSettled", () => {
  it("resolves immediately when reduced motion has removed the animation", async () => {
    // jsdom has no animations; that is the same observable state as a flattened one.
    const el = document.createElement("div");
    await expect(whenSettled(el)).resolves.toBeUndefined();
  });

  it("resolves when a cancelled animation rejects rather than hanging", async () => {
    const el = document.createElement("div");
    let reject: (e: Error) => void = () => undefined;
    const pending = new Promise<void>((_, r) => {
      reject = r;
    });
    // getAnimations is not implemented in jsdom — stand one in.
    (el as unknown as { getAnimations: () => unknown[] }).getAnimations = () => [
      { finished: pending },
    ];
    const settled = whenSettled(el);
    reject(new Error("cancelled"));
    await expect(settled).resolves.toBeUndefined();
  });
});
