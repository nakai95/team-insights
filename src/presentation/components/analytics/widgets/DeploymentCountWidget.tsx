import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket } from "lucide-react";
import { MetricCardError } from "../shared/MetricCardError";
import { getCachedDeployments } from "@/app/[locale]/analytics/data-fetchers";
import type { DateRange } from "@/domain/value-objects/DateRange";

/**
 * DeploymentCountWidget Component
 *
 * Purpose: Display deployment metrics in a compact card
 *
 * Features:
 * - Async Server Component (fetches data independently)
 * - Shows total deployment count
 * - Handles empty deployment data gracefully
 * - Error handling without breaking page
 *
 * Usage:
 * ```typescript
 * <Suspense fallback={<MetricCardSkeleton />}>
 *   <DeploymentCountWidget repositoryId="owner/repo" dateRange={dateRange} />
 * </Suspense>
 * ```
 */

interface DeploymentCountWidgetProps {
  repositoryId: string;
  dateRange: DateRange;
}

export async function DeploymentCountWidget({
  repositoryId,
  dateRange,
}: DeploymentCountWidgetProps) {
  const t = await getTranslations("analytics.widgets.deployments");

  try {
    // Fetch deployments from cached data fetcher (prevents duplicate API calls)
    const result = await getCachedDeployments(repositoryId, dateRange);

    // Handle API errors
    if (!result.ok) {
      return <MetricCardError icon={Rocket} error={result.error.message} />;
    }

    const deployments = result.value;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("title")}</CardTitle>
          <Rocket className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{deployments.length}</div>
          <p className="text-xs text-muted-foreground">
            {t("total", { count: deployments.length })}
          </p>
        </CardContent>
      </Card>
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return <MetricCardError icon={Rocket} error={errorMessage} />;
  }
}
