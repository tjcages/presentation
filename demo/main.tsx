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

import { AccessRail, SettingsRail, type RailLinkProps } from "./sidebar";

/* ── The smallest router that could possibly work ────────────────────────── */

function useLocation(): [string, (path: string) => void] {
  const [path, setPath] = React.useState(() => window.location.pathname);

  React.useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = React.useCallback((next: string) => {
    window.history.pushState(null, "", next);
    setPath(next);
  }, []);

  return [path, navigate];
}

const NavigateContext = React.createContext<(path: string) => void>(() => undefined);

function Link({
  href,
  className,
  children,
  onClick,
  ...rest
}: RailLinkProps & { onClick?: (e: React.MouseEvent) => void }) {
  const navigate = React.useContext(NavigateContext);
  return (
    <a
      href={href}
      className={className}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}

/* ── Routes, matching the app's settings nav ─────────────────────────────── */

const ROUTES = [
  { path: "/settings", title: "General" },
  { path: "/settings/appearance", title: "Appearance" },
  { path: "/settings/navigation", title: "Navigation" },
  { path: "/settings/access", title: "Access" },
  { path: "/settings/access/people", title: "People" },
  { path: "/settings/access/roles", title: "Roles" },
  { path: "/settings/access/activity", title: "Activity" },
  { path: "/settings/pricing", title: "Pricing" },
  { path: "/settings/models", title: "Models" },
  { path: "/settings/integrations", title: "Integrations" },
];

/**
 * `subLevels` mirrors `SETTINGS_SUB_LEVELS`: Access is the only settings row
 * that pushes a rail level of its own. Every other row — General, Appearance,
 * Navigation, Pricing, Models, Integrations — is one entry in a single list,
 * so moving between them leaves the sidebar completely alone, however many URL
 * segments deep each one happens to be.
 */
const resolve = createResolver({
  root: "/settings",
  title: "Settings",
  routes: ROUTES,
  subLevels: [{ basePath: "/settings/access", title: "Access" }],
});

/* ── Screens ─────────────────────────────────────────────────────────────── */

function Row({ to, label, note }: { to: string; label: string; note?: string }) {
  return (
    <Link href={to} className="row">
      <span>
        <strong>{label}</strong>
        {note ? <small>{note}</small> : null}
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

function Simple({ title, lede }: { title: string; lede: string }) {
  return (
    <div className="page">
      <h2>{title}</h2>
      <p className="lede">{lede}</p>
    </div>
  );
}

function General() {
  return (
    <div className="page">
      <h1>General</h1>
      <p className="lede">
        The settings root. On a phone this level is the list; on desktop the
        rail is, so this is just the first page.
      </p>
      <div className="group">
        <Row to="/settings/access" label="Access" note="Pushes a second rail level" />
        <Row to="/settings/pricing" label="Pricing" />
        <Row to="/settings/integrations" label="Integrations" />
      </div>
    </div>
  );
}

function Access() {
  return (
    <div className="page">
      <h2>Access</h2>
      <p className="lede">
        A container. Opening one of its views pushes a second rail level — the
        rail becomes People / Roles / Activity and the pane follows, 25% against
        10%.
      </p>
      <div className="group">
        <Row to="/settings/access/people" label="People" note="A long list — scroll it, drill in, come back" />
        <Row to="/settings/access/roles" label="Roles" note="Contains a horizontally scrolling matrix" />
        <Row to="/settings/access/activity" label="Activity" />
      </div>
    </div>
  );
}

const CAPABILITIES = [
  "Read albums", "Write albums", "Publish", "Delete", "Manage songs",
  "Manage pricing", "Invite people", "Assign roles", "View analytics",
  "Export data", "Manage billing", "Manage API keys",
];
const ROLES = ["Owner", "Admin", "Editor", "Analyst", "Viewer"];

function Roles() {
  return (
    <div className="page">
      <Title>Roles</Title>
      <Actions>
        <button type="button" className="btn">New role</button>
      </Actions>
      <h2>Roles</h2>
      <p className="lede">
        <strong>The `touch-action` test.</strong> The matrix below scrolls
        sideways. Drag it horizontally — it must pan normally. Then drag from
        the screen’s left edge — that must go back instead. Both gestures are
        horizontal; only the starting point tells them apart.
      </p>

      <div className="matrix" role="region" aria-label="Capability matrix" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">Capability</th>
              {ROLES.map((r) => <th key={r} scope="col">{r}</th>)}
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES.map((cap, i) => (
              <tr key={cap}>
                <th scope="row">{cap}</th>
                {ROLES.map((role, j) => (
                  <td key={role}>{j <= 1 || (i + j) % 3 === 0 ? "●" : "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="lede">A second scroller, of cards, in case the table is too easy:</p>
      <div className="carousel">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="card">Card {i + 1}</div>
        ))}
      </div>
    </div>
  );
}

function People() {
  return (
    <div className="page">
      <h2>People</h2>
      <p className="lede">
        <strong>The scroll-restoration test.</strong> Scroll down, tap a person,
        then come back — you should land where you left, not at the top.
      </p>
      <div className="group">
        {Array.from({ length: 60 }, (_, i) => (
          <Link key={i} href="/settings/access/activity" className="row">
            <span>
              <strong>Person {i + 1}</strong>
              <small>person{i + 1}@example.com</small>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Activity() {
  return (
    <div className="page">
      <h2>Activity</h2>
      <div className="group">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="row">
            <span>
              <strong>Role changed</strong>
              <small>{i + 1} hour{i === 0 ? "" : "s"} ago</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pricing() {
  return (
    <div className="page">
      <h2>Pricing</h2>
      <p className="lede">
        <strong>The height-pin test.</strong> Scroll to the bottom, then open
        Models — a much shorter page. The document must not collapse
        mid-animation and lurch the scroll position.
      </p>
      <div className="group">
        {Array.from({ length: 50 }, (_, i) => (
          <div key={i} className="row"><span><strong>Rate {i + 1}</strong></span></div>
        ))}
      </div>
      <Row to="/settings/models" label="Open Models" note="From the very bottom" />
    </div>
  );
}

function Integrations() {
  const { dismiss, depth } = usePresentation();
  return (
    <div className="page">
      <Title>Unsaved changes</Title>
      <Actions>
        <button type="button" className="btn" onClick={dismiss}>Done</button>
      </Actions>
      <h2>Integrations</h2>
      <p className="lede">
        The bar’s title and its “Done” button are declared by <em>this page</em>,
        portalled up into the chrome. <code>usePresentation()</code> reports
        depth {depth}.
      </p>
    </div>
  );
}

function Screen({ path }: { path: string }) {
  switch (path) {
    case "/settings": return <General />;
    case "/settings/appearance": return <Simple title="Appearance" lede="Theme." />;
    case "/settings/navigation": return <Simple title="Navigation" lede="Sidebar favorites & recents." />;
    case "/settings/access": return <Access />;
    case "/settings/access/people": return <People />;
    case "/settings/access/roles": return <Roles />;
    case "/settings/access/activity": return <Activity />;
    case "/settings/pricing": return <Pricing />;
    case "/settings/models": return <Simple title="Models" lede="Which model the CRM agent uses." />;
    case "/settings/integrations": return <Integrations />;
    default: return <div className="page"><h2>Not found</h2></div>;
  }
}

/* ── Harness ─────────────────────────────────────────────────────────────── */

/**
 * `admin-kit`'s NavStack renders its back affordance at the top of the left
 * rail on any pushed level. Same classes, same chevron.
 */
function RailBack({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-foreground-300 hover:text-foreground-100 -ml-1 mb-3 inline-flex w-full min-w-0 items-center gap-1 rounded-md px-1 py-1 text-sm font-medium transition-colors"
    >
      <ChevronLeft className="size-4 shrink-0" />
      <span className="truncate text-left">{label}</span>
    </button>
  );
}

const PRESETS: { label: string; value: PresentSpec }[] = [
  { label: "push · rails at md (default)", value: { base: "push", md: "rails" } },
  { label: "rails everywhere", value: "rails" },
  { label: "push everywhere", value: "push" },
  { label: "push · fade at md", value: { base: "push", md: "fade" } },
];

function App() {
  const [path, navigate] = useLocation();
  const [preset, setPreset] = React.useState(0);

  React.useEffect(() => {
    if (!path.startsWith("/settings")) navigate("/settings");
  }, [path, navigate]);

  const entry = resolve(path);
  const spec = PRESETS[preset]?.value ?? "push";

  /**
   * Rail content per level, mirroring how `_app-chrome.tsx` builds
   * `sidebarScreens`: the settings categories, and — once inside a settings
   * sub-level — that level's sibling views under a back affordance.
   */
  const rail = React.useCallback(
    (e: StackEntry) => {
      if (e.level >= 1) {
        return (
          <>
            <RailBack label="Access" onClick={() => navigate("/settings/access")} />
            <AccessRail pathname={path} Link={Link} />
          </>
        );
      }
      return <SettingsRail pathname={path} Link={Link} />;
    },
    [path, navigate],
  );

  return (
    <NavigateContext.Provider value={navigate}>
      <header className="chrome">
        <span className="brand">@tjcages/presentation</span>
        <select
          value={preset}
          onChange={(e) => setPreset(Number(e.target.value))}
          aria-label="Presentation style"
        >
          {PRESETS.map((p, i) => (
            <option key={p.label} value={i}>{p.label}</option>
          ))}
        </select>
        <code className="hud">depth {entry?.depth ?? "–"}</code>
      </header>

      <Presentation
        path={path}
        navigate={navigate}
        resolve={resolve}
        present={spec}
        Link={Link}
        rail={rail}
      >
        <Screen path={path} />
      </Presentation>
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
