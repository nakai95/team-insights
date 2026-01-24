"use client";

import { TimeseriesResult } from "@/application/dto/TimeseriesResult";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";

// Child components
import { EmptyState } from "./ChangesTimeseriesTab/EmptyState";
import { TimeseriesChart } from "./ChangesTimeseriesTab/TimeseriesChart";
// import { TimeseriesInsights } from "./ChangesTimeseriesTab/TimeseriesInsights";

export interface ChangesTimeseriesTabProps {
  /** Timeseries analysis data (optional, null if not available) */
  timeseriesData?: TimeseriesResult | null;
  /** Repository URL for context display */
  repositoryUrl: string;
  /** Date range for context display */
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * Changes Timeseries Tab Component
 *
 * Displays weekly PR code changes visualization with:
 * - Weekly stacked area chart (additions/deletions)
 * - PR count bar overlay
 * - Outlier week detection and highlighting
 * - Trend analysis (increasing/decreasing/stable)
 * - Summary statistics
 * - Empty state when no merged PRs available
 *
 * This component implements User Story 1 (US1) from the feature specification.
 */
export function ChangesTimeseriesTab({
  timeseriesData,
  repositoryUrl,
  dateRange,
}: ChangesTimeseriesTabProps) {
  const t = useTranslations("prTimeseries");

  // Show empty state if no data or no weekly data
  const showEmptyState =
    !timeseriesData || timeseriesData.weeklyData.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle id="pr-changes-timeseries-title">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <CardContent>
        {showEmptyState ? (
          <EmptyState repositoryUrl={repositoryUrl} dateRange={dateRange} />
        ) : (
          <div className="space-y-6">
            {/* Weekly code changes chart */}
            <TimeseriesChart
              weeklyData={timeseriesData.weeklyData}
              outlierWeeks={timeseriesData.outlierWeeks}
              height={400}
            />

            {/* Placeholder for TimeseriesInsights component (future tasks T023-T034) */}
            <div className="text-center py-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground">
                Insights panel coming soon (T023-T034)
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
