import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * HeroMetricsSkeleton Component
 *
 * Purpose: Loading state for HeroMetrics component
 *
 * Features:
 * - Matches HeroMetricCard layout
 * - 4-column responsive grid
 * - Shimmer effect via Skeleton
 *
 * Usage:
 * ```tsx
 * <Suspense fallback={<HeroMetricsSkeleton />}>
 *   <HeroMetrics />
 * </Suspense>
 * ```
 */

export function HeroMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            {/* Icon + Title */}
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>

            {/* Value */}
            <Skeleton className="h-9 w-20 mb-2" />

            {/* Subtitle */}
            <Skeleton className="h-4 w-16 mb-4" />

            {/* Trend */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
