import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 animate-in fade-in duration-200">
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-6 rounded-lg bg-primary/15" />
            <Skeleton className="h-5 w-36 rounded-md" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-36 w-full rounded-xl bg-muted/40" />
            <Skeleton className="h-36 w-full rounded-xl bg-muted/40" />
            <Skeleton className="h-36 w-full rounded-xl bg-muted/40" />
          </div>
          <Skeleton className="h-44 w-full rounded-xl bg-muted/30" />
        </CardContent>
      </Card>
    </div>
  );
}
