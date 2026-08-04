/**
 * A demo whose only job is to make the design claims falsifiable.
 *
 * Every screen here exists to stress one of them: a nested horizontal
 * scroller for the `touch-action` claim, a long list for scroll restoration,
 * a long-to-short push for the height pin, a leaf for `auto` → drawer. The
 * router is twenty lines of `history.pushState` — which is the point, since a
 * package that claims to be router-free should be provable against the
 * smallest possible one.
 */

import * as React from "react";
import { createRoot } from "react-dom/client";

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

const NavigateContext = React.createContext<(path: string) => void>(() => {});

function Link({
  href,
  className,
  children,
  onClick,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const navigate = React.useContext(NavigateContext);
  return (
    <a
      href={href}
      className={className}
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

/* ── The route table ─────────────────────────────────────────────────────── */

const ROUTES = [
  { path: "/settings" },
  { path: "/settings/appearance", title: "Appearance" },
  { path: "/settings/long", title: "A very long page" },
  { path: "/settings/short", title: "A very short page" },
  { path: "/settings/notifications", title: "Notifications" },
  { path: "/settings/access", title: "Access & permissions" },
  { path: "/settings/access/people", title: "People" },
  { path: "/settings/access/roles", title: "Roles" },
  { path: "/settings/access/activity", title: "Activity" },
];

const resolve = createResolver({
  root: "/settings",
  title: "Settings",
  routes: ROUTES,
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

function Index() {
  return (
    <div className="page">
      <h1>Settings</h1>
      <p className="lede">
        Each row below exercises one claim. Open it on a phone and drag from the
        left edge.
      </p>
      <div className="group">
        <Row to="/settings/access" label="Access & permissions" note="A container — pushes, so back means “up one”" />
        <Row to="/settings/appearance" label="Appearance" note="A leaf — auto presents it as a drawer" />
      </div>
      <div className="group">
        <Row to="/settings/long" label="A very long page" note="Scroll it, go back, come back — position is restored" />
        <Row to="/settings/short" label="A very short page" note="Push here from the long page: the height must not snap" />
        <Row to="/settings/notifications" label="Notifications" note="Page-declared title and actions" />
      </div>
    </div>
  );
}

function Appearance() {
  return (
    <div className="page">
      <h2>Appearance</h2>
      <p className="lede">
        Nothing is nested under this path, so <code>present="auto"</code>{" "}
        resolves it to a drawer — it rises from the bottom edge rather than
        pushing sideways.
      </p>
      <div className="group">
        {["System", "Light", "Dark"].map((t) => (
          <label key={t} className="row">
            <span><strong>{t}</strong></span>
            <input type="radio" name="theme" defaultChecked={t === "System"} />
          </label>
        ))}
      </div>
    </div>
  );
}

function Access() {
  return (
    <div className="page">
      <h2>Access &amp; permissions</h2>
      <p className="lede">
        A container: it has levels beneath it, so it pushes. Its back button
        goes up to Settings rather than closing the section.
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

      <p className="lede">
        A second scroller, of cards, in case the table is too easy:
      </p>
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

function LongPage() {
  return (
    <div className="page">
      <h2>A very long page</h2>
      <p className="lede">
        <strong>The height-pin test.</strong> Scroll to the bottom, then open the
        short page below. The document must not collapse mid-animation and
        lurch the scroll position.
      </p>
      <div className="group">
        {Array.from({ length: 50 }, (_, i) => (
          <div key={i} className="row"><span><strong>Row {i + 1}</strong></span></div>
        ))}
      </div>
      <Row to="/settings/short" label="Push to the short page" note="From the very bottom" />
    </div>
  );
}

function ShortPage() {
  return (
    <div className="page">
      <h2>A very short page</h2>
      <p className="lede">That’s all there is.</p>
    </div>
  );
}

function Notifications() {
  const { dismiss, depth } = usePresentation();
  const [saved, setSaved] = React.useState(false);
  return (
    <div className="page">
      <Title>Unsaved changes</Title>
      <Actions>
        <button type="button" className="btn" onClick={() => { setSaved(true); dismiss(); }}>
          Done
        </button>
      </Actions>
      <h2>Notifications</h2>
      <p className="lede">
        The bar’s title and its “Done” button are declared by <em>this page</em>,
        portalled up into the chrome — the resolver’s title (“Notifications”) is
        still in the DOM underneath, hidden by CSS once it has company.
        <code>usePresentation()</code> reports depth {depth}.{saved ? " Saved." : ""}
      </p>
    </div>
  );
}

function Screen({ path }: { path: string }) {
  switch (path) {
    case "/settings": return <Index />;
    case "/settings/appearance": return <Appearance />;
    case "/settings/access": return <Access />;
    case "/settings/access/people": return <People />;
    case "/settings/access/roles": return <Roles />;
    case "/settings/access/activity": return <Activity />;
    case "/settings/long": return <LongPage />;
    case "/settings/short": return <ShortPage />;
    case "/settings/notifications": return <Notifications />;
    default: return <div className="page"><h2>Not found</h2></div>;
  }
}

/* ── Harness ─────────────────────────────────────────────────────────────── */

const CATEGORIES = [
  { to: "/settings/access", label: "Access & permissions" },
  { to: "/settings/appearance", label: "Appearance" },
  { to: "/settings/long", label: "A very long page" },
  { to: "/settings/short", label: "A very short page" },
  { to: "/settings/notifications", label: "Notifications" },
];

const ACCESS_VIEWS = [
  { to: "/settings/access/people", label: "People" },
  { to: "/settings/access/roles", label: "Roles" },
  { to: "/settings/access/activity", label: "Activity" },
];

function RailItem({ to, label, path }: { to: string; label: string; path: string }) {
  return (
    <Link href={to} className={`rail-item${path.startsWith(to) ? " is-active" : ""}`}>
      {label}
    </Link>
  );
}

/**
 * Rail content for the current level.
 *
 * This is the half that was missing: at depth 2 the rail is a *different list*
 * — the views inside Access — and it slides in as the pane does, 25% against
 * the pane's 10%. A rail that never changes and never moves is not the
 * two-rail presentation, it is a static sidebar next to an animating page.
 *
 * Mirrors how admin swaps `SettingsNav` for `SectionLevelNav`.
 */
function RailContent({ entry, path }: { entry: StackEntry; path: string }) {
  const inAccess = entry.depth >= 2 && path.startsWith("/settings/access/");

  if (inAccess) {
    return (
      <>
        <Link href="/settings/access" className="rail-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Access &amp; permissions
        </Link>
        <div className="rail-group">
          {ACCESS_VIEWS.map((item) => (
            <RailItem key={item.to} {...item} path={path} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <Link href="/settings" className={`rail-title${path === "/settings" ? " is-active" : ""}`}>
        Settings
      </Link>
      <div className="rail-group">
        {CATEGORIES.map((item) => (
          <RailItem key={item.to} {...item} path={path} />
        ))}
      </div>
    </>
  );
}

const PRESETS: { label: string; value: PresentSpec }[] = [
  { label: "push · rails at md (default)", value: { base: "push", md: "rails" } },
  { label: "rails everywhere", value: "rails" },
  { label: "push everywhere", value: "push" },
  { label: "push · fade at md", value: { base: "push", md: "fade" } },
  { label: "drawer (explicit, unfinished)", value: "drawer" },
];

function App() {
  const [path, navigate] = useLocation();
  const [preset, setPreset] = React.useState(0);

  React.useEffect(() => {
    if (!path.startsWith("/settings")) navigate("/settings");
  }, [path, navigate]);

  const entry = resolve(path);
  const spec = PRESETS[preset]?.value ?? "push";

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
        rail={(e) => <RailContent entry={e} path={path} />}
      >
        <Screen path={path} />
      </Presentation>
    </NavigateContext.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
