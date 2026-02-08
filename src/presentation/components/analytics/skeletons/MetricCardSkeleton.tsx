import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * MetricCardSkeleton Component
 *
 * Purpose: Skeleton placeholder for metric card widgets during loading
 *
 * Features:
 * - Matches the structure of actual metric cards
 * - Animated pulse effect for visual feedback
 * - Used as Suspense fallback for async Server Components
 *
 * Usage:
 * ```typescript
 * <Suspense fallback={<MetricCardSkeleton />}>
 *   <PRCountWidget repositoryId={repositoryId} dateRange={dateRange} />
 * </Suspense>
 * ```
 */
export function MetricCardSkeleton() {
  return (
    <Card data-testid="metric-card-skeleton">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        {/* Title skeleton */}
        <Skeleton className="h-4 w-24" />
        {/* Icon skeleton */}
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        {/* Main value skeleton */}
        <Skeleton className="h-8 w-16 mb-2" />
        {/* Subtitle/description skeleton */}
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}
