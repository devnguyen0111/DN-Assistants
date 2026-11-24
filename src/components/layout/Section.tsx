import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Heading level; defaults to h2 directly under the page header. */
  as?: "h2" | "h3";
  id?: string;
};

/**
 * Plain grouping that replaces the old "one big Card per page" pattern: no fill,
 * border, shadow or padding — just a labeled region (spec §4).
 */
export function Section({ title, description, action, children, className, as = "h2", id }: Props) {
  const headingId = useId();
  const Heading = as;
  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn("space-y-3 scroll-mt-16", className)}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            {title ? (
              <Heading
                id={headingId}
                tabIndex={-1}
                className="text-section text-text-1 outline-none"
              >
                {title}
              </Heading>
            ) : null}
            {description ? <p className="text-caption text-text-3">{description}</p> : null}
          </div>
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
