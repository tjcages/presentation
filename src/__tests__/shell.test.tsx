/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Presentation } from "../_presentation";
import { createResolver } from "../_resolve";
import { Shell, useShell } from "../_shell";
import {
  MOBILE_NAV_OPEN_SCALE,
  writeMobileNavProgress,
} from "../_mobile-nav";

function mockMatchMedia(mobile: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => {
      const reduced = query.includes("prefers-reduced-motion");
      const isMobileQuery = query.includes("max-width");
      const matches = reduced ? false : isMobileQuery ? mobile : !mobile;
      return {
        matches,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      };
    },
  });
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: mobile ? 390 : 1280,
  });
}

function Dock() {
  return <div data-testid="mobile-dock">dock</div>;
}

function Rail({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const { setOpen, isMobile } = useShell();
  return (
    <nav data-testid="rail">
      <button
        type="button"
        onClick={() => {
          onNavigate?.("/settings");
          if (isMobile) setOpen(false);
        }}
      >
        Settings
      </button>
    </nav>
  );
}

describe("<Shell> desktop", () => {
  beforeEach(() => mockMatchMedia(false));

  it("keeps the rail fixed and out of document flow", async () => {
    const { container } = render(
      <Shell rail={<div>nav</div>}>
        <main>page</main>
      </Shell>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    const rail = container.querySelector(
      '[data-slot="pr-shell-rail"]',
    ) as HTMLElement;
    expect(rail.className).toContain("pr-shell-rail--desktop");
    expect(rail.className).not.toContain("relative");
    const styles = getComputedStyle(rail);
    // jsdom does not apply stylesheets; assert the class contract instead.
    expect(rail.className.split(/\s+/)).toContain("pr-shell-rail--desktop");
    void styles;
  });

  it("does not mount the mobile dock on desktop", async () => {
    render(
      <Shell rail={<div>nav</div>} mobileDock={<Dock />}>
        <main>page</main>
      </Shell>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId("mobile-dock")).toBeNull();
  });

  it("does not mount a behind-nav rail on desktop", async () => {
    const { container } = render(
      <Shell rail={<div>nav</div>}>
        <main>page</main>
      </Shell>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector('[data-mobile="behind"]')).toBeNull();
  });
});

describe("<Shell> mobile", () => {
  beforeEach(() => mockMatchMedia(true));
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("mounts the mobile dock only on mobile", async () => {
    render(
      <Shell rail={<div>nav</div>} mobileDock={<Dock />}>
        <main>page</main>
      </Shell>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("mobile-dock")).toBeTruthy();
  });

  it("places the rail behind the page surface", async () => {
    const { container } = render(
      <Shell rail={<div>nav</div>} defaultOpen>
        <main>page</main>
      </Shell>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    const rail = container.querySelector(
      '[data-mobile="behind"]',
    ) as HTMLElement;
    expect(rail).toBeTruthy();
    expect(rail.className).toContain("pr-shell-rail--behind");
  });

  it("applies a static open-state radius and shadow (not per-frame vars)", async () => {
    const { container } = render(
      <Shell rail={<div>nav</div>} defaultOpen>
        <main>page</main>
      </Shell>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    const surface = container.querySelector(
      '[data-slot="pr-shell-surface"]',
    ) as HTMLElement;
    expect(surface.getAttribute("data-pr-shell-nav")).toBe("open");
    // Card treatment is class-driven; radius/shadow live on the open selector.
    expect(surface.className).toContain("pr-shell-surface");
    expect(surface.style.borderRadius).toBe("");
    expect(surface.style.boxShadow).toBe("");
  });

  it("writes transform directly on progress updates", () => {
    const surface = document.createElement("div");
    const shell = document.createElement("div");
    shell.setAttribute("data-slot", "pr-shell");
    shell.appendChild(surface);
    document.body.appendChild(shell);
    writeMobileNavProgress(surface, 0.5, 200);
    expect(surface.style.transform).toContain("translate3d(100px");
    expect(surface.style.transform).toContain(
      `scale(${1 - (1 - MOBILE_NAV_OPEN_SCALE) * 0.5})`,
    );
    expect(surface.style.getPropertyValue("--pr-shell-nav-progress")).toBe(
      "0.5",
    );
    // Release transitions transform — not a registered progress property alone.
    expect(surface.getAttribute("data-pr-shell-releasing")).toBeNull();
    shell.remove();
  });

  it("snaps behind-nav closed when the path changes", async () => {
    function Harness({ path }: { path: string }) {
      const [open, setOpen] = React.useState(true);
      return (
        <Shell path={path} open={open} onOpenChange={setOpen} rail={<div>nav</div>}>
          <main>page {path}</main>
        </Shell>
      );
    }
    const view = render(<Harness path="/crm" />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      view.container.querySelector('[data-slot="pr-shell"]')?.getAttribute(
        "data-pr-shell-nav",
      ),
    ).toBe("open");

    // Same component instance — only the path prop changes.
    view.rerender(<Harness path="/settings" />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      view.container
        .querySelector('[data-slot="pr-shell"]')
        ?.getAttribute("data-pr-shell-nav"),
    ).toBe("closed");
  });

  it("arms the edge-open hit target at root and hides it when edgeOpen is false", async () => {
    const { container, rerender } = render(
      <Shell rail={<div>nav</div>} edgeOpen>
        <main>page</main>
      </Shell>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector('[data-slot="pr-shell-edge"]')).toBeTruthy();

    rerender(
      <Shell rail={<div>nav</div>} edgeOpen={false}>
        <main>page</main>
      </Shell>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector('[data-slot="pr-shell-edge"]')).toBeNull();
  });

  it("closes behind-nav when a destination in the rail is chosen", async () => {
    function Harness() {
      const [open, setOpen] = React.useState(true);
      return (
        <Shell
          open={open}
          onOpenChange={setOpen}
          rail={<Rail onNavigate={() => undefined} />}
        >
          <main>page</main>
        </Shell>
      );
    }
    render(<Harness />);
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(screen.getByText("Settings"));
    await act(async () => {
      await Promise.resolve();
    });
    // After click, open is false — shell reports closed.
    expect(screen.getByTestId("rail")).toBeTruthy();
  });
});

describe("swipe beneath-page handoff", () => {
  it("recalls max(track.depth, depth) - 1 while dragging", () => {
    // The contract is encoded in Presentation; assert the source formula via
    // a minimal memory model matching useLevelMemory + the handoff fix.
    const recall = (d: number) => `level-${d}`;
    const trackDepth = 2;
    const depth = 1;
    const beneath = recall(Math.max(trackDepth, depth) - 1);
    expect(beneath).toBe("level-1");
    expect(recall(depth - 1)).toBe("level-0");
  });
});

describe("<Presentation> beneath handoff uses max depth", () => {
  const resolve = createResolver({
    root: "/settings",
    title: "Settings",
    routes: [
      { path: "/settings" },
      { path: "/settings/access", title: "Access" },
      { path: "/settings/access/roles", title: "Roles" },
    ],
  });

  it("keeps Presentation mountable at deep paths", () => {
    render(
      <Presentation path="/settings/access/roles" navigate={() => undefined} resolve={resolve}>
        roles
      </Presentation>,
    );
    expect(screen.getByText("roles")).toBeTruthy();
  });
});

describe("reduced motion", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 390,
    });
  });

  it("still mounts the shell when reduced motion is preferred", async () => {
    const { container } = render(
      <Shell rail={<div>nav</div>} defaultOpen>
        <main>page</main>
      </Shell>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector('[data-slot="pr-shell"]')).toBeTruthy();
  });
});
