import { Suspense } from "react";
import type { DateRange } from "@/domain/value-objects/DateRange";
import { SkeletonChart } from "@/presentation/components/shared/SkeletonChart";
import { PRTrendsWidget } from "@/presentation/components/analytics/widgets/PRTrendsWidget";
import { ThroughputWidget } from "@/presentation/components/analytics/widgets/ThroughputWidget";
import { DORAMetricsWidget } from "@/presentation/components/analytics/widgets/DORAMetricsWidget";
import { DeploymentFrequencyWidget } from "@/presentation/components/analytics/widgets/DeploymentFrequencyWidget";

/**
 * OverviewTab Component
 *
 * Purpose: Main analytics overview with key metrics and charts
 *
 * Content:
 * - Row 1: PR Activity Trends (with code changes analysis) and Throughput Analysis
 * - Row 2: DORA Metrics
 * - Row 3: Deployment Frequency (full width)
 *
 * Architecture:
 * - Server Component
 * - Each widget wrapped in individual Suspense boundary
 * - Progressive loading
 *
 * Usage:
 * ```tsx
 * {activeTab === 'overview' && (
 *   <OverviewTab repositoryId={repositoryId} dateRange={dateRange} />
 * )}
 * ```
 */

interface OverviewTabProps {
  repositoryId: string;
  dateRange: DateRange;
}

export function OverviewTab({ repositoryId, dateRange }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Row 1: Main Analytics (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={<SkeletonChart height="h-96" />}>
            <PRTrendsWidget
              repositoryId={repositoryId}
              dateRange={dateRange}
            />
          </Suspense>

          <Suspense fallback={<SkeletonChart height="h-80" />}>
            <ThroughputWidget
              repositoryId={repositoryId}
              dateRange={dateRange}
            />
          </Suspense>
        </div>

        {/* Right column - 1/3 width */}
        <div className="space-y-6">
          <Suspense fallback={<SkeletonChart height="h-64" />}>
            <DORAMetricsWidget
              repositoryId={repositoryId}
              dateRange={dateRange}
            />
          </Suspense>
        </div>
      </div>

      {/* Row 2: Deployment Frequency (full width) */}
      <Suspense fallback={<SkeletonChart height="h-96" />}>
        <DeploymentFrequencyWidget
          repositoryId={repositoryId}
          dateRange={dateRange}
        />
      </Suspense>
    </div>
  );
}
