import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Panel surface (spec §4). `Card` is kept as the export name so existing call sites work.
 * Opaque surface-1, subtle border, panel elevation; no translucency, no hover lift.
 */
const cardVariants = cva("rounded-lg border text-card-foreground", {
  variants: {
    variant: {
      default: "border-border bg-surface-1 shadow-panel",
      interactive:
        "border-border bg-surface-1 shadow-panel transition-colors duration-100 hover:border-border-strong hover:bg-surface-2",
      stat: "rounded-md border-border bg-surface-2",
      flat: "border-border bg-surface-1",
    },
  },
  defaultVariants: { variant: "default" },
});

type CardProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>;

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card"
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn("flex flex-col gap-1 p-panel pb-3", className)}
      {...props}
    />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-section text-text-1", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-caption text-text-3", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="card-content" className={cn("p-panel pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-panel pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
