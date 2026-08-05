/**
 * Chrome the pushed page declares for itself.
 *
 * A stack root that owns every title needs a registry mapping paths to
 * strings, kept in step with the routes by hand. The alternative — the one
 * SwiftUI takes with `.navigationTitle()` and `.toolbar {}` — is to let the
 * page that is being pushed say what its own bar contains, from inside itself,
 * where the data it wants to put there already is.
 *
 * Both work here. A resolver's title is the default; anything a page renders
 * through [[PresentationTitle]] or [[PresentationActions]] wins, because it is
 * portalled into the bar and the default hides itself when it has company
 * (see `.pr-bar-title-default:not(:only-child)`).
 */

import * as React from "react";
import { createPortal } from "react-dom";

import type { StackEntry } from "./_resolve";

interface BarSlots {
  title: HTMLElement | null;
  actions: HTMLElement | null;
  setTitle: (el: HTMLElement | null) => void;
  setActions: (el: HTMLElement | null) => void;
}

const SlotContext = React.createContext<BarSlots | null>(null);

/**
 * Owns the bar's portal targets.
 *
 * This has to sit *above* both the bar and the page, not inside the bar — the
 * page is where `<Presentation.Title>` is rendered, and a provider that only
 * wrapped the bar would leave it with nowhere to portal to.
 */
export function BarSlots({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = React.useState<HTMLElement | null>(null);
  const [actions, setActions] = React.useState<HTMLElement | null>(null);
  const value = React.useMemo<BarSlots>(
    () => ({ title, actions, setTitle, setActions }),
    [title, actions],
  );
  return <SlotContext.Provider value={value}>{children}</SlotContext.Provider>;
}

export interface PresentationContextValue {
  /** Where the current level sits, or null outside the stack. */
  entry: StackEntry | null;
  /** Go up one level. No-op at the root. */
  dismiss: () => void;
  /** Navigate to any path, through the host's router. */
  present: (path: string) => void;
  /** 0 at the root of the stack. */
  depth: number;
}

const PresentationContext = React.createContext<PresentationContextValue | null>(null);

export const PresentationProvider = PresentationContext.Provider;

/**
 * Publish the stack's level to things that sit *outside* it.
 *
 * A sidebar's footer is the case this exists for. It is a sibling of the
 * levels, not a descendant, so it cannot read the stack's context — and
 * without it a root-level destination like "Settings" keeps sitting there
 * while you are two levels deep inside Roster, offering a jump out of a place
 * the sidebar is no longer showing.
 *
 * Takes the level directly rather than a path and a resolver: a host that
 * renders a stack already knows how deep it is, and asking it to re-derive
 * that through a second code path is how the two drift apart.
 */
export function PresentationScope({
  level,
  children,
}: {
  level: number;
  children: React.ReactNode;
}) {
  const value = React.useMemo<PresentationContextValue>(
    () => ({
      entry: null,
      depth: level,
      dismiss: () => undefined,
      present: () => undefined,
    }),
    [level],
  );
  return <PresentationContext.Provider value={value}>{children}</PresentationContext.Provider>;
}

/**
 * Show `children` only while the stack is at its root level.
 *
 * Above the root they animate away rather than vanishing — the same 25% slide
 * and fade the rails use, over a collapsing `grid-template-rows` so the rows
 * below close the gap instead of jumping into it.
 *
 * Renders nothing at all outside a stack or a [[PresentationScope]], since
 * "is this the root level" has no answer there.
 */
export function AtRootLevel({ children }: { children: React.ReactNode }) {
  const scope = React.useContext(PresentationContext);
  const above = (scope?.depth ?? 0) > 0;
  return (
    <div className="pr-root-only" data-above-root={above ? "" : undefined}>
      <div>{children}</div>
    </div>
  );
}

/**
 * Reach the enclosing stack from anywhere inside a pushed page — the
 * equivalent of SwiftUI's `@Environment(\.dismiss)`.
 *
 * Throws outside a stack rather than returning null: a "Done" button whose
 * dismiss silently does nothing is a worse failure than one that never
 * shipped.
 */
export function usePresentation(): PresentationContextValue {
  const value = React.useContext(PresentationContext);
  if (!value) {
    throw new Error("usePresentation must be called inside a <Presentation> stack.");
  }
  return value;
}

export interface NavBarProps {
  entry: StackEntry;
  onBack: () => void;
  /** Host link component, so back is a real anchor and not a scripted button. */
  Link?: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
  }>;
  backIcon?: React.ReactNode;
}

const ChevronLeft = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

/**
 * The default bar: back to the parent on the leading side, title centred,
 * page-supplied actions trailing.
 *
 * Back is an anchor when a `Link` is supplied. That matters beyond
 * tidiness — an anchor can be middle-clicked, long-pressed, and read by a
 * screen reader as the destination it is, none of which a button that calls
 * `history.back()` can offer.
 */
export function NavBar({ entry, onBack, Link, backIcon = ChevronLeft }: NavBarProps) {
  const slots = React.useContext(SlotContext);
  const parent = entry.parent;
  const label = (
    <>
      {backIcon}
      <span>{parent?.title ?? "Back"}</span>
    </>
  );

  return (
      <div className="pr-bar">
        {parent ? (
          Link ? (
            <Link
              href={parent.path}
              className="pr-bar-back"
              onClick={(e) => {
                // Let the host router handle modified clicks and new tabs.
                if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
                e.preventDefault();
                onBack();
              }}
            >
              {label}
            </Link>
          ) : (
            <button type="button" className="pr-bar-back" onClick={onBack}>
              {label}
            </button>
          )
        ) : null}

        <span className="pr-bar-title" ref={slots?.setTitle}>
          <span className="pr-bar-title-default">{entry.title}</span>
        </span>

        <span className="pr-bar-actions" ref={slots?.setActions} />
      </div>
  );
}

function Slot({ pick, children }: { pick: "title" | "actions"; children: React.ReactNode }) {
  const slots = React.useContext(SlotContext);
  const target = slots?.[pick] ?? null;
  // Null on the first render, before the bar's refs have attached; on a level
  // rendered with `bar={false}`; and on one whose bar came from `renderBar`,
  // which owns its own markup and never claims these slots. Rendering nothing
  // is right in every case — the second pass fills it in where there is a bar.
  return target ? createPortal(children, target) : null;
}

/** Override the bar's title from inside the pushed page. */
export function PresentationTitle({ children }: { children: React.ReactNode }) {
  return <Slot pick="title">{children}</Slot>;
}

/** Put controls in the bar's trailing edge from inside the pushed page. */
export function PresentationActions({ children }: { children: React.ReactNode }) {
  return <Slot pick="actions">{children}</Slot>;
}

/**
 * Renders nothing when a level throws while it is on its way out.
 *
 * A departing level is still mounted after the router has moved on, so
 * anything it reads from route context — loader data, params, a resolved
 * server payload — may already be gone, and a page that destructures it
 * throws during its own exit animation. Without this the error escapes to the
 * app's error boundary and takes down a screen the user has already left.
 *
 * Only ever wrapped around exiting content, and keyed per level, so a genuine
 * error in a live page still surfaces normally.
 */
export class ExitBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    /* Swallowed deliberately — see the class doc. */
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
