import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitCommit } from "lucide-react";
import { MetricCardError } from "../shared/MetricCardError";
import { getCachedCommits } from "@/app/[locale]/analytics/data-fetchers";
import type { DateRange } from "@/domain/value-objects/DateRange";

/**
 * CommitCountWidget Component
 *
 * Purpose: Display commit metrics in a compact card
 *
 * Features:
 * - Async Server Component (fetches data independently)
 * - Shows total commit count
 * - Shows active days (days with at least one commit)
 * - Error handling without breaking page
 *
 * Usage:
 * ```typescript
 * <Suspense fallback={<MetricCardSkeleton />}>
 *   <CommitCountWidget repositoryId="owner/repo" dateRange={dateRange} />
 * </Suspense>
 * ```
 */

interface CommitCountWidgetProps {
  repositoryId: string;
  dateRange: DateRange;
}

export async function CommitCountWidget({
  repositoryId,
  dateRange,
}: CommitCountWidgetProps) {
  const t = await getTranslations("analytics.widgets.commits");

  try {
    // Fetch commits from cached data fetcher (prevents duplicate API calls)
    const result = await getCachedCommits(repositoryId, dateRange);

    // Handle API errors
    if (!result.ok) {
      return <MetricCardError icon={GitCommit} error={result.error.message} />;
    }

    const commits = result.value;

    // Calculate active days (unique dates with commits)
    const uniqueDates = new Set(
      commits.map((commit) => commit.date.toDateString()),
    );
    const activeDays = uniqueDates.size;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("title")}</CardTitle>
          <GitCommit className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{commits.length}</div>
          <p className="text-xs text-muted-foreground">
            {t("activeDays", { count: activeDays })}
          </p>
        </CardContent>
      </Card>
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return <MetricCardError icon={GitCommit} error={errorMessage} />;
  }
}
