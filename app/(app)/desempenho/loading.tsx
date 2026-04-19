import { Skeleton } from '@/components/ui/Skeleton';

export default function DesempenhoLoading() {
  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto">
      <div className="mb-6 flex flex-col gap-1">
        <Skeleton className="h-7 w-40 rounded" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`bg-(--surface) border border-(--border) rounded-(--radius) p-4 flex flex-col gap-2 ${i === 2 ? 'col-span-2 md:col-span-1' : ''}`}>
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-9 w-16 rounded" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-(--surface) border border-(--border) rounded-(--radius) p-4 mb-4">
        <Skeleton className="h-5 w-48 rounded mb-4" />
        <div className="flex items-end gap-1 h-24">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="flex-1">
              <Skeleton className="w-full rounded-t" style={{ height: `${20 + Math.random() * 60}px` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Por matéria */}
      <div className="bg-(--surface) border border-(--border) rounded-(--radius) p-4 flex flex-col gap-4">
        <Skeleton className="h-5 w-32 rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
