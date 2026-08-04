"use client";

import { ChevronLeft } from "lucide-react";

import { cn } from "./lib/cn";

export interface PageHeaderBackLink {
  label: string;
  onClick: () => void;
}

export interface PageHeaderProps {
  title: React.ReactNode;
  /** Small muted label above the title. */
  eyebrow?: React.ReactNode;
  /** Muted line below the title. */
  description?: React.ReactNode;
  /** Back affordance above the title (mutually exclusive with eyebrow). */
  backLink?: PageHeaderBackLink;
  /** Right-aligned cluster: buttons, a SearchField, dropdowns. */
  actions?: React.ReactNode;
  /**
   * Use an `h1` on mobile (Linear-style large title) and keep `h2` from `md`
   * up. Only for true list roots like Albums — not every page.
   */
  largeTitle?: boolean;
  className?: string;
}

/** Shared page header: title + optional eyebrow/description/back link + actions. */
export function PageHeader({
  title,
  eyebrow,
  description,
  backLink,
  actions,
  largeTitle = false,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 md:gap-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        {backLink ? (
          <button
            type="button"
            onClick={backLink.onClick}
            className="text-foreground-300 hover:text-foreground-100 inline-flex w-max items-center gap-1 transition-colors"
          >
            <ChevronLeft className="size-3.5" />
            <small>{backLink.label}</small>
          </button>
        ) : eyebrow ? (
          <span className="text-decorative text-foreground-300">{eyebrow}</span>
        ) : null}
        {typeof title === "string" ? (
          largeTitle ? (
            <>
              <h1 className="text-foreground-100 truncate md:hidden">
                {title}
              </h1>
              <h2 className="text-foreground-100 hidden truncate md:block">
                {title}
              </h2>
            </>
          ) : (
            <h2 className="text-foreground-100 truncate">{title}</h2>
          )
        ) : (
          title
        )}
        {description ? (
          <small className="text-foreground-300">{description}</small>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
