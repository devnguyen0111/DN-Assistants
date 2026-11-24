import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: ReactNode; disabled?: boolean };

type Props<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: Option<T>[];
  /** Accessible group name. */
  label: string;
  className?: string;
  size?: "default" | "sm";
};

/**
 * 2–4 mutually exclusive values for one view or filter (spec §4). Radio-group semantics:
 * one tab stop, arrow keys move the selection.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
  size = "default",
}: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.filter((o) => !o.disabled);

  const move = (delta: number) => {
    const idx = enabled.findIndex((o) => o.value === value);
    const next = enabled[(idx + delta + enabled.length) % enabled.length];
    if (!next) return;
    onValueChange(next.value);
    refs.current[options.indexOf(next)]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex rounded-md bg-surface-3 p-0.5", className)}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={o.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(o.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(-1);
              }
            }}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-3 font-medium text-text-2 transition-colors duration-100 hover:text-text-1 focus-visible:outline-2 focus-visible:outline-ring disabled:text-text-disabled [&_svg]:size-4",
              size === "sm" ? "min-h-7 text-caption" : "min-h-8 text-body",
              selected && "border border-border bg-surface-1 text-text-1 shadow-panel",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
