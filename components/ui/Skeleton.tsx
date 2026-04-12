interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = '', lines }: SkeletonProps) {
  if (lines) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`skeleton h-4 rounded ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
          />
        ))}
      </div>
    );
  }

  return <div className={`skeleton ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-(--surface) border border-(--border) rounded-(--radius) p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton lines={3} />
      <Skeleton className="h-8 w-full rounded-(--radius-sm)" />
    </div>
  );
}
