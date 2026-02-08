import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { MetricCardError } from "../shared/MetricCardError";
import { getCachedCommits } from "@/app/[locale]/analytics/data-fetchers";
import type { DateRange } from "@/domain/value-objects/DateRange";

/**
 * ContributorCountWidget Component
 *
 * Purpose: Display contributor metrics in a compact card
 *
 * Features:
 * - Async Server Component (fetches data independently)
 * - Shows unique contributor count
 * - Extracts contributors from commit data
 * - Error handling without breaking page
 *
 * Usage:
 * ```typescript
 * <Suspense fallback={<MetricCardSkeleton />}>
 *   <ContributorCountWidget repositoryId="owner/repo" dateRange={dateRange} />
 * </Suspense>
 * ```
 */

interface ContributorCountWidgetProps {
  repositoryId: string;
  dateRange: DateRange;
}

export async function ContributorCountWidget({
  repositoryId,
  dateRange,
}: ContributorCountWidgetProps) {
  const t = await getTranslations("analytics.widgets.contributors");

  try {
    // Fetch commits from cached data fetcher (shared with CommitCountWidget)
    // This prevents duplicate API calls when both widgets are rendered
    const result = await getCachedCommits(repositoryId, dateRange);

    // Handle API errors
    if (!result.ok) {
      return <MetricCardError icon={Users} error={result.error.message} />;
    }

    const commits = result.value;

    // Extract unique contributors (author is already a string)
    const uniqueContributors = new Set(commits.map((commit) => commit.author));
    const contributorCount = uniqueContributors.size;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("title")}</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{contributorCount}</div>
          <p className="text-xs text-muted-foreground">
            {t("active", { count: contributorCount })}
          </p>
        </CardContent>
      </Card>
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return <MetricCardError icon={Users} error={errorMessage} />;
  }
}
