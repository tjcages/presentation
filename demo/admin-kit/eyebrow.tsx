import { cn } from "./lib/cn";

export interface EyebrowProps {
  children: React.ReactNode;
  /** `default` is the orange block; `faint` is the neutral ghost version. */
  variant?: "default" | "faint";
  className?: string;
}

/**
 * Section eyebrow ported from the reference site: a small mono uppercase
 * block label with stepped accent bars trailing off each side. Static —
 * no scramble/march animation in the dashboard.
 */
export function Eyebrow({
  children,
  variant = "default",
  className,
}: EyebrowProps) {
  const faint = variant === "faint";

  return (
    <div className={cn("flex w-max items-center", className)}>
      <span
        className={cn(
          "text-decorative px-1.5 py-px",
          faint
            ? "bg-background-300 text-foreground-200"
            : "bg-accent-100 text-white",
        )}
      >
        {children}
      </span>
      <span
        className={cn(
          "h-3 w-0.5",
          faint ? "bg-background-300" : "bg-accent-100/50",
        )}
      />
      <span
        className={cn(
          "ml-px h-2 w-0.5",
          faint ? "bg-background-200" : "bg-accent-100/25",
        )}
      />
    </div>
  );
}
