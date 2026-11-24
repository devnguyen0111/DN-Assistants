import { Skeleton } from "@/components/ui/skeleton";

/** Reserves real page geometry (header + content rows) while a route chunk loads. */
export function PageSkeleton() {
  return (
    <div className="space-y-6 py-5" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
      <Skeleton className="h-56 w-full rounded-lg" />
    </div>
  );
}
