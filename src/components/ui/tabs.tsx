import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/** Underline tabs for distinct sections within one module (spec §4). */
const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-end gap-1 border-b border-border text-text-2 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:border-b-0",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // horizontal: underline indicator; vertical: sidebar-style selection bar
      "relative inline-flex min-h-control items-center justify-center gap-1.5 whitespace-nowrap px-3 text-body font-medium transition-colors duration-100 hover:text-text-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:text-text-disabled",
      "data-[state=active]:text-text-1 data-[orientation=horizontal]:data-[state=active]:after:absolute data-[orientation=horizontal]:data-[state=active]:after:inset-x-2 data-[orientation=horizontal]:data-[state=active]:after:-bottom-px data-[orientation=horizontal]:data-[state=active]:after:h-0.5 data-[orientation=horizontal]:data-[state=active]:after:rounded-full data-[orientation=horizontal]:data-[state=active]:after:bg-primary",
      "data-[orientation=vertical]:justify-start data-[orientation=vertical]:rounded-sm data-[orientation=vertical]:hover:bg-surface-3 data-[orientation=vertical]:data-[state=active]:bg-accent data-[orientation=vertical]:data-[state=active]:text-accent-foreground data-[orientation=vertical]:data-[state=active]:before:absolute data-[orientation=vertical]:data-[state=active]:before:left-0 data-[orientation=vertical]:data-[state=active]:before:top-1/2 data-[orientation=vertical]:data-[state=active]:before:h-[18px] data-[orientation=vertical]:data-[state=active]:before:w-[3px] data-[orientation=vertical]:data-[state=active]:before:-translate-y-1/2 data-[orientation=vertical]:data-[state=active]:before:rounded-full data-[orientation=vertical]:data-[state=active]:before:bg-primary",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-4 focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
