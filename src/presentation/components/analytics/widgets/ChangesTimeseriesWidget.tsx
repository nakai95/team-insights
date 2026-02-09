import { getTranslations } from "next-intl/server";
import { MetricCardError } from "../shared/MetricCardError";
import { getCachedPRs } from "@/app/[locale]/analytics/data-fetchers";
import type { DateRange } from "@/domain/value-objects/DateRange";
import { CalculateChangesTimeseries } from "@/application/use-cases/CalculateChangesTimeseries";
import { TrendingUp } from "lucide-react";
import { ChangesTimeseriesTab } from "@/presentation/components/tabs/ChangesTimeseriesTab/ChangesTimeseriesTab";

/**
 * ChangesTimeseriesWidget Component
 *
 * Purpose: Display weekly PR code changes visualization
 *
 * Features:
 * - Async Server Component (fetches data independently)
 * - Shows weekly additions/deletions with PR count overlay
 * - Outlier week detection
 * - Trend analysis
 * - Error handling without breaking page
 *
 * Data Flow:
 * 1. Fetches PRs from GitHub API (cached)
 * 2. Calculates weekly timeseries data
 * 3. Renders ChangesTimeseriesTab component
 * 4. Fails gracefully with MetricCardError
 *
 * Usage:
 * ```typescript
 * <Suspense fallback={<SkeletonChart height="h-96" />}>
 *   <ChangesTimeseriesWidget repositoryId="owner/repo" dateRange={dateRange} />
 * </Suspense>
 * ```
 */

interface ChangesTimeseriesWidgetProps {
  /**
   * Repository identifier in "owner/repo" format
   */
  repositoryId: string;

  /**
   * Date range for filtering PRs
   */
  dateRange: DateRange;
}

export async function ChangesTimeseriesWidget({
  repositoryId,
  dateRange,
}: ChangesTimeseriesWidgetProps) {
  const t = await getTranslations("analytics.widgets");

  try {
    // Fetch PRs from cached data fetcher (prevents duplicate API calls)
    const result = await getCachedPRs(repositoryId, dateRange);

    // Handle API errors
    if (!result.ok) {
      return <MetricCardError icon={TrendingUp} error={result.error.message} />;
    }

    const prs = result.value;

    // Calculate timeseries data (use case will filter merged PRs internally)
    const calculateChangesTimeseries = new CalculateChangesTimeseries();
    const timeseriesResult = calculateChangesTimeseries.execute(prs);

    // Prepare repository URL and date range for component
    const repositoryUrl = `https://github.com/${repositoryId}`;
    const dateRangeFormatted = {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString(),
    };

    return (
      <ChangesTimeseriesTab
        timeseriesData={timeseriesResult}
        repositoryUrl={repositoryUrl}
        dateRange={dateRangeFormatted}
      />
    );
  } catch (error) {
    // Handle unexpected errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return <MetricCardError icon={TrendingUp} error={errorMessage} />;
  }
}
