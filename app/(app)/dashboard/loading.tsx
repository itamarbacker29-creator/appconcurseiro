import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <Skeleton className="h-7 w-48 rounded" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-(--surface) border border-(--border) rounded-(--radius) p-4 flex flex-col gap-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-8 w-12 rounded" />
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-(--surface) border border-(--border) rounded-(--radius) p-4 flex flex-col gap-3">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-3/4 rounded" />
        </div>
        <div className="bg-(--surface) border border-(--border) rounded-(--radius) p-4 flex flex-col gap-3">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-2/3 rounded" />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-(--surface) border border-(--border) rounded-(--radius) p-4 flex flex-col items-center gap-2">
            <Skeleton className="w-6 h-6 rounded" />
            <Skeleton className="h-3 w-12 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
