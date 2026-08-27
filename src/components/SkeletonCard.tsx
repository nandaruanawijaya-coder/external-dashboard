'use client';

export function ScorecardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white/80 rounded-xl p-6 border border-gray-200/50">
          <div className="h-3 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
          <div className="h-8 bg-gray-300 rounded w-24 mb-3 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white/80 rounded-xl shadow-sm p-8 border border-gray-200/50">
      <div className="h-4 bg-gray-200 rounded w-40 mb-6 animate-pulse" />
      <div className="h-96 bg-gray-100 rounded animate-pulse" />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="bg-white/80 rounded-xl shadow-sm p-8 border border-gray-200/50">
      <div className="h-4 bg-gray-200 rounded w-32 mb-6 animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
