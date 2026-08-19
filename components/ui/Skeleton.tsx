import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

/**
 * Shimmer placeholder. The `motion-reduce:` variant drops to a flat fill rather
 * than removing the block — the alternative is always "final state", never
 * "nothing where something should be".
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-sm bg-surface-inset",
        "bg-[linear-gradient(90deg,var(--surface-inset)_25%,var(--surface)_50%,var(--surface-inset)_75%)]",
        "bg-[length:200%_100%] animate-shimmer",
        "motion-reduce:animate-none motion-reduce:bg-surface-inset motion-reduce:bg-none",
        className,
      )}
    />
  );
}

type SkeletonTextProps = {
  lines?: number;
  className?: string;
};

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3.5", index === lines - 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </div>
  );
}
