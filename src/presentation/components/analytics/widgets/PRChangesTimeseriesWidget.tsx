import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { MetricCardError } from "../shared/MetricCardError";
import { getCachedPRs } from "@/app/[locale]/analytics/data-fetchers";
import type { DateRange } from "@/domain/value-objects/DateRange";
import { CalculateChangesTimeseries } from "@/application/use-cases/CalculateChangesTimeseries";
import { TimeseriesChart } from "@/presentation/components/tabs/ChangesTimeseriesTab/components/TimeseriesChart";
import { TimeseriesInsights } from "@/presentation/components/tabs/ChangesTimeseriesTab/components/TimeseriesInsights";

/**
 * PR Changes Timeseries Widget Component
 *
 * Purpose: Display weekly PR code changes visualization
 *
 * Features:
 * - Async Server Component (fetches data independently)
 * - Shows weekly stacked area chart (additions/deletions)
 * - PR count bar overlay
 * - Outlier week detection and highlighting
 * - Trend analysis (increasing/decreasing/stable)
 * - Summary statistics
 * - Empty state when no merged PRs available
 * - Error handling without breaking page
 *
 * Data Flow:
 * 1. Fetches PRs from GitHub API (cached)
 * 2. Analyzes timeseries using CalculateChangesTimeseries
 * 3. Renders chart with insights
 */

interface PRChangesTimeseriesWidgetProps {
  /**
   * Repository identifier in "owner/repo" format
   */
  repositoryId: string;

  /**
   * Date range for filtering PRs
   */
  dateRange: DateRange;
}

export async function PRChangesTimeseriesWidget({
  repositoryId,
  dateRange,
}: PRChangesTimeseriesWidgetProps) {
  const t = await getTranslations("analytics.widgets.prChangesTimeseries");

  try {
    // Fetch PRs from cached data fetcher (prevents duplicate API calls)
    const result = await getCachedPRs(repositoryId, dateRange);

    // Handle API errors
    if (!result.ok) {
      return <MetricCardError icon={TrendingUp} error={result.error.message} />;
    }

    const prs = result.value;

    // Calculate timeseries using use case
    const timeseriesCalculator = new CalculateChangesTimeseries();
    const timeseriesData = timeseriesCalculator.execute(prs);

    // Show empty state if no weekly data
    const showEmptyState = timeseriesData.weeklyData.length === 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {showEmptyState ? (
            <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Weekly code changes chart - responsive height */}
              <div className="w-full overflow-x-auto -mx-2 sm:mx-0">
                <div className="min-w-[600px]">
                  <TimeseriesChart
                    weeklyData={timeseriesData.weeklyData}
                    outlierWeeks={timeseriesData.outlierWeeks}
                    height={300}
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
