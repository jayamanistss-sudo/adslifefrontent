import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
  height?: string | number;
  width?: string | number;
  rounded?: string;
}

export function Skeleton({ className, height, width, rounded = 'rounded-lg' }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', rounded, className)}
      style={{ height, width }}
    />
  );
}

export function OfferCardSkeleton() {
  return (
    <div className="bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--border)]">
      {/* Image area */}
      <div className="skeleton rounded-none" style={{ height: 215 }} />
      <div className="p-4 space-y-3">
        {/* Business row */}
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
        {/* Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        {/* Price */}
        <Skeleton className="h-7 w-24" />
        {/* Footer */}
        <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>
      </div>
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="card p-4 space-y-2">
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4 ${i === 0 ? 'w-36' : 'w-20'}`} />
        </td>
      ))}
    </tr>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-14 h-14 rounded-2xl flex-shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <KpiCardSkeleton key={i} />)}
      </div>
      {/* Chart */}
      <div className="card p-5">
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
      {/* Table */}
      <div className="card p-5">
        <Skeleton className="h-4 w-28 mb-4" />
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
