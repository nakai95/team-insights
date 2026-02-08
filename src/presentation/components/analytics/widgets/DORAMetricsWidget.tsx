import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";
import { MetricCardError } from "../shared/MetricCardError";
import { getCachedDeployments } from "@/app/[locale]/analytics/data-fetchers";
import type { DateRange } from "@/domain/value-objects/DateRange";
import { Badge } from "@/components/ui/badge";

/**
 * DORAMetricsWidget Component
 *
 * Purpose: Display DORA deployment frequency metrics
 *
 * Features:
 * - Async Server Component (fetches data independently)
 * - Shows DORA deployment frequency level
 * - Displays deployment count and frequency
 * - Color-coded badges for performance levels
 * - Error handling without breaking page
 *
 * DORA Levels:
 * - Elite: Multiple deploys per day
 * - High: Once per day to once per week
 * - Medium: Once per week to once per month
 * - Low: Once per month to once every 6 months
 *
 * Data Flow:
 * 1. Fetches deployments from GitHub API (cached)
 * 2. Calculates deployment frequency
 * 3. Determines DORA level
 * 4. Renders immediately when data available
 * 5. Fails gracefully with MetricCardError
 *
 * Usage:
 * ```typescript
 * <Suspense fallback={<SkeletonChart height="h-64" />}>
 *   <DORAMetricsWidget repositoryId="owner/repo" dateRange={dateRange} />
 * </Suspense>
 * ```
 */

interface DORAMetricsWidgetProps {
  /**
   * Repository identifier in "owner/repo" format
   */
  repositoryId: string;

  /**
   * Date range for filtering deployments
   */
  dateRange: DateRange;
}

type DORALevel = "Elite" | "High" | "Medium" | "Low";

interface DORAMetrics {
  level: DORALevel;
  deploymentCount: number;
  deploymentsPerDay: number;
  description: string;
}

/**
 * Calculate DORA deployment frequency metrics
 */
function calculateDORAMetrics(
  deployments: Array<{ timestamp: Date }>,
  dateRange: DateRange,
): DORAMetrics {
  const deploymentCount = deployments.length;

  // Calculate days in range
  const startTime = dateRange.start.getTime();
  const endTime = dateRange.end.getTime();
  const daysInRange = Math.max(
    1,
    (endTime - startTime) / (1000 * 60 * 60 * 24),
  );

  // Calculate deployments per day
  const deploymentsPerDay = deploymentCount / daysInRange;

  // Determine DORA level based on frequency
  let level: DORALevel;
  let description: string;

  if (deploymentsPerDay >= 1) {
    level = "Elite";
    description = "Multiple deploys per day";
  } else if (deploymentsPerDay >= 1 / 7) {
    level = "High";
    description = "Once per day to once per week";
  } else if (deploymentsPerDay >= 1 / 30) {
    level = "Medium";
    description = "Once per week to once per month";
  } else {
    level = "Low";
    description = "Less than once per month";
  }

  return {
    level,
    deploymentCount,
    deploymentsPerDay,
    description,
  };
}

/**
 * Get badge variant for DORA level
 */
function getBadgeVariant(
  level: DORALevel,
): "default" | "secondary" | "outline" {
  switch (level) {
    case "Elite":
      return "default";
    case "High":
      return "secondary";
    case "Medium":
    case "Low":
      return "outline";
  }
}

export async function DORAMetricsWidget({
  repositoryId,
  dateRange,
}: DORAMetricsWidgetProps) {
  const t = await getTranslations("analytics.widgets.doraMetrics");

  try {
    // Fetch deployments from cached data fetcher (prevents duplicate API calls)
    const result = await getCachedDeployments(repositoryId, dateRange);

    // Handle API errors
    if (!result.ok) {
      return <MetricCardError icon={Gauge} error={result.error.message} />;
    }

    const deployments = result.value;

    // Calculate DORA metrics
    const metrics = calculateDORAMetrics(deployments, dateRange);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* DORA Level Badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t("deploymentFrequency")}
              </span>
              <Badge
                variant={getBadgeVariant(metrics.level)}
                className="text-sm"
              >
                {t("level", { level: metrics.level })}
              </Badge>
            </div>

            {/* Deployment Count */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t("totalDeployments", { count: metrics.deploymentCount })}
              </span>
              <span className="text-2xl font-bold">
                {metrics.deploymentCount}
              </span>
            </div>

            {/* Frequency Description */}
            <div className="text-sm text-muted-foreground pt-2 border-t">
              {metrics.description}
            </div>

            {/* Deployments per day (if useful) */}
            {metrics.deploymentsPerDay < 1 && (
              <div className="text-xs text-muted-foreground">
                {t("frequency", {
                  frequency: metrics.deploymentsPerDay.toFixed(2),
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  } catch (error) {
    // Handle unexpected errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return <MetricCardError icon={Gauge} error={errorMessage} />;
  }
}
