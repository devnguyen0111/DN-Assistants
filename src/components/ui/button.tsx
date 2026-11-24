import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-body font-medium transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:bg-surface-2 disabled:text-text-disabled disabled:border-transparent aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed",
        destructive: "bg-danger text-destructive-foreground hover:bg-danger/90",
        outline:
          "border border-control bg-surface-1 text-text-1 hover:bg-surface-2 active:bg-surface-3",
        secondary: "bg-surface-3 text-text-1 hover:bg-surface-3/80",
        ghost: "text-text-2 hover:bg-surface-3 hover:text-text-1",
        link: "text-accent-foreground underline-offset-4 hover:underline",
        "ghost-danger": "text-danger hover:bg-danger-soft",
      },
      size: {
        default: "min-h-control px-3 py-1.5",
        sm: "min-h-8 px-2 py-1 text-caption [html[data-density=compact]_&]:min-h-7",
        lg: "min-h-10 px-4 py-2",
        icon: "size-control",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
