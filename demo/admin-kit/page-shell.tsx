import { cn } from "./lib/cn";

export interface PageShellProps {
  /** Usually a <PageHeader />. */
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Centered, max-width content container that stacks a header above content. */
export function PageShell({ header, children, className }: PageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 pb-28 pt-4 sm:gap-6 sm:px-10 sm:pb-20 sm:pt-8",
        className,
      )}
    >
      {header}
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
