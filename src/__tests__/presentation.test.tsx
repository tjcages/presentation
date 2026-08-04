import { act, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { Presentation } from "../_presentation";
import { PresentationTitle, usePresentation } from "../_chrome";
import { createResolver } from "../_resolve";

const resolve = createResolver({
  root: "/settings",
  title: "Settings",
  routes: [
    { path: "/settings" },
    { path: "/settings/appearance", title: "Appearance" },
    { path: "/settings/access", title: "Access" },
    { path: "/settings/access/roles", title: "Roles" },
  ],
});

function Stack({
  path,
  navigate = () => {},
  children,
  ...rest
}: {
  path: string;
  navigate?: (p: string) => void;
  children: React.ReactNode;
} & Partial<React.ComponentProps<typeof Presentation>>) {
  return (
    <Presentation path={path} navigate={navigate} resolve={resolve} {...rest}>
      {children}
    </Presentation>
  );
}

/** jsdom runs no animations, so exits settle on the next microtask. */
const settle = () => act(async () => { await Promise.resolve(); });

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

  it("navigates to the parent when back is pressed", () => {
    const navigate = vi.fn();
    render(
      <Stack path="/settings/appearance" navigate={navigate}>
        appearance
      </Stack>,
    );
    act(() => {
      screen.getByText("Settings").closest("button")!.click();
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
      view.container.querySelector('.pr-level[data-state="enter"]')!.getAttribute("data-direction"),
    ).toBe("forward");
    await settle();

    view.rerender(<Stack path="/settings">root</Stack>);
    expect(
      view.container.querySelector('.pr-level[data-state="enter"]')!.getAttribute("data-direction"),
    ).toBe("back");
  });

  it("does not re-animate a same-depth sibling swap as a push", async () => {
    const view = render(<Stack path="/settings/access/roles">roles</Stack>);
    await settle();
    view.rerender(<Stack path="/settings/access/people">people</Stack>);
    // Same depth: neither forward nor backward, so the direction is held from
    // the last real move rather than flipping the list out and back in.
    const level = view.container.querySelector('.pr-level[data-state="enter"]')!;
    expect(level.getAttribute("data-direction")).toBe("forward");
  });

  it("makes the departing level inert so it cannot take focus or clicks", async () => {
    const view = render(<Stack path="/settings">root</Stack>);
    await settle();
    view.rerender(<Stack path="/settings/appearance">appearance</Stack>);
    const leaving = view.container.querySelector('.pr-level[data-state="exit"]')!;
    expect(leaving.hasAttribute("inert")).toBe(true);
  });
});

describe("<Presentation> — presentation styles", () => {
  it("publishes one resolved style per breakpoint for CSS to pick from", () => {
    const { container } = render(
      <Stack path="/settings/access" present={{ base: "push", md: "rails" }}>
        access
      </Stack>,
    );
    const stack = container.querySelector(".pr-stack")!;
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

  it("auto-drawers a leaf and auto-pushes a container", () => {
    const leaf = render(<Stack path="/settings/appearance">appearance</Stack>);
    expect(leaf.container.querySelector(".pr-stack")!.getAttribute("data-present")).toBe("drawer");
    leaf.unmount();

    const container = render(<Stack path="/settings/access">access</Stack>);
    expect(container.container.querySelector(".pr-stack")!.getAttribute("data-present")).toBe("push");
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
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
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
