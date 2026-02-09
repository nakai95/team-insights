import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { MetricCardError } from "../shared/MetricCardError";
import { getCachedPRs } from "@/app/[locale]/analytics/data-fetchers";
import type { DateRange } from "@/domain/value-objects/DateRange";
import { CalculateChangesTimeseries } from "@/application/use-cases/CalculateChangesTimeseries";
import {
  TimeseriesChart,
  TimeseriesInsights,
  EmptyState,
} from "@/presentation/components/tabs/ChangesTimeseriesTab/components";

/**
 * PRTrendsWidget Component
 *
 * Purpose: Display weekly PR activity with code changes analysis
 *
 * Features:
 * - Async Server Component (fetches data independently)
 * - Shows weekly code changes (additions/deletions) with PR count overlay
 * - Outlier week detection (statistical anomalies)
 * - Trend analysis (increasing/decreasing/stable)
 * - Summary statistics
 * - Error handling without breaking page
 *
 * Data Flow:
 * 1. Fetches PRs from GitHub API (cached)
 * 2. Calculates weekly timeseries with CalculateChangesTimeseries use case
 * 3. Renders TimeseriesChart with outliers and insights
 * 4. Fails gracefully with MetricCardError
 *
 * Usage:
 * ```typescript
 * <Suspense fallback={<SkeletonChart height="h-96" />}>
 *   <PRTrendsWidget repositoryId="owner/repo" dateRange={dateRange} />
 * </Suspense>
 * ```
 */

interface PRTrendsWidgetProps {
  /**
   * Repository identifier in "owner/repo" format
   */
  repositoryId: string;

  /**
   * Date range for filtering PRs
   */
  dateRange: DateRange;
}

export async function PRTrendsWidget({
  repositoryId,
  dateRange,
}: PRTrendsWidgetProps) {
  const t = await getTranslations("prTimeseries");

  try {
    // Fetch PRs from cached data fetcher (prevents duplicate API calls)
    const result = await getCachedPRs(repositoryId, dateRange);

    // Handle API errors
    if (!result.ok) {
      return <MetricCardError icon={TrendingUp} error={result.error.message} />;
    }

    const prs = result.value;

    // Calculate timeseries data using the use case
    const calculateChangesTimeseries = new CalculateChangesTimeseries();
    const timeseriesData = calculateChangesTimeseries.execute(prs);

    // Show empty state if no data
    const showEmptyState =
      !timeseriesData || timeseriesData.weeklyData.length === 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle id="pr-changes-timeseries-title">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>

        <CardContent className="px-2 sm:px-6">
          {showEmptyState ? (
            <EmptyState
              repositoryUrl={`https://github.com/${repositoryId}`}
              dateRange={{
                start: dateRange.start.toISOString(),
                end: dateRange.end.toISOString(),
              }}
            />
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Weekly code changes chart - responsive height */}
              <div className="w-full overflow-x-auto -mx-2 sm:mx-0">
                <div className="min-w-[600px]">
                  <TimeseriesChart
                    weeklyData={timeseriesData.weeklyData}
                    outlierWeeks={timeseriesData.outlierWeeks}
                    height={400}
                    showMovingAverage={timeseriesData.trend !== null}
                  />
                </div>
              </div>

              {/* Insights panel: outlier weeks, trend analysis, summary statistics */}
              <TimeseriesInsights
                outlierWeeks={timeseriesData.outlierWeeks}
                trend={timeseriesData.trend}
                summary={timeseriesData.summary}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  } catch (error) {
    // Handle unexpected errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return <MetricCardError icon={TrendingUp} error={errorMessage} />;
  }
}
