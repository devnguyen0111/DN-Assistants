import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: ReactNode;
  /** Shown after the title as plain caption text, e.g. an item count. */
  count?: ReactNode;
  /** One primary button, up to two secondary ones, then a More menu. */
  actions?: ReactNode;
  className?: string;
};

/** The single page title (h1) of a route — spec §3/§4. No background or border. */
export function PageHeader({ title, description, count, actions, className }: Props) {
  return (
    <header
      className={cn("flex flex-wrap items-start justify-between gap-x-6 gap-y-3 py-5", className)}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <h1 className="text-title tracking-[-0.01em] text-text-1">
          {title}
          {count != null && (
            <span className="ml-2 align-middle text-caption font-normal text-text-3">{count}</span>
          )}
        </h1>
        {description ? <p className="text-body text-text-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
