import { describe, expect, it } from "vitest";

import { createResolver, humanize, resolvePresentation } from "../_resolve";
import type { StackEntry } from "../_resolve";

// The shape this package was extracted to serve: a settings area whose root is
// an index of categories, one of which has sibling views under it.
const SETTINGS = [
  { path: "/settings" },
  { path: "/settings/general", title: "General" },
  { path: "/settings/appearance", title: "Appearance" },
  { path: "/settings/access", title: "Access & permissions" },
  { path: "/settings/access/people", title: "People" },
  { path: "/settings/access/roles", title: "Roles" },
  { path: "/settings/access/activity", title: "Activity" },
];

const resolve = createResolver({ root: "/settings", title: "Settings", routes: SETTINGS });

describe("createResolver — depth from the URL", () => {
  it("puts the root at depth 0 with no parent", () => {
    expect(resolve("/settings")).toMatchObject({
      depth: 0,
      path: "/settings",
      title: "Settings",
    });
    expect(resolve("/settings")).not.toHaveProperty("parent");
  });

  it("reads depth off the segments", () => {
    expect(resolve("/settings/appearance")).toMatchObject({ depth: 1 });
    expect(resolve("/settings/access/roles")).toMatchObject({ depth: 2 });
  });

  it("points a deep link's back affordance up a level, not out of the area", () => {
    expect(resolve("/settings/access/roles")?.parent).toEqual({
      path: "/settings/access",
      title: "Access & permissions",
    });
  });

  it("declines paths outside the root", () => {
    expect(resolve("/dashboard")).toBeNull();
    // A sibling that merely shares a prefix is not inside the stack.
    expect(resolve("/settings-v2/general")).toBeNull();
  });

  it("ignores a trailing slash, a query, and a hash", () => {
    const target = { depth: 1, path: "/settings/appearance" };
    expect(resolve("/settings/appearance/")).toMatchObject(target);
    expect(resolve("/settings/appearance?tab=theme")).toMatchObject(target);
    expect(resolve("/settings/appearance#colors")).toMatchObject(target);
  });
});

describe("createResolver — titles", () => {
  it("prefers the route registry, so a rename renames the back button too", () => {
    expect(resolve("/settings/access")?.title).toBe("Access & permissions");
  });

  it("humanizes a path no registry claims", () => {
    expect(resolve("/settings/audit-log")?.title).toBe("Audit log");
  });

  it("lets titleFor have the last word", () => {
    const custom = createResolver({
      root: "/settings",
      routes: SETTINGS,
      titleFor: (p) => (p === "/settings/access" ? "Access" : undefined),
    });
    expect(custom("/settings/access")?.title).toBe("Access");
    expect(custom("/settings/appearance")?.title).toBe("Appearance");
  });

  it("humanizes dashes and underscores", () => {
    expect(humanize("access-log")).toBe("Access log");
    expect(humanize("api_keys")).toBe("Api keys");
  });
});

describe("createResolver — rail levels", () => {
  const levelled = createResolver({
    root: "/settings",
    title: "Settings",
    routes: SETTINGS,
    subLevels: [{ basePath: "/settings/access", title: "Access" }],
  });

  /**
   * The bug this exists to prevent: `/settings` and `/settings/appearance` are
   * two rows of one sidebar list. Counting URL segments makes the second look
   * one level deeper, so the rail slides when it should sit perfectly still.
   */
  it("keeps every row of the root list on one level, whatever its URL depth", () => {
    expect(levelled("/settings")?.level).toBe(0);
    expect(levelled("/settings/appearance")?.level).toBe(0);
    expect(levelled("/settings/access")?.level).toBe(1);
  });

  it("still reports URL depth separately, for the phone's push", () => {
    expect(levelled("/settings")?.depth).toBe(0);
    expect(levelled("/settings/appearance")?.depth).toBe(1);
    expect(levelled("/settings/access/roles")?.depth).toBe(2);
  });

  it("puts a declared sub-level and everything under it one level in", () => {
    expect(levelled("/settings/access")?.level).toBe(1);
    expect(levelled("/settings/access/people")?.level).toBe(1);
    expect(levelled("/settings/access/roles")?.level).toBe(1);
  });

  it("falls back to URL depth when no sub-levels are declared", () => {
    expect(resolve("/settings/appearance")?.level).toBe(1);
    expect(resolve("/settings/access/roles")?.level).toBe(2);
  });
});

describe("createResolver — leaf detection", () => {
  it("marks a level with nothing nested under it as a leaf", () => {
    expect(resolve("/settings/appearance")?.leaf).toBe(true);
    expect(resolve("/settings/access/roles")?.leaf).toBe(true);
  });

  it("marks a container as not a leaf", () => {
    expect(resolve("/settings/access")?.leaf).toBe(false);
    expect(resolve("/settings")?.leaf).toBe(false);
  });

  it("declines to guess when given no route list", () => {
    const bare = createResolver({ root: "/settings" });
    expect(bare("/settings/appearance")?.leaf).toBeUndefined();
  });
});

describe("resolvePresentation", () => {
  const entry = (over: Partial<StackEntry> = {}): StackEntry => ({
    depth: 1,
    level: 1,
    path: "/settings/appearance",
    title: "Appearance",
    ...over,
  });

  it("cascades a breakpoint map, wider inheriting from narrower", () => {
    expect(resolvePresentation({ base: "push", md: "rails" }, entry())).toEqual({
      base: "push",
      sm: "push",
      md: "rails",
      lg: "rails",
    });
  });

  it("applies a bare style at every breakpoint", () => {
    expect(resolvePresentation("fade", entry())).toEqual({
      base: "fade",
      sm: "fade",
      md: "fade",
      lg: "fade",
    });
  });

  it("resolves auto to a push, leaf or not — one list must not open two ways", () => {
    expect(resolvePresentation("auto", entry({ leaf: true })).base).toBe("push");
    expect(resolvePresentation("auto", entry({ leaf: false })).base).toBe("push");
    expect(resolvePresentation("auto", entry()).base).toBe("push");
    expect(resolvePresentation("auto", entry({ depth: 0, leaf: true })).base).toBe("push");
  });

  it("still lets a host ask for a drawer per route, explicitly", () => {
    expect(resolvePresentation("auto", entry({ present: "drawer" })).base).toBe("drawer");
  });

  it("lets a level override the stack, which is how one route becomes a drawer", () => {
    const overridden = entry({ present: "drawer" });
    expect(resolvePresentation({ base: "push", md: "rails" }, overridden)).toEqual({
      base: "drawer",
      sm: "drawer",
      md: "drawer",
      lg: "drawer",
    });
  });

  it("mixes auto into a breakpoint map", () => {
    const spec = { base: "auto", md: "rails" } as const;
    expect(resolvePresentation(spec, entry({ leaf: true }))).toEqual({
      base: "push",
      sm: "push",
      md: "rails",
      lg: "rails",
    });
  });

  it("falls back to auto for a stack that declares nothing", () => {
    expect(resolvePresentation(undefined, entry({ leaf: true })).base).toBe("push");
  });

  it("handles a null entry — a path outside the stack", () => {
    expect(resolvePresentation("auto", null).base).toBe("push");
  });
});
