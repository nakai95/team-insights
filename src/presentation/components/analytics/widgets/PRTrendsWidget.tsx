import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { MetricCardError } from "../shared/MetricCardError";
import { getCachedPRs } from "@/app/[locale]/analytics/data-fetchers";
import type { DateRange } from "@/domain/value-objects/DateRange";
import { PRTrendsChart } from "./components/PRTrendsChart";

/**
 * PRTrendsWidget Component
 *
 * Purpose: Display weekly PR volume trends in a line chart
 *
 * Features:
 * - Async Server Component (fetches data independently)
 * - Shows weekly PR count over time
 * - Line chart visualization
 * - Error handling without breaking page
 *
 * Data Flow:
 * 1. Fetches PRs from GitHub API (cached)
 * 2. Aggregates PRs by week
 * 3. Renders immediately when data available
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

interface WeeklyData {
  weekStart: string;
  prCount: number;
}

/**
 * Aggregate PRs by week
 * Groups PRs by their creation week and counts them
 */
function aggregateByWeek(
  prs: Array<{ createdAt: Date }>,
  dateRange: DateRange,
): WeeklyData[] {
  // Create a map to store PR counts per week
  const weekMap = new Map<string, number>();

  // Process each PR
  for (const pr of prs) {
    // Get the start of the week (Monday)
    const weekStart = getWeekStart(pr.createdAt);
    const weekKey = weekStart.toISOString().split("T")[0]!;

    // Increment count for this week
    weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
  }

  // Convert map to sorted array
  const weeklyData: WeeklyData[] = [];

  // Generate all weeks in the date range
  let currentWeek = getWeekStart(dateRange.start);
  const endWeek = getWeekStart(dateRange.end);

  while (currentWeek <= endWeek) {
    const weekKey = currentWeek.toISOString().split("T")[0]!;
    weeklyData.push({
      weekStart: weekKey,
      prCount: weekMap.get(weekKey) || 0,
    });

    // Move to next week (create new Date object)
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(currentWeek.getDate() + 7);
    currentWeek = nextWeek;
  }

  return weeklyData;
}

/**
 * Get the start of the week (Monday) for a given date
 * Returns a new Date object set to Monday 00:00:00
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0); // Reset time to midnight

  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1, Sunday = 0

  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() + diff);
  return weekStart;
}

export async function PRTrendsWidget({
  repositoryId,
  dateRange,
}: PRTrendsWidgetProps) {
  const t = await getTranslations("analytics.widgets.prTrends");

  try {
    // Fetch PRs from cached data fetcher (prevents duplicate API calls)
    const result = await getCachedPRs(repositoryId, dateRange);

    // Handle API errors
    if (!result.ok) {
      return <MetricCardError icon={TrendingUp} error={result.error.message} />;
    }

    const prs = result.value;

    // Debug logging
    console.log("[PRTrendsWidget] Total PRs fetched:", prs.length);
    console.log("[PRTrendsWidget] Date range:", {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString(),
    });

    // Aggregate PRs by week
    const weeklyData = aggregateByWeek(prs, dateRange);

    console.log("[PRTrendsWidget] Weekly data points:", weeklyData.length);
    console.log("[PRTrendsWidget] Weekly data:", weeklyData);

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
          <PRTrendsChart data={weeklyData} />
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
