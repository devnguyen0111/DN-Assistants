import { useMemo } from "react";
import { cn } from "@/lib/utils";

type SparklineProps = {
  values: number[];
  max?: number;
  className?: string;
  stroke?: string;
};

export function Sparkline({
  values,
  max = 100,
  className,
  stroke = "currentColor",
}: SparklineProps) {
  const points = useMemo(() => {
    if (values.length === 0) return "";
    const width = 100;
    const height = 32;
    const step = values.length > 1 ? width / (values.length - 1) : width;
    return values
      .map((value, index) => {
        const x = index * step;
        const y = height - (Math.min(Math.max(value, 0), max) / max) * height;
        return `${x},${y}`;
      })
      .join(" ");
  }, [values, max]);

  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className={cn("h-8 w-full text-primary", className)}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
