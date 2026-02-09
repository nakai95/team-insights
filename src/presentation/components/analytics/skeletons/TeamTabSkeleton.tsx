import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonChart } from "@/presentation/components/shared/SkeletonChart";

/**
 * TeamTabSkeleton Component
 *
 * Purpose: Loading state skeleton for TeamTab component
 *
 * Features:
 * - Matches TeamTab layout structure (2 charts + contributor table)
 * - Uses SkeletonChart for chart placeholders
 * - Responsive grid layout (1 column on mobile/tablet, 2 on desktop)
 * - Table skeleton with header and data rows
 *
 * Usage:
 * ```tsx
 * <Suspense fallback={<TeamTabSkeleton />}>
 *   <TeamTab repositoryId={repositoryId} dateRange={dateRange} />
 * </Suspense>
 * ```
 */

export function TeamTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Charts Section - 2:1 ratio on large screens */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-[2fr_1fr]">
        {/* Implementation Activity Chart Skeleton */}
        <SkeletonChart height="h-[400px]" />

        {/* Review Activity Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" /> {/* Title */}
            <Skeleton className="h-4 w-64 mt-2" /> {/* Description */}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" /> {/* Name */}
                    <Skeleton className="h-3 w-48" /> {/* Stats */}
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-5 w-10 ml-auto" /> {/* Score */}
                    <Skeleton className="h-3 w-12 ml-auto" /> {/* Label */}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contributor Table Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" /> {/* Title */}
          <Skeleton className="h-4 w-64 mt-2" /> {/* Description */}
        </CardHeader>
        <CardContent>
          {/* Table Header */}
          <div className="flex gap-4 pb-4 border-b">
            <Skeleton className="h-4 w-12" /> {/* Rank */}
            <Skeleton className="h-4 flex-1" /> {/* Contributor */}
            <Skeleton className="h-4 w-16" /> {/* Commits */}
            <Skeleton className="h-4 w-16" /> {/* PRs */}
            <Skeleton className="h-4 w-16" /> {/* Reviews */}
            <Skeleton className="h-4 w-20" /> {/* Lines Changed */}
            <Skeleton className="h-4 w-16" /> {/* Score */}
          </div>

          {/* Table Rows */}
          <div className="divide-y">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex gap-4 py-4">
                <Skeleton className="h-10 w-12" /> {/* Rank */}
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" /> {/* Name */}
                  <Skeleton className="h-3 w-48" /> {/* Email */}
                </div>
                <Skeleton className="h-10 w-16" /> {/* Commits */}
                <Skeleton className="h-10 w-16" /> {/* PRs */}
                <Skeleton className="h-10 w-16" /> {/* Reviews */}
                <Skeleton className="h-10 w-20" /> {/* Lines Changed */}
                <Skeleton className="h-10 w-16" /> {/* Score */}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
