"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";

/**
 * Weekly PR data structure
 */
interface WeeklyData {
  weekStart: string; // ISO date string
  prCount: number;
}

/**
 * Custom Tooltip Props for Recharts
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<Payload<number, string>>;
  label?: string | number;
}

/**
 * Custom Tooltip Component
 *
 * Displays detailed metrics when hovering over chart data points
 */
function CustomTooltip({ active, payload }: CustomTooltipProps) {
  const t = useTranslations("analytics.widgets.prTrends");

  if (active && payload && payload.length > 0 && payload[0]) {
    const data = payload[0].payload as WeeklyData;

    // Format week start date
    const weekDate = new Date(data.weekStart).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    return (
      <div className="bg-background p-3 border rounded shadow-lg">
        <p className="font-semibold mb-2">
          {t("tooltip.week", { date: weekDate })}
        </p>
        <p className="text-primary">
          {t("tooltip.prCount", { count: data.prCount })}
        </p>
      </div>
    );
  }
  return null;
}

export interface PRTrendsChartProps {
  /** Weekly aggregated PR data */
  data: WeeklyData[];
  /** Chart height in pixels (default: 300) */
  height?: number;
}

/**
 * PRTrendsChart Component
 *
 * Displays weekly PR volume as a line chart using Recharts
 *
 * Features:
 * - Line chart showing PR count trend over time
 * - Custom tooltip with week and PR count
 * - Responsive layout
 * - Formatted axes
 */
export const PRTrendsChart = React.memo(function PRTrendsChart({
  data,
  height = 300,
}: PRTrendsChartProps) {
  const t = useTranslations("analytics.widgets.prTrends.chart");

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

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="weekStart"
          tickFormatter={formatXAxis}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          label={{
            value: t("yAxisLabel"),
            angle: -90,
            position: "insideLeft",
          }}
        />
        <Tooltip content={CustomTooltip} />
        <Line
          type="monotone"
          dataKey="prCount"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          name={t("prCountLabel")}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});
