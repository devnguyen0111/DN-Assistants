import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex min-h-control w-full rounded-sm border border-control bg-surface-1 px-3 py-1.5 text-body text-text-1 transition-colors file:border-0 file:bg-transparent file:text-body file:font-medium placeholder:text-text-3 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring aria-invalid:border-danger read-only:bg-surface-2 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-disabled",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
