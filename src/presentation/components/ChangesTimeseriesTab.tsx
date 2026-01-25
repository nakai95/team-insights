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
import { TimeseriesInsights } from "./ChangesTimeseriesTab/TimeseriesInsights";

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

      <CardContent className="px-2 sm:px-6">
        {showEmptyState ? (
          <EmptyState repositoryUrl={repositoryUrl} dateRange={dateRange} />
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Weekly code changes chart - responsive height */}
            <div className="w-full overflow-x-auto -mx-2 sm:mx-0">
              <div className="min-w-[600px]">
                <TimeseriesChart
                  weeklyData={timeseriesData.weeklyData}
                  outlierWeeks={timeseriesData.outlierWeeks}
                  height={400}
                  showMovingAverage={timeseriesData.trend !== null}
                />
              </div>
            </div>

            {/* Insights panel: outlier weeks, trend analysis, summary statistics */}
            <TimeseriesInsights
              outlierWeeks={timeseriesData.outlierWeeks}
              trend={timeseriesData.trend}
              summary={timeseriesData.summary}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
