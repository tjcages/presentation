# @tjcages/presentation

URL-derived push navigation. An iOS-style page push on a phone, synced rails on
a desktop, a drawer for a single view — chosen per breakpoint, in CSS.

Router-free: the host supplies the current path, a way to navigate, and a
resolver saying where a path sits in the stack. No runtime dependencies.

## Install

```bash
pnpm add @tjcages/presentation
```

React and React DOM 18 or newer are peer dependencies. Import the stylesheet
once in the host application, as shown below.

```tsx
import { Presentation, createResolver } from "@tjcages/presentation";
import "@tjcages/presentation/presentation.css";

const resolve = createResolver({
  root: "/settings",
  title: "Settings",
  routes: [
    { path: "/settings/appearance", title: "Appearance" },
    { path: "/settings/access", title: "Access & permissions" },
    { path: "/settings/access/roles", title: "Roles" },
  ],
});

export default function Layout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Presentation
      path={pathname}
      navigate={router.push}
      resolve={resolve}
      present={{ base: "push", md: "rails" }}
      Link={Link}
    >
      {children}
    </Presentation>
  );
}
```

## Why depth comes from the URL

`/settings` is depth 0, `/settings/appearance` is 1, `/settings/access/roles`
is 2. Nothing is held in state, so hardware back, the browser's own edge-swipe,
and deep links all work without this package being told they happened. A link
straight to depth 2 opens at depth 2, with a back affordance that goes _up_ a
level rather than out of the section.

## Presentation styles

`push` · `rails` · `drawer` · `fade` · `none` — or `auto`.

`present` takes one style or a breakpoint map:

```tsx
present={{ base: "push", md: "rails" }}
```

Breakpoints resolve in **CSS**, not JavaScript. There is no media-query hook,
no server-versus-client snapshot to guess wrong, and no reflow after
hydration — the markup is byte-identical at every width, and only which
keyframes apply changes. A resize or a rotate never remounts the page.

`auto` currently resolves to `push`, so every row in one navigation list opens
the same way. A route can opt into another style explicitly:

```ts
createResolver({
  root: "/settings",
  routes,
  presentFor: (path) => (path === "/settings/profile" ? "drawer" : undefined),
});
```

## The back gesture

A left-edge drag pops, tracking the finger, and springs to rest on release.

**It declares no `touch-action` anywhere.** The obvious build — `touch-action:
pan-y` on the dragged panel — works and silently breaks every horizontally
scrollable descendant, because `touch-action` resolves as the intersection down
the ancestor chain. A wide table or a capability matrix nested anywhere inside
stops panning sideways, and nothing in the CSS says why.

Instead the gesture hit-tests the touch against the screen edge, runs its own
direction lock, and calls `preventDefault()` only once it is certain the
gesture is horizontal and started at the edge. Every other touch is never
intercepted, so nested scrollers behave as if this package were not installed.

Motion is CSS. The drag writes a registered custom property; the release
transitions that same property with a sampled spring as its timing function,
which is what lets the pop resume from wherever the finger stopped instead of
restarting from zero.

## Chrome the page declares

The resolver's title is the default. A pushed page can override it from inside
itself, where the data it wants to show already is:

```tsx
import { Title, Actions, usePresentation } from "@tjcages/presentation";

function RoleEditor({ role }) {
  const { dismiss } = usePresentation();
  return (
    <>
      <Title>{role.name}</Title>
      <Actions>
        <button onClick={dismiss}>Done</button>
      </Actions>
      …
    </>
  );
}
```

## Theming

Every colour, size, and duration is a `--pr-*` custom property with a neutral
default. Nothing hardcodes a palette. Override from your own theme:

```css
.pr-stack {
  --pr-surface: var(--background);
  --pr-backdrop: rgb(0 0 0 / 0.12);
  --pr-shadow: -12px 0 28px -8px rgb(0 0 0 / 0.25);
}
```

## What it handles

- Scroll position restored per level on the way back up, and reset on the way
  in.
- The stack's height pinned while two levels overlap, so pushing from a long
  page to a short one does not collapse the document mid-animation.
- A departing level kept mounted for its animation, `inert`, and wrapped in an
  error boundary — route data it reads may already be gone, and without the
  boundary that throw escapes to the app.
- `prefers-reduced-motion`: the transition goes, the navigation and the gesture
  stay.

## Known limits

- **A back-swipe from a deep link reveals the backdrop, not the parent page.**
  The level being swiped toward is normally the one that was on screen a moment
  ago, and is remembered. Arriving straight at depth 2 leaves nothing to
  remember. The alternative is speculatively fetching the parent route on
  touch-down, at a request per aborted swipe.
- **Scroll memory tracks the window scroller.** A level that scrolls inside its
  own container is not restored.
- `drawer` supplies the motion style, but not sheet policy such as detents, a
  scrim, or a drag-to-dismiss gesture. Hosts that opt into it own those details.

## Development

```bash
pnpm install
pnpm check
pnpm demo
```

`pnpm check` runs the behavior suite, typecheck, production build, and a dry
run of the exact npm tarball. The tarball check fails if demo or nested source
output leaks into the package.

## API

| Prop            |                                                         |
| --------------- | ------------------------------------------------------- |
| `path`          | Current path, from the host router.                     |
| `navigate`      | `(path) => void`. Used by back and by a released swipe. |
| `resolve`       | `(path) => StackEntry \| null`. See `createResolver`.   |
| `children`      | The level's content, from the host router.              |
| `present`       | Style or breakpoint map. Default `"auto"`.              |
| `Link`          | Host link component, so back is a real anchor.          |
| `renderBar`     | Replace the default bar. Return `null` for none.        |
| `bar`           | `false` suppresses the built-in bar.                    |
| `swipe`         | Default `true`.                                         |
| `restoreScroll` | Default `true`.                                         |

## Demo

<https://presentation-demo.ty-944.workers.dev>

A reproduction of Totem admin's sidebar and settings area, driven by this
package. Deploy it with:

```bash
pnpm demo:deploy
```

Static assets on Cloudflare Workers. `not_found_handling:
"single-page-application"` is load-bearing — the demo routes with
`history.pushState`, so paths like `/crm` and `/settings/access` exist only in
the client. Without it the edge 404s anyone who opens a link instead of
clicking their way in, which is exactly what testing on a phone does.
