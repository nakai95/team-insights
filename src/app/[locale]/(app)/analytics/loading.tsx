import { AppFooter } from "@/presentation/components/layout";
import { HeroMetricsSkeleton } from "@/presentation/components/features/analytics";
import { SkeletonChart } from "@/presentation/components/shared/SkeletonChart";

/**
 * Analytics Loading State
 *
 * Purpose: Instant loading UI shown during page transitions
 *
 * Features:
 * - Displays immediately when URL changes (repo/tab switch)
 * - Matches actual page layout structure
 * - Provides visual feedback while server renders
 * - Uses existing skeleton components
 *
 * Behavior:
 * - Next.js automatically shows this during navigation
 * - Replaces with actual content when ready
 * - Improves perceived performance significantly
 *
 * Layout:
 * - Hero metrics skeleton (4 cards)
 * - Multiple chart skeletons (simulates widgets)
 * - Footer at bottom (sticky footer pattern)
 */

export default function AnalyticsLoading() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Hero Metrics Skeleton */}
          <HeroMetricsSkeleton />

          {/* Main Content Skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Large chart (2/3 width) */}
            <div className="lg:col-span-2">
              <SkeletonChart height="h-96" />
            </div>
            {/* Side widget (1/3 width) */}
            <div>
              <SkeletonChart height="h-64" />
            </div>
          </div>

          {/* Additional full-width chart */}
          <SkeletonChart height="h-96" />
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
