/**
 * A demo whose only job is to make the design claims falsifiable.
 *
 * The sidebar is Totem admin's settings sidebar, reproduced class-for-class in
 * `sidebar.tsx`. The routes match `SETTINGS_NAV` and `ACCESS_SECTIONS`. The
 * router is twenty lines of `history.pushState` — which is the point, since a
 * package that claims to be router-free should be provable against the
 * smallest possible one.
 */

import * as React from "react";
import { createRoot } from "react-dom/client";
import { ChevronLeft } from "@untitledui/icons";

import {
  Actions,
  Presentation,
  Title,
  createResolver,
  usePresentation,
  type PresentSpec,
  type StackEntry,
} from "@tjcages/presentation";
import "@tjcages/presentation/presentation.css";
import "./demo.css";

import { AppChrome } from "./chrome";
import type { AdminKitLinkProps } from "./admin-kit/context";
import { SettingsShell } from "./kit";
import {
  AccessPage,
  AppearancePage,
  GeneralPage,
  IntegrationsPage,
  ModelsPage,
  NavigationPage,
  PricingPage,
  toAccessSection,
  type AccessSection,
} from "./pages";

/* ── The smallest router that could possibly work ────────────────────────── */

function useLocation(): [string, string, (href: string) => void] {
  const read = () => window.location.pathname + window.location.search;
  const [href, setHref] = React.useState(read);

  React.useEffect(() => {
    const onPop = () => setHref(read());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = React.useCallback((next: string) => {
    window.history.pushState(null, "", next);
    setHref(next);
  }, []);

  const [pathname = "/", search = ""] = href.split(/(?=\?)/);
  return [pathname, search, navigate];
}

const NavigateContext = React.createContext<(path: string) => void>(() => undefined);

/**
 * The kit's link contract: `to`, and every other anchor prop spread through —
 * `SidebarMenuButton asChild` merges `data-active`, tooltip handlers and the
 * rest onto it via Radix `Slot`, so swallowing them breaks active state.
 */
function Link({ to, end, children, ...rest }: AdminKitLinkProps) {
  const navigate = React.useContext(NavigateContext);
  void end;
  return (
    <a
      href={to}
      {...rest}
      onClick={(e) => {
        rest.onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

/* ── Routes — exactly the app's ─────────────────────────────────────────── */

/**
 * `apps/admin/src/app/settings/**` on main. Seven routes, no more.
 *
 * Access's People / Agents / Roles / Activity are `?tab=` views on the single
 * `/settings/access` route, not routes of their own — so switching between
 * them changes no path, the stack sees no navigation, and nothing animates.
 * That is the app's behaviour, and inventing nested routes for them was a
 * fabrication that changed how the whole level behaves.
 */
const ROUTES = [
  { path: "/settings", title: "General" },
  { path: "/settings/appearance", title: "Appearance" },
  { path: "/settings/navigation", title: "Navigation" },
  { path: "/settings/access", title: "Access" },
  { path: "/settings/pricing", title: "Pricing" },
  { path: "/settings/models", title: "Models" },
  { path: "/settings/integrations", title: "Integrations" },
];

/**
 * `subLevels` mirrors `SETTINGS_SUB_LEVELS`: Access is the only settings row
 * that pushes a rail level of its own. Every other row is one entry in a
 * single list, so moving between them leaves the sidebar alone.
 */
const resolve = createResolver({
  root: "/settings",
  title: "Settings",
  routes: ROUTES,
  subLevels: [{ basePath: "/settings/access", title: "Access" }],
});

function Screen({ path, section }: { path: string; section: AccessSection }) {
  switch (path) {
    case "/settings": return <GeneralPage />;
    case "/settings/appearance": return <AppearancePage />;
    case "/settings/navigation": return <NavigationPage />;
    case "/settings/access": return <AccessPage section={section} />;
    case "/settings/pricing": return <PricingPage />;
    case "/settings/models": return <ModelsPage />;
    case "/settings/integrations": return <IntegrationsPage />;
    default: return <SettingsShell title="Not found"><span /></SettingsShell>;
  }
}

/* ── Harness ─────────────────────────────────────────────────────────────── */

const PRESETS: { label: string; value: PresentSpec }[] = [
  { label: "push · rails at md (default)", value: { base: "push", md: "rails" } },
  { label: "push everywhere", value: "push" },
  { label: "rails everywhere", value: "rails" },
];

function App() {
  const [path, search, navigate] = useLocation();
  const [preset, setPreset] = React.useState(0);

  React.useEffect(() => {
    if (!path.startsWith("/settings")) navigate("/settings");
  }, [path, navigate]);

  const section = toAccessSection(new URLSearchParams(search).get("tab"));
  const spec = PRESETS[preset]?.value ?? "push";

  return (
    <NavigateContext.Provider value={navigate}>
      <div className="fixed right-3 top-3 z-[100] flex items-center gap-2 text-xs">
        <select
          value={preset}
          onChange={(e) => setPreset(Number(e.target.value))}
          aria-label="Presentation style"
          className="border-border-100 bg-background-100 text-foreground-100 rounded-md border px-2 py-1"
        >
          {PRESETS.map((p, i) => (
            <option key={p.label} value={i}>{p.label}</option>
          ))}
        </select>
      </div>

      <AppChrome pathname={path} navigate={navigate} Link={Link}>
        <Presentation
          path={path}
          navigate={navigate}
          resolve={resolve}
          present={spec}
          bar={false}
        >
          <Screen path={path} section={section} />
        </Presentation>
      </AppChrome>
    </NavigateContext.Provider>
  );
}

// Cached across hot reloads; a second `createRoot` on the same container warns
// and mounts a competing tree.
const container = document.getElementById("root")!;
const store = window as unknown as { __demoRoot?: ReturnType<typeof createRoot> };
store.__demoRoot ??= createRoot(container);
store.__demoRoot.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
