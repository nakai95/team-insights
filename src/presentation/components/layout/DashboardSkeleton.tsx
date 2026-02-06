/**
 * DashboardSkeleton Component
 *
 * Purpose: Suspense fallback for dashboard page during initial data load
 *
 * Displays structural placeholders that match the final dashboard layout:
 * - Header section with repository info skeleton
 * - Summary cards row (4 metric cards)
 * - Tab navigation skeleton
 * - Chart area skeletons
 *
 * Performance: Renders immediately (<500ms) to show users that content is loading
 *
 * Usage:
 * ```typescript
 * <Suspense fallback={<DashboardSkeleton />}>
 *   <DashboardContent />
 * </Suspense>
 * ```
 */

import { SkeletonChart } from "../shared/SkeletonChart";

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen p-8 bg-background animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="space-y-4">
          {/* Repository title and actions */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-muted animate-pulse rounded" />
              <div className="h-4 w-48 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-24 bg-muted animate-pulse rounded" />
              <div className="h-10 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>

          {/* Date range and metadata */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-40 bg-muted animate-pulse rounded" />
          </div>
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-6 bg-card border border-border rounded-lg space-y-3"
            >
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>

        {/* Tab Navigation Skeleton */}
        <div className="border-b border-border">
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-10 w-32 bg-muted animate-pulse rounded-t"
              />
            ))}
          </div>
        </div>

        {/* Chart Area Skeleton */}
        <div className="space-y-6">
          {/* Main chart */}
          <SkeletonChart height="h-96" title="Loading metrics..." />

          {/* Secondary charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonChart height="h-64" />
            <SkeletonChart height="h-64" />
          </div>

          {/* Tertiary chart */}
          <SkeletonChart height="h-80" />
        </div>
      </div>
    </div>
  );
}
