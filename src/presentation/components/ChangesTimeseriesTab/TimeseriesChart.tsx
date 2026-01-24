"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import {
  WeeklyAggregateDto,
  OutlierWeekDto,
} from "@/application/dto/TimeseriesResult";

/**
 * Custom Tooltip Props for Recharts
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<Payload<number, string>>;
  label?: string | number;
}

/**
 * Custom Tooltip Component for Timeseries Chart
 *
 * Displays detailed metrics when hovering over chart data points:
 * - Week date range
 * - Additions (lines added)
 * - Deletions (lines deleted)
 * - Total changes
 * - PR count
 * - Average PR size
 */
function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  const t = useTranslations("prTimeseries.tooltip");

  if (active && payload && payload.length > 0 && payload[0]) {
    const data = payload[0].payload as WeeklyAggregateDto;

    // Format week start date
    const weekDate = new Date(data.weekStart).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg dark:bg-gray-800 dark:border-gray-600">
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t("week", { date: weekDate })}
        </p>
        <div className="space-y-1 text-sm">
          <p className="text-green-600 dark:text-green-400">
            {t("additions", { count: data.additions.toLocaleString() })}
          </p>
          <p className="text-red-600 dark:text-red-400">
            {t("deletions", { count: data.deletions.toLocaleString() })}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            {t("totalChanges", { count: data.totalChanges.toLocaleString() })}
          </p>
          <p className="text-blue-600 dark:text-blue-400">
            {t("prCount", { count: data.prCount })}
          </p>
          <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
            {t("averagePRSize", {
              size: Math.round(data.averagePRSize).toLocaleString(),
            })}
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export interface TimeseriesChartProps {
  /** Weekly aggregated data for chart display */
  weeklyData: WeeklyAggregateDto[];
  /** Outlier weeks for visual highlighting */
  outlierWeeks: OutlierWeekDto[];
  /** Chart height in pixels (default: 400) */
  height?: number;
  /** Whether to show 4-week moving average line (default: false for MVP) */
  showMovingAverage?: boolean;
}

/**
 * Timeseries Chart Component
 *
 * Displays weekly PR code changes visualization with:
 * - Stacked area chart for additions (green) and deletions (red)
 * - Bar chart overlay for PR counts (blue)
 * - Dual Y-axes (left: lines changed, right: PR count)
 * - Custom tooltip with detailed metrics
 * - Outlier week highlighting (visual markers)
 *
 * Uses Recharts ComposedChart to combine multiple chart types.
 */
export const TimeseriesChart = React.memo(function TimeseriesChart({
  weeklyData,
  outlierWeeks,
  height = 400,
  showMovingAverage = false,
}: TimeseriesChartProps) {
  const t = useTranslations("prTimeseries.chart");

  /**
   * Format date for X-axis display
   * Shows abbreviated date (e.g., "Jan 20")
   */
  const formatXAxis = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  /**
   * Format Y-axis values with commas for thousands
   */
  const formatYAxis = (value: number): string => {
    return value.toLocaleString();
  };

  /**
   * Create set of outlier week start dates for quick lookup
   */
  const outlierWeekStarts = React.useMemo(() => {
    return new Set(outlierWeeks.map((outlier) => outlier.weekStart));
  }, [outlierWeeks]);

  /**
   * Check if a week is an outlier
   */
  const isOutlierWeek = (weekStart: string): boolean => {
    return outlierWeekStarts.has(weekStart);
  };

  // Color scheme following GitHub diff conventions
  const ADDITIONS_COLOR = "#22c55e"; // Green 500
  const ADDITIONS_STROKE = "#16a34a"; // Green 600
  const DELETIONS_COLOR = "#ef4444"; // Red 500
  const DELETIONS_STROKE = "#dc2626"; // Red 600
  const PR_COUNT_COLOR = "#3b82f6"; // Blue 500

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={weeklyData}
        margin={{
          top: 20,
          right: 60,
          left: 20,
          bottom: 60,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />

        {/* X-Axis: Week dates */}
        <XAxis
          dataKey="weekStart"
          tickFormatter={formatXAxis}
          angle={-45}
          textAnchor="end"
          height={80}
          label={{
            value: t("xAxisLabel"),
            position: "insideBottom",
            offset: -10,
          }}
        />

        {/* Left Y-Axis: Lines changed */}
        <YAxis
          yAxisId="left"
          tickFormatter={formatYAxis}
          label={{
            value: t("yAxisLabelLeft"),
            angle: -90,
            position: "insideLeft",
            offset: -10,
          }}
        />

        {/* Right Y-Axis: PR count */}
        <YAxis
          yAxisId="right"
          orientation="right"
          label={{
            value: t("yAxisLabelRight"),
            angle: 90,
            position: "insideRight",
            offset: -10,
          }}
        />

        {/* Custom tooltip with detailed metrics */}
        <Tooltip content={CustomTooltip} />

        <Legend />

        {/* Stacked area for additions (green) */}
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="additions"
          stackId="1"
          fill={ADDITIONS_COLOR}
          stroke={ADDITIONS_STROKE}
          name={t("additions")}
        />

        {/* Stacked area for deletions (red) */}
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="deletions"
          stackId="1"
          fill={DELETIONS_COLOR}
          stroke={DELETIONS_STROKE}
          name={t("deletions")}
        />

        {/* Bar for PR count (blue) - on secondary Y-axis */}
        <Bar
          yAxisId="right"
          dataKey="prCount"
          fill={PR_COUNT_COLOR}
          name={t("prCount")}
          barSize={30}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
});
