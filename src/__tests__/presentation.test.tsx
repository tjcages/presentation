import { act, render, screen } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { Presentation } from "../_presentation";
import { AtRootLevel, PresentationScope, PresentationTitle, usePresentation } from "../_chrome";
import { createResolver } from "../_resolve";

const resolve = createResolver({
  root: "/settings",
  title: "Settings",
  // Access is a rail level of its own; every other row shares the root list.
  subLevels: [{ basePath: "/settings/access", title: "Access" }],
  routes: [
    { path: "/settings" },
    { path: "/settings/appearance", title: "Appearance" },
    { path: "/settings/access", title: "Access" },
    { path: "/settings/access/roles", title: "Roles" },
  ],
});

function Stack({
  path,
  navigate = () => undefined,
  children,
  ...rest
}: {
  path: string;
  navigate?: (p: string) => void;
  children: React.ReactNode;
} & Partial<React.ComponentProps<typeof Presentation>>) {
  return (
    <Presentation
      path={path}
      navigate={navigate}
      resolve={resolve}
      rail={(e) => <nav>rail level {e.level}</nav>}
      {...rest}
    >
      {children}
    </Presentation>
  );
}

/** querySelector that fails the test loudly rather than yielding null. */
function pick(root: HTMLElement, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`nothing matched ${selector}`);
  return el;
}

/** jsdom runs no animations, so exits settle on the next effect turn. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

describe("<Presentation>", () => {
  it("renders the level's content", () => {
    render(<Stack path="/settings">root list</Stack>);
    expect(screen.getByText("root list")).toBeTruthy();
  });

  it("passes a path outside the stack straight through, with no chrome", () => {
    const { container } = render(<Stack path="/dashboard">elsewhere</Stack>);
    expect(screen.getByText("elsewhere")).toBeTruthy();
    expect(container.querySelector(".pr-stack")).toBeNull();
  });

  it("shows no back affordance at the root", () => {
    const { container } = render(<Stack path="/settings">root</Stack>);
    expect(container.querySelector(".pr-bar-back")).toBeNull();
  });

  it("points a deep link's back button up a level, not out of the area", () => {
    render(<Stack path="/settings/access/roles">roles</Stack>);
    expect(screen.getByText("Access")).toBeTruthy();
  });

  it("never renders a back link pointing at the page it is on", () => {
    for (const path of ["/settings/appearance", "/settings/access", "/settings/access/roles"]) {
      const view = render(<Stack path={path}>page</Stack>);
      const back = view.container.querySelector(".pr-bar-back");
      if (back) {
        expect(back.getAttribute("href"), `${path} back points at itself`).not.toBe(path);
      }
      view.unmount();
    }
  });

  it("navigates to the parent when back is pressed", () => {
    const navigate = vi.fn();
    render(
      <Stack path="/settings/appearance" navigate={navigate}>
        appearance
      </Stack>,
    );
    act(() => {
      screen.getByText("Settings").closest("button")?.click();
    });
    expect(navigate).toHaveBeenCalledWith("/settings");
  });
});

describe("<Presentation> — direction and presence", () => {
  it("keeps the departing level on screen through the push", async () => {
    const view = render(<Stack path="/settings">root list</Stack>);
    await settle();

    view.rerender(<Stack path="/settings/appearance">appearance</Stack>);
    // Both levels are mounted on the render that swaps them — the departing
    // one has to be there for anything to animate out.
    expect(screen.getByText("root list")).toBeTruthy();
    expect(screen.getByText("appearance")).toBeTruthy();

    await settle();
    expect(screen.queryByText("root list")).toBeNull();
  });

  it("marks a push forward and a pop back", async () => {
    const view = render(<Stack path="/settings">root</Stack>);
    await settle();

    view.rerender(<Stack path="/settings/appearance">appearance</Stack>);
    expect(
      view.container.querySelector('.pr-level[data-state="enter"]')?.getAttribute("data-direction"),
    ).toBe("forward");
    await settle();

    view.rerender(<Stack path="/settings">root</Stack>);
    expect(
      view.container.querySelector('.pr-level[data-state="enter"]')?.getAttribute("data-direction"),
    ).toBe("back");
    await settle();
  });

  it("flags a move inside one rail level so the rails presentation stays still", async () => {
    const view = render(<Stack path="/settings/access/roles">roles</Stack>);
    await settle();
    view.rerender(<Stack path="/settings/access/people">people</Stack>);

    expect(pick(view.container, ".pr-stack").hasAttribute("data-same-level")).toBe(true);
    // Direction is held from the last real move rather than flipping.
    expect(
      pick(view.container, '.pr-level[data-state="enter"]').getAttribute("data-direction"),
    ).toBe("forward");
    await settle();
  });

  /**
   * The sidebar bug. `/settings` -> `/settings/appearance` is a URL segment
   * deeper but the same sidebar list, so the rail must not move. Counting
   * segments made it a push and slid a list that should have sat still.
   */
  it("treats two rows of the root list as one level, however deep their URLs", async () => {
    const view = render(<Stack path="/settings">general</Stack>);
    await settle();
    view.rerender(<Stack path="/settings/appearance">appearance</Stack>);

    const stack = pick(view.container, ".pr-stack");
    expect(stack.getAttribute("data-level")).toBe("0");
    expect(stack.hasAttribute("data-same-level")).toBe(true);
    // The rail keeps a single entry: nothing exits, nothing enters.
    expect(view.container.querySelectorAll(".pr-rail > .pr-level")).toHaveLength(1);
    await settle();
  });

  it("does flag a real level change", async () => {
    const view = render(<Stack path="/settings/appearance">appearance</Stack>);
    await settle();
    view.rerender(<Stack path="/settings/access/roles">roles</Stack>);
    const stack = pick(view.container, ".pr-stack");
    expect(stack.getAttribute("data-level")).toBe("1");
    expect(stack.hasAttribute("data-same-level")).toBe(false);
    await settle();
  });

  it("makes the departing level inert so it cannot take focus or clicks", async () => {
    const view = render(<Stack path="/settings">root</Stack>);
    await settle();
    view.rerender(<Stack path="/settings/appearance">appearance</Stack>);
    const leaving = pick(view.container, '.pr-level[data-state="exit"]');
    expect(leaving.hasAttribute("inert")).toBe(true);
    await settle();
  });
});

describe("<AtRootLevel>", () => {
  /**
   * A root-level destination sitting in a sidebar footer while you are two
   * levels deep inside another area offers a jump out of a place the sidebar
   * is no longer showing. It belongs to the root level, so it goes when the
   * root level does.
   */
  it("shows its children at the root level and hides them above it", () => {
    const atRoot = render(
      <PresentationScope level={0}>
        <AtRootLevel>
          <a href="/settings">Settings</a>
        </AtRootLevel>
      </PresentationScope>,
    );
    expect(pick(atRoot.container, ".pr-root-only").hasAttribute("data-above-root")).toBe(false);
    atRoot.unmount();

    const pushed = render(
      <PresentationScope level={1}>
        <AtRootLevel>
          <a href="/settings">Settings</a>
        </AtRootLevel>
      </PresentationScope>,
    );
    expect(pick(pushed.container, ".pr-root-only").hasAttribute("data-above-root")).toBe(true);
  });

  it("keeps the children mounted so they animate away rather than vanish", () => {
    const view = render(
      <PresentationScope level={2}>
        <AtRootLevel>
          <a href="/settings">Settings</a>
        </AtRootLevel>
      </PresentationScope>,
    );
    // Present in the DOM, collapsed by CSS — an unmount would cut the motion.
    expect(view.container.querySelector('a[href="/settings"]')).toBeTruthy();
  });
});

describe("<Presentation> — presentation styles", () => {
  it("publishes one resolved style per breakpoint for CSS to pick from", () => {
    const { container } = render(
      <Stack path="/settings/access" present={{ base: "push", md: "rails" }}>
        access
      </Stack>,
    );
    const stack = pick(container, ".pr-stack");
    expect(stack.getAttribute("data-present")).toBe("push");
    expect(stack.getAttribute("data-present-sm")).toBe("push");
    expect(stack.getAttribute("data-present-md")).toBe("rails");
    expect(stack.getAttribute("data-present-lg")).toBe("rails");
  });

  it("renders the same markup at every width — nothing depends on a viewport read", () => {
    const a = render(<Stack path="/settings/appearance">appearance</Stack>);
    const html = a.container.innerHTML;
    a.unmount();
    // No media query is consulted, so a second render under any viewport is
    // byte-identical. This is what removes the post-hydration reflow.
    const b = render(<Stack path="/settings/appearance">appearance</Stack>);
    expect(b.container.innerHTML).toBe(html);
  });

  it("pushes a leaf and a container alike — one list opens one way", () => {
    const leaf = render(<Stack path="/settings/appearance">appearance</Stack>);
    expect(leaf.container.querySelector(".pr-stack")?.getAttribute("data-present")).toBe("push");
    leaf.unmount();

    const container = render(<Stack path="/settings/access">access</Stack>);
    expect(container.container.querySelector(".pr-stack")?.getAttribute("data-present")).toBe("push");
  });
});

describe("<Presentation> — chrome declared by the page", () => {
  it("lets a pushed page override the resolver's title", () => {
    render(
      <Stack path="/settings/access/roles">
        <PresentationTitle>Editing “Admin”</PresentationTitle>
        roles
      </Stack>,
    );
    expect(screen.getByText("Editing “Admin”")).toBeTruthy();
    // The default is still in the DOM; CSS hides it once it has company, so
    // there is no flash and no measurement.
    expect(screen.getByText("Roles")).toBeTruthy();
  });

  it("exposes dismiss to any descendant", () => {
    const navigate = vi.fn();
    function DoneButton() {
      const { dismiss, depth } = usePresentation();
      return (
        <button type="button" onClick={dismiss}>
          done at {depth}
        </button>
      );
    }
    render(
      <Stack path="/settings/access/roles" navigate={navigate}>
        <DoneButton />
      </Stack>,
    );
    expect(screen.getByText(/done at 2/)).toBeTruthy();
    act(() => screen.getByRole("button", { name: /done/ }).click());
    expect(navigate).toHaveBeenCalledWith("/settings/access");
  });

  it("throws outside a stack rather than silently doing nothing", () => {
    function Orphan() {
      usePresentation();
      return null;
    }
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Orphan />)).toThrow(/inside a <Presentation>/);
    quiet.mockRestore();
  });

  it("suppresses the built-in bar when the host has its own", () => {
    const { container } = render(
      <Stack path="/settings/appearance" bar={false}>
        appearance
      </Stack>,
    );
    expect(container.querySelector(".pr-bar")).toBeNull();
  });
});
