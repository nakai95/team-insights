import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { MetricCardError } from "../shared/MetricCardError";
import {
  getCachedPRs,
  getCachedCommits,
} from "@/app/[locale]/analytics/data-fetchers";
import type { DateRange } from "@/domain/value-objects/DateRange";
import { Badge } from "@/components/ui/badge";

/**
 * TopContributorsWidget Component
 *
 * Purpose: Display top 10 contributors by activity
 *
 * Features:
 * - Async Server Component (fetches data independently)
 * - Shows top contributors ranked by combined activity
 * - Activity = commit count + PR count
 * - Displays commits and PRs separately
 * - Error handling without breaking page
 *
 * Data Flow:
 * 1. Fetches PRs and Commits from GitHub API (cached)
 * 2. Aggregates activity by contributor
 * 3. Sorts by total activity and takes top 10
 * 4. Renders immediately when data available
 * 5. Fails gracefully with MetricCardError
 *
 * Usage:
 * ```typescript
 * <Suspense fallback={<SkeletonChart height="h-64" />}>
 *   <TopContributorsWidget repositoryId="owner/repo" dateRange={dateRange} />
 * </Suspense>
 * ```
 */

interface TopContributorsWidgetProps {
  /**
   * Repository identifier in "owner/repo" format
   */
  repositoryId: string;

  /**
   * Date range for filtering activity
   */
  dateRange: DateRange;
}

interface ContributorActivity {
  name: string;
  commits: number;
  prs: number;
  total: number;
}

/**
 * Aggregate activity by contributor
 */
function aggregateActivity(
  prs: Array<{ author: string }>,
  commits: Array<{ author: string }>,
): ContributorActivity[] {
  // Create a map to store activity per contributor
  const activityMap = new Map<string, { commits: number; prs: number }>();

  // Count PRs per contributor
  for (const pr of prs) {
    const current = activityMap.get(pr.author) || { commits: 0, prs: 0 };
    current.prs += 1;
    activityMap.set(pr.author, current);
  }

  // Count commits per contributor
  for (const commit of commits) {
    const current = activityMap.get(commit.author) || { commits: 0, prs: 0 };
    current.commits += 1;
    activityMap.set(commit.author, current);
  }

  // Convert map to array and sort by total activity
  const contributors: ContributorActivity[] = Array.from(activityMap.entries())
    .map(([name, activity]) => ({
      name,
      commits: activity.commits,
      prs: activity.prs,
      total: activity.commits + activity.prs,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10); // Top 10

  return contributors;
}

export async function TopContributorsWidget({
  repositoryId,
  dateRange,
}: TopContributorsWidgetProps) {
  const t = await getTranslations("analytics.widgets.topContributors");

  try {
    // Fetch PRs and Commits from cached data fetchers (prevents duplicate API calls)
    const [prsResult, commitsResult] = await Promise.all([
      getCachedPRs(repositoryId, dateRange),
      getCachedCommits(repositoryId, dateRange),
    ]);

    // Handle API errors
    if (!prsResult.ok) {
      return <MetricCardError icon={Users} error={prsResult.error.message} />;
    }
    if (!commitsResult.ok) {
      return (
        <MetricCardError icon={Users} error={commitsResult.error.message} />
      );
    }

    const prs = prsResult.value;
    const commits = commitsResult.value;

    // Aggregate activity
    const contributors = aggregateActivity(prs, commits);

    // Show empty state if no activity
    if (contributors.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("title")}
            </CardTitle>
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
            <Users className="h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {contributors.map((contributor, index) => (
              <div
                key={contributor.name}
                className="flex items-center gap-3 pb-3 border-b last:border-0"
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-6 text-center font-semibold text-muted-foreground">
                  {index + 1}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{contributor.name}</p>
                </div>

                {/* Activity badges */}
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {t("commits", { count: contributor.commits })}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {t("prs", { count: contributor.prs })}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  } catch (error) {
    // Handle unexpected errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return <MetricCardError icon={Users} error={errorMessage} />;
  }
}
