import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function BentoGrid({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 auto-rows-[minmax(140px,auto)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type BentoItemProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function BentoItem({ className, children, ...props }: BentoItemProps) {
  return (
    <div className={cn("bento-item min-h-0", className)} {...props}>
      {children}
    </div>
  );
}
