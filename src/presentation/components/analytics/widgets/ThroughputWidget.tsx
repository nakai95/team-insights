import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { MetricCardError } from "../shared/MetricCardError";
import { getCachedPRs } from "@/app/[locale]/analytics/data-fetchers";
import type { DateRange } from "@/domain/value-objects/DateRange";
import { PRSizeVsLeadTimeChart } from "@/presentation/components/tabs/ThroughputTab/components/PRThroughputSection/components/PRSizeVsLeadTimeChart";
import type { ScatterDataPoint } from "@/application/dto/ThroughputResult";

/**
 * ThroughputWidget Component
 *
 * Purpose: Display PR throughput analysis (size vs lead time)
 *
 * Features:
 * - Async Server Component (fetches data independently)
 * - Shows scatter plot of PR size vs lead time
 * - Helps identify optimal PR size
 * - Error handling without breaking page
 *
 * Data Flow:
 * 1. Fetches PRs from GitHub API (cached)
 * 2. Calculates size (lines changed) and lead time for merged PRs
 * 3. Renders immediately when data available
 * 4. Fails gracefully with MetricCardError
 *
 * Usage:
 * ```typescript
 * <Suspense fallback={<SkeletonChart height="h-80" />}>
 *   <ThroughputWidget repositoryId="owner/repo" dateRange={dateRange} />
 * </Suspense>
 * ```
 */

interface ThroughputWidgetProps {
  /**
   * Repository identifier in "owner/repo" format
   */
  repositoryId: string;

  /**
   * Date range for filtering PRs
   */
  dateRange: DateRange;
}

/**
 * Calculate scatter plot data points from PRs
 * Only includes merged PRs with valid lead time and size data
 */
function calculateScatterData(
  prs: Array<{
    number: number;
    additions?: number;
    deletions?: number;
    createdAt: Date;
    mergedAt?: Date;
    state: string;
  }>,
): ScatterDataPoint[] {
  return prs
    .filter(
      (pr) =>
        pr.state === "merged" &&
        pr.mergedAt !== undefined &&
        pr.additions !== undefined &&
        pr.deletions !== undefined,
    )
    .map((pr) => {
      // Calculate PR size (total lines changed)
      const size = pr.additions! + pr.deletions!;

      // Calculate lead time in hours
      const createdTime = pr.createdAt.getTime();
      const mergedTime = pr.mergedAt!.getTime();
      const leadTimeMs = mergedTime - createdTime;
      const leadTimeHours = leadTimeMs / (1000 * 60 * 60);

      return {
        prNumber: pr.number,
        size,
        leadTime: leadTimeHours,
      };
    })
    .filter((point) => point.leadTime > 0 && point.size > 0); // Filter out invalid data
}

export async function ThroughputWidget({
  repositoryId,
  dateRange,
}: ThroughputWidgetProps) {
  const t = await getTranslations("analytics.widgets.throughput");

  try {
    // Fetch PRs from cached data fetcher (prevents duplicate API calls)
    const result = await getCachedPRs(repositoryId, dateRange);

    // Handle API errors
    if (!result.ok) {
      return <MetricCardError icon={TrendingUp} error={result.error.message} />;
    }

    const prs = result.value;

    // Calculate scatter plot data
    const scatterData = calculateScatterData(prs);

    // Show empty state if no merged PRs
    if (scatterData.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t("title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              {t("emptyState")}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </CardHeader>
        <CardContent>
          <PRSizeVsLeadTimeChart data={scatterData} />
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
