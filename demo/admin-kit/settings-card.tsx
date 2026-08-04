"use client";

import { useAdminKit } from "./context";
import { cn } from "./lib/cn";

export interface SettingsCardProps {
  title: React.ReactNode;
  /** Muted line under the title. */
  description?: React.ReactNode;
  /** The control(s) for this setting — input, toggle, select, buttons, etc. */
  children?: React.ReactNode;
  /** Right-aligned control in the header (e.g. a toggle that gates the body). */
  headerAction?: React.ReactNode;
  /** Optional info/disclaimer rendered in a footer strip. */
  footer?: React.ReactNode;
  /** `danger` tints the card for destructive actions. */
  tone?: "default" | "danger";
  /** Anchor id, so a section can be deep-linked / scrolled to. */
  id?: string;
  className?: string;
}

/**
 * A single setting "card": header (title + description, optional action) over a
 * control area, with an optional footer for info or disclaimers. Product code
 * supplies the actual control as `children`.
 */
export function SettingsCard({
  title,
  description,
  children,
  headerAction,
  footer,
  tone = "default",
  id,
  className,
}: SettingsCardProps) {
  return (
    <div
      id={id}
      className={cn(
        // Same surface recipe as the album settings field card: the
        // `shadow-general-small` token already carries its own 1px ring, so a
        // `border` on top would double the edge.
        "bg-background-100 text-foreground-200 shadow-general-small relative flex w-full scroll-mt-6 flex-col overflow-hidden rounded-lg",
        tone === "danger" && "border-destructive-100/40",
        className,
      )}
    >
      <div className="flex w-full min-w-0 flex-col items-stretch gap-1 p-6">
        <div className="flex w-full min-w-0 items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            {typeof title === "string" ? (
              <h6 className="font-[550]">{title}</h6>
            ) : (
              title
            )}
            {description ? (
              <p className="text-foreground-300 text-sm">{description}</p>
            ) : null}
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
        {children ? (
          <div className="w-full min-w-0 max-w-full pt-4">{children}</div>
        ) : null}
      </div>
      {footer ? (
        <div
          className={cn(
            // The house chin — identical to the field card's extraInfo /
            // disclaimer strip, so an info callout reads the same whether it
            // sits under an album field or a settings card.
            "bg-background-200/50 text-foreground-300 flex w-full items-center gap-2 border-t px-6 py-4",
            tone === "danger" &&
              "bg-destructive-100/10 text-destructive-200 border-destructive-100/40",
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Standard "chin" layout for `<SettingsCard>` footers:
 *   [icon] [muted label]                    [accent action →]
 */
export interface SettingsCardFooterProps {
  /** Optional small lucide icon on the leading edge of the chin. */
  icon?: React.ReactNode;
  /** The muted-tone status / context text. */
  label?: React.ReactNode;
  /** The right-aligned action — use `<SettingsCardAction>` for the
   *  standardized underlined link/button treatment. */
  action?: React.ReactNode;
}

export function SettingsCardFooter({
  icon,
  label,
  action,
}: SettingsCardFooterProps) {
  return (
    <span className="flex w-full items-center gap-2">
      {icon ? <span className="shrink-0 text-inherit">{icon}</span> : null}
      {label ? (
        <p className="min-w-0 flex-1 text-sm text-inherit">{label}</p>
      ) : null}
      {action ? <span className="ml-auto shrink-0">{action}</span> : null}
    </span>
  );
}

/**
 * Standard "manage X" action for a SettingsCard chin. Renders as an `<a>` for
 * external URLs, the host-injected `<Link>` for internal routes (via
 * AdminKitContext), or a `<button>` for in-place actions.
 *
 * This is the app's link-button treatment: the same geometry as the `Button`
 * primitive's `link` variant, in the foreground color rather than the accent —
 * a chin action is a quiet secondary route, not a call to action, and an
 * orange link inside a muted strip reads as the loudest thing on the card.
 *
 * No arrow. The underline is the affordance; a glyph on top of it was noise.
 */
export interface SettingsCardActionProps {
  /** Internal route — routed via the host-injected `Link`. */
  to?: string;
  /** External URL — opens in a new tab. */
  href?: string;
  /** Local handler — turns the action into a `<button type="button">`. */
  onClick?: () => void;
  /** Disabled state (renders as a button so we have something to disable). */
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function SettingsCardAction({
  to,
  href,
  onClick,
  disabled,
  className,
  children,
}: SettingsCardActionProps) {
  const { Link } = useAdminKit();
  // Mirrors `buttonVariants({ variant: "link" })` from the app's Button
  // primitive — same base geometry and press feedback — recolored to the
  // foreground ramp.
  const linkClass = cn(
    "text-foreground-100 hover:text-foreground-200 relative inline-flex shrink-0",
    "cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium",
    "underline-offset-4 outline-none transition-colors hover:underline active:scale-[0.99]",
    "disabled:pointer-events-none disabled:no-underline disabled:opacity-40",
    className,
  );
  const body = children;
  if (to) {
    return (
      <Link to={to} className={linkClass}>
        {body}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
        {body}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={linkClass}
    >
      {body}
    </button>
  );
}
