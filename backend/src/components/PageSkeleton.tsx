import { Skeleton } from "@/components/ui/skeleton";

// Generic skeleton rows for tables
export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="space-y-3 p-4">
    <div className="flex gap-4">
      {Array.from({ length: cols }).map((_, c) => (
        <Skeleton key={c} className="h-4 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4 items-center">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-3 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

// Card grid skeleton
export const CardGridSkeleton = ({ count = 6, cols = 3 }: { count?: number; cols?: number }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols} gap-3`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="ms-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-2 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

// Stats skeleton
export const StatsSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className={`grid grid-cols-${count} gap-2`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="ms-card p-3 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-6 w-10" />
      </div>
    ))}
  </div>
);

// Employee grid skeleton
export const EmployeeGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="ms-card p-6 flex flex-col items-center gap-3">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="space-y-1.5 w-full flex flex-col items-center">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
    ))}
  </div>
);

// Payslip card skeleton
export const PayslipCardSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="ms-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    ))}
  </div>
);

// Profile skeleton
export const ProfileSkeleton = () => (
  <div className="space-y-5 max-w-3xl">
    <Skeleton className="h-6 w-32" />
    <div className="ms-card p-5">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <div className="space-y-1">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-2 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
    {[1, 2].map((i) => (
      <div key={i} className="ms-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-16" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((j) => (
            <div key={j} className="space-y-1">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// Vault link skeleton
export const VaultSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="ms-card p-4 flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-2.5 w-48" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="w-7 h-7 rounded" />
          <Skeleton className="w-7 h-7 rounded" />
        </div>
      </div>
    ))}
  </div>
);

// Full page loading wrapper
export const PageLoading = ({ children, loading, skeleton }: { children: React.ReactNode; loading: boolean; skeleton: React.ReactNode }) => {
  if (loading) return <>{skeleton}</>;
  return <>{children}</>;
};
