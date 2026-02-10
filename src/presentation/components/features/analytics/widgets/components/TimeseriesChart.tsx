"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
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

  /**
   * Calculate 4-week moving average for trend visualization
   * Returns data with movingAverage field added to each week
   */
  const dataWithMovingAverage = React.useMemo(() => {
    if (!showMovingAverage || weeklyData.length < 4) {
      return weeklyData;
    }

    return weeklyData.map((week, index) => {
      // Calculate moving average using current week and previous 3 weeks
      if (index < 3) {
        // Not enough data for 4-week average yet
        return { ...week, movingAverage: null };
      }

      // Sum of total changes for last 4 weeks (including current)
      const sum = weeklyData
        .slice(index - 3, index + 1)
        .reduce((acc, w) => acc + w.totalChanges, 0);
      const movingAverage = sum / 4;

      return { ...week, movingAverage };
    });
  }, [weeklyData, showMovingAverage]);

  // Color scheme following GitHub diff conventions
  const ADDITIONS_COLOR = "#22c55e"; // Green 500
  const ADDITIONS_STROKE = "#16a34a"; // Green 600
  const DELETIONS_COLOR = "#ef4444"; // Red 500
  const DELETIONS_STROKE = "#dc2626"; // Red 600
  const PR_COUNT_COLOR = "#3b82f6"; // Blue 500
  const OUTLIER_HIGHLIGHT_COLOR = "#fef3c7"; // Amber 100 (light mode)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={dataWithMovingAverage}
        margin={{
          top: 20,
          right: 60,
          left: 20,
          bottom: 60,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />

        {/* Highlight outlier weeks with background shading */}
        {dataWithMovingAverage.map((week, index) => {
          if (isOutlierWeek(week.weekStart)) {
            // Find the next week's start for the end of the reference area
            const nextWeek = weeklyData[index + 1];
            const x2 = nextWeek ? nextWeek.weekStart : week.weekEnd;
            return (
              <ReferenceArea
                key={`outlier-${week.weekStart}`}
                x1={week.weekStart}
                x2={x2}
                yAxisId="left"
                fill={OUTLIER_HIGHLIGHT_COLOR}
                fillOpacity={0.3}
                label={{
                  value: "⚠",
                  position: "top",
                  fontSize: 16,
                }}
              />
            );
          }
          return null;
        })}

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
          barSize={20}
        />

        {/* 4-week moving average line (dashed purple) */}
        {showMovingAverage && (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="movingAverage"
            stroke="#9333ea"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="4-Week Average"
            connectNulls={false}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
});
