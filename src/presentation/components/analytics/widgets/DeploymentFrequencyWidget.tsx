import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { MetricCardError } from "../shared/MetricCardError";
import { getCachedDeployments } from "@/app/[locale]/(app)/analytics/_lib/data-fetchers";
import type { DateRange } from "@/domain/value-objects/DateRange";
import { DeploymentFrequencyBarChart } from "./components/DeploymentFrequencyBarChart";
import { format, startOfWeek, startOfMonth } from "date-fns";

/**
 * DeploymentFrequencyWidget Component
 *
 * Purpose: Display deployment timeline and frequency trends
 *
 * Features:
 * - Async Server Component (fetches data independently)
 * - Shows weekly or monthly deployment counts in a bar chart
 * - Automatically chooses aggregation level based on date range
 * - Full-width timeline visualization
 * - Error handling without breaking page
 *
 * Data Flow:
 * 1. Fetches deployments from GitHub API (cached)
 * 2. Aggregates by week or month depending on range length
 * 3. Renders immediately when data available
 * 4. Fails gracefully with MetricCardError
 *
 * Usage:
 * ```typescript
 * <Suspense fallback={<SkeletonChart height="h-96" />}>
 *   <DeploymentFrequencyWidget repositoryId="owner/repo" dateRange={dateRange} />
 * </Suspense>
 * ```
 */

interface DeploymentFrequencyWidgetProps {
  /**
   * Repository identifier in "owner/repo" format
   */
  repositoryId: string;

  /**
   * Date range for filtering deployments
   */
  dateRange: DateRange;
}

interface WeeklyData {
  weekStart: string;
  deploymentCount: number;
}

interface MonthlyData {
  monthKey: string;
  monthName: string;
  deploymentCount: number;
}

type AggregationLevel = "weekly" | "monthly";

/**
 * Determine aggregation level based on date range length
 * Use monthly aggregation for ranges > 90 days, weekly otherwise
 */
function getAggregationLevel(dateRange: DateRange): AggregationLevel {
  const days =
    (dateRange.end.getTime() - dateRange.start.getTime()) /
    (1000 * 60 * 60 * 24);
  return days > 90 ? "monthly" : "weekly";
}

/**
 * Aggregate deployments by week
 */
function aggregateByWeek(
  deployments: Array<{ timestamp: Date }>,
  dateRange: DateRange,
): WeeklyData[] {
  const weekMap = new Map<string, number>();

  // Process each deployment
  for (const deployment of deployments) {
    const weekStart = startOfWeek(deployment.timestamp, { weekStartsOn: 1 }); // Monday
    const weekKey = format(weekStart, "yyyy-MM-dd");
    weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
  }

  // Generate all weeks in the date range
  const weeklyData: WeeklyData[] = [];
  let currentWeek = startOfWeek(dateRange.start, { weekStartsOn: 1 });
  const endWeek = startOfWeek(dateRange.end, { weekStartsOn: 1 });

  while (currentWeek <= endWeek) {
    const weekKey = format(currentWeek, "yyyy-MM-dd");
    weeklyData.push({
      weekStart: weekKey,
      deploymentCount: weekMap.get(weekKey) || 0,
    });

    // Move to next week
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(currentWeek.getDate() + 7);
    currentWeek = nextWeek;
  }

  return weeklyData;
}

/**
 * Aggregate deployments by month
 */
function aggregateByMonth(
  deployments: Array<{ timestamp: Date }>,
  dateRange: DateRange,
): MonthlyData[] {
  const monthMap = new Map<string, number>();

  // Process each deployment
  for (const deployment of deployments) {
    const monthStart = startOfMonth(deployment.timestamp);
    const monthKey = format(monthStart, "yyyy-MM");
    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
  }

  // Generate all months in the date range
  const monthlyData: MonthlyData[] = [];
  let currentMonth = startOfMonth(dateRange.start);
  const endMonth = startOfMonth(dateRange.end);

  while (currentMonth <= endMonth) {
    const monthKey = format(currentMonth, "yyyy-MM");
    monthlyData.push({
      monthKey,
      monthName: format(currentMonth, "MMM yyyy"),
      deploymentCount: monthMap.get(monthKey) || 0,
    });

    // Move to next month
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(currentMonth.getMonth() + 1);
    currentMonth = nextMonth;
  }

  return monthlyData;
}

export async function DeploymentFrequencyWidget({
  repositoryId,
  dateRange,
}: DeploymentFrequencyWidgetProps) {
  const t = await getTranslations("analytics.widgets.deploymentFrequency");

  try {
    // Fetch deployments from cached data fetcher (prevents duplicate API calls)
    const result = await getCachedDeployments(repositoryId, dateRange);

    // Handle API errors
    if (!result.ok) {
      return <MetricCardError icon={Calendar} error={result.error.message} />;
    }

    const deployments = result.value;

    // Determine aggregation level
    const aggregationLevel = getAggregationLevel(dateRange);

    // Transform deployments to match expected format (timestamp: Date)
    const deploymentsWithTimestamp = deployments.map((d) => ({
      timestamp: new Date(d.createdAt),
    }));

    // Aggregate data based on chosen level
    const aggregatedData =
      aggregationLevel === "monthly"
        ? aggregateByMonth(deploymentsWithTimestamp, dateRange)
        : aggregateByWeek(deploymentsWithTimestamp, dateRange);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </CardHeader>
        <CardContent>
          <DeploymentFrequencyBarChart
            data={aggregatedData}
            aggregationLevel={aggregationLevel}
          />
        </CardContent>
      </Card>
    );
  } catch (error) {
    // Handle unexpected errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return <MetricCardError icon={Calendar} error={errorMessage} />;
  }
}
