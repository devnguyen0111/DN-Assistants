import * as React from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";

type StateBlockProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  /** `inline` (default): compact row for dashboards/lists. `page`: first-use module state. */
  size?: "inline" | "page";
  /** Technical details shown under a collapsed disclosure (errors only). */
  details?: string;
};

/** Reserves list geometry with skeleton rows instead of a spinner. */
function LoadingState({ title, className, rows = 3 }: StateBlockProps & { rows?: number }) {
  return (
    <div className={cn("flex flex-col gap-2 py-2", className)} aria-busy="true">
      {title ? (
        <span className="sr-only" role="status">
          {title}
        </span>
      ) : null}
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-row w-full rounded-sm" />
      ))}
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
  className,
  icon,
  size = "inline",
}: StateBlockProps) {
  if (size === "page") {
    return (
      <div
        className={cn(
          "flex min-h-40 flex-col items-center justify-center gap-2 py-6 text-center",
          className,
        )}
      >
        <div className="text-text-3 [&_svg]:size-6">{icon ?? <Inbox />}</div>
        {title ? <p className="text-section text-text-1">{title}</p> : null}
        {description ? <p className="max-w-sm text-body text-text-2">{description}</p> : null}
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
    );
  }
  return (
    <div className={cn("flex min-h-16 items-center gap-3 py-3", className)}>
      <div className="text-text-3 [&_svg]:size-4">{icon ?? <Inbox />}</div>
      <div className="min-w-0 flex-1">
        {title ? <p className="text-body text-text-2">{title}</p> : null}
        {description ? <p className="text-caption text-text-3">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Compact inline alert near the affected content; keeps healthy content interactive. */
function ErrorState({ title, description, action, className, icon, details }: StateBlockProps) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-md border border-danger/40 bg-danger-soft px-3 py-2.5",
        className,
      )}
    >
      <div className="mt-0.5 text-danger [&_svg]:size-4">{icon ?? <AlertTriangle />}</div>
      <div className="min-w-0 flex-1 space-y-0.5">
        {title ? <p className="text-label text-text-1">{title}</p> : null}
        {description ? <p className="text-body text-text-2">{description}</p> : null}
        {details ? (
          <details className="text-caption text-text-3">
            <summary className="cursor-pointer select-none">{t.updateErrDetails}</summary>
            <pre className="mt-1 whitespace-pre-wrap break-all font-mono select-text">
              {details}
            </pre>
          </details>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export { LoadingState, EmptyState, ErrorState };
export type { StateBlockProps };
