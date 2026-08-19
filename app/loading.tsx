import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main id="content" className="pt-[calc(var(--header-h)+3.5rem)] pb-24">
      <div className="container-page">
        <span className="sr-only" role="status">
          Loading page
        </span>
        <Skeleton className="h-12 w-[min(28rem,90%)]" />
        <SkeletonText lines={2} className="mt-6 max-w-[52ch]" />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="rounded-md border border-line bg-surface p-5"
            >
              <Skeleton className="h-5 w-20" />
              <Skeleton className="mt-4 h-6 w-4/5" />
              <SkeletonText lines={2} className="mt-4" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
