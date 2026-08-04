"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

import { cn } from "../lib/cn";

export const Collapsible = ({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) => {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
};

export const CollapsibleTrigger = ({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) => {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  );
};

export const CollapsibleContent = ({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) => {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      className={cn(
        "overflow-hidden",
        "data-[state=open]:animate-[collapsible-open_200ms_ease-out]",
        "data-[state=closed]:animate-[collapsible-close_200ms_ease-out]",
        className,
      )}
      {...props}
    />
  );
};
