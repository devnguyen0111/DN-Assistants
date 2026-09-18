import * as React from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type StateBlockProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
};

function LoadingState({ title, className }: StateBlockProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4 py-8 text-center", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <div className="flex w-full max-w-sm flex-col gap-2">
        <Skeleton className="mx-auto h-4 w-32" />
        <Skeleton className="mx-auto h-3 w-48" />
        <Skeleton className="mx-auto h-3 w-40" />
      </div>
      {title ? <p className="text-sm font-medium text-muted-foreground">{title}</p> : null}
    </div>
  );
}

function EmptyState({ title, description, action, className, icon }: StateBlockProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-8 text-center", className)}>
      <div className="text-muted-foreground">{icon ?? <Inbox className="h-10 w-10" />}</div>
      {title ? <p className="text-sm font-semibold">{title}</p> : null}
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

function ErrorState({ title, description, action, className, icon }: StateBlockProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-8 text-center", className)}>
      <div className="text-destructive">{icon ?? <AlertTriangle className="h-10 w-10" />}</div>
      {title ? <p className="text-sm font-semibold">{title}</p> : null}
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export { LoadingState, EmptyState, ErrorState };
export type { StateBlockProps };
