import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitPullRequest } from "lucide-react";
import { MetricCardError } from "../shared/MetricCardError";
import { getCachedPRs } from "@/app/[locale]/analytics/data-fetchers";
import type { DateRange } from "@/domain/value-objects/DateRange";

/**
 * PRCountWidget Component
 *
 * Purpose: Display pull request metrics in a compact card
 *
 * Features:
 * - Async Server Component (fetches data independently)
 * - Shows total PR count
 * - Shows merged count and merge rate percentage
 * - Error handling without breaking page
 *
 * Data Flow:
 * 1. Fetches PRs from GitHub API
 * 2. Calculates merged count and merge rate
 * 3. Renders immediately when data available
 * 4. Fails gracefully with MetricCardError
 *
 * Usage:
 * ```typescript
 * <Suspense fallback={<MetricCardSkeleton />}>
 *   <PRCountWidget repositoryId="owner/repo" dateRange={dateRange} />
 * </Suspense>
 * ```
 */

interface PRCountWidgetProps {
  /**
   * Repository identifier in "owner/repo" format
   */
  repositoryId: string;

  /**
   * Date range for filtering PRs
   */
  dateRange: DateRange;
}

export async function PRCountWidget({
  repositoryId,
  dateRange,
}: PRCountWidgetProps) {
  const t = await getTranslations("analytics.widgets.pullRequests");

  try {
    // Fetch PRs from cached data fetcher (prevents duplicate API calls)
    const result = await getCachedPRs(repositoryId, dateRange);

    // Handle API errors
    if (!result.ok) {
      return (
        <MetricCardError icon={GitPullRequest} error={result.error.message} />
      );
    }

    const prs = result.value;
    const mergedCount = prs.filter((pr) => pr.state === "merged").length;
    const mergeRate =
      prs.length > 0 ? Math.round((mergedCount / prs.length) * 100) : 0;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("title")}</CardTitle>
          <GitPullRequest className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{prs.length}</div>
          <p className="text-xs text-muted-foreground">
            {t("merged", { count: mergedCount })} ({mergeRate}%)
          </p>
        </CardContent>
      </Card>
    );
  } catch (error) {
    // Handle unexpected errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return <MetricCardError icon={GitPullRequest} error={errorMessage} />;
  }
}
