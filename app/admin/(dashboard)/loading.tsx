import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export default function AdminDashboardLoading() {
  return (
    <div className="flex flex-col gap-5">
      <span className="sr-only" role="status">
        Loading admin page
      </span>
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-sm border border-line bg-surface p-4 shadow-sm"
          >
            <Skeleton className="size-8 rounded-sm" />
            <Skeleton className="mt-3 h-3 w-20" />
            <Skeleton className="mt-2 h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-sm border border-line bg-surface p-4">
        <Skeleton className="h-4 w-40" />
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10 flex-1" />
          ))}
        </div>
      </div>
      <div className="rounded-sm border border-line bg-surface p-4">
        <Skeleton className="h-4 w-48" />
        <SkeletonText lines={6} className="mt-4" />
      </div>
    </div>
  );
}
