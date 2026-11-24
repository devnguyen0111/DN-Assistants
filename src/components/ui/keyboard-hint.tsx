import { cn } from "@/lib/utils";

/** Keyboard shortcut chip. Supplement only — never the sole accessible name. */
export function Kbd({ children, className }: { children: string; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex min-h-5 items-center rounded-xs border border-border bg-surface-2 px-1 font-mono text-caption text-text-2",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
