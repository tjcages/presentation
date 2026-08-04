/**
 * Totem admin-kit primitives, reproduced.
 *
 * Class strings copied from source, not translated:
 *   PageShell            packages/admin-kit/src/page-shell.tsx
 *   PageHeader           packages/admin-kit/src/page-header.tsx
 *   SettingsCard / …Footer   packages/admin-kit/src/settings-card.tsx
 *   SettingsShell        apps/admin/src/components/app-settings/_settings-shell.tsx
 *
 * `Button` and `Avatar` are trimmed to the shapes these pages actually use.
 */

import * as React from "react";

export function cn(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Centered, max-width content container that stacks a header above content. */
export function PageShell({
  header,
  children,
  className,
}: {
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 pb-28 pt-4 sm:gap-6 sm:px-10 sm:pb-20 sm:pt-8",
        className,
      )}
    >
      {header}
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 md:gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="text-foreground-100 truncate">{title}</h2>
        {description ? (
          <p className="text-foreground-300 max-w-2xl">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/**
 * A single setting card: header over a control area, optional footer chin.
 *
 * `shadow-general-small` carries its own 1px ring, so there is deliberately no
 * border — adding one doubles the edge.
 */
export function SettingsCard({
  id,
  title,
  description,
  children,
  headerAction,
  footer,
  tone = "default",
  className,
}: {
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  tone?: "default" | "danger";
  className?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "bg-background-100 text-foreground-200 shadow-general-small relative flex w-full scroll-mt-6 flex-col overflow-hidden rounded-lg",
        tone === "danger" && "border-destructive-100/40",
        className,
      )}
    >
      <div className="flex w-full min-w-0 flex-col items-stretch gap-1 p-6">
        <div className="flex w-full min-w-0 items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            {typeof title === "string" ? <h6 className="font-[550]">{title}</h6> : title}
            {description ? (
              <p className="text-foreground-300 text-sm">{description}</p>
            ) : null}
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
        {children ? <div className="w-full min-w-0 max-w-full pt-4">{children}</div> : null}
      </div>
      {footer ? (
        <div
          className={cn(
            "bg-background-200/50 text-foreground-300 flex w-full items-center gap-2 border-t px-6 py-4",
            tone === "danger" && "bg-destructive-100/10 text-destructive-200 border-destructive-100/40",
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/** `[icon] [muted label]  …  [accent action]` */
export function SettingsCardFooter({
  icon,
  label,
  action,
}: {
  icon?: React.ReactNode;
  label?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <span className="flex w-full items-center gap-2">
      {icon ? <span className="shrink-0 text-inherit">{icon}</span> : null}
      {label ? <p className="min-w-0 flex-1 text-sm text-inherit">{label}</p> : null}
      {action ? <span className="ml-auto shrink-0">{action}</span> : null}
    </span>
  );
}

/** Frame shared by every `/settings/*` page. */
export function SettingsShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <PageShell header={<PageHeader title={title} description={description} />}>
      <div className="flex flex-col gap-4">{children}</div>
    </PageShell>
  );
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { variant?: "primary" | "secondary" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
        variant === "primary"
          ? "bg-accent-100 text-white hover:opacity-90"
          : "bg-background-200 text-foreground-100 hover:bg-sidebar-accent",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "bg-accent-100 flex items-center justify-center rounded-lg text-sm font-medium text-white ring-1 ring-black/10 dark:ring-white/10",
        className,
      )}
    >
      {initials}
    </span>
  );
}
