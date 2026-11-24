import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-sm border border-control bg-surface-1 px-3 py-2 text-body text-text-1 placeholder:text-text-3 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring aria-invalid:border-danger read-only:bg-surface-2 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-disabled",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
