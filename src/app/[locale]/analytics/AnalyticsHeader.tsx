import { getTranslations } from "next-intl/server";
import type { DateRange } from "@/domain/value-objects/DateRange";

/**
 * AnalyticsHeader Component
 *
 * Purpose: Static header displaying repository information and date range
 *
 * Features:
 * - Displays repository name
 * - Shows analysis period
 * - Server Component (no loading state needed)
 * - Consistent with dashboard design patterns
 *
 * Usage:
 * ```typescript
 * <AnalyticsHeader repositoryId="owner/repo" dateRange={dateRange} />
 * ```
 */

interface AnalyticsHeaderProps {
  /**
   * Repository identifier in "owner/repo" format
   * Example: "facebook/react"
   */
  repositoryId: string;

  /**
   * Date range for the analytics data
   */
  dateRange: DateRange;
}

export async function AnalyticsHeader({
  repositoryId,
  dateRange,
}: AnalyticsHeaderProps) {
  const t = await getTranslations("analytics");

  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-medium">{t("header.repository")}:</span>
          <span className="font-mono">{repositoryId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{t("header.period")}:</span>
          <span>
            {dateRange.start.toLocaleDateString()} -{" "}
            {dateRange.end.toLocaleDateString()}
            <span className="ml-1 text-muted-foreground/70">
              ({dateRange.durationInDays} days)
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
