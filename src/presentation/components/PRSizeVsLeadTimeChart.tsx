"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import { ScatterDataPoint } from "@/application/dto/ThroughputResult";

export interface PRSizeVsLeadTimeChartProps {
  /**
   * Array of PR data points with size and lead time
   */
  data: ScatterDataPoint[];
}

/**
 * Custom Tooltip Props
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<Payload<number, string>>;
}

/**
 * Custom Tooltip Component for Scatter Chart
 *
 * Displays PR number, size, and lead time when hovering over data points
 */
function CustomTooltip({ active, payload }: CustomTooltipProps) {
  const t = useTranslations("prThroughput.scatterChart.tooltip");

  if (active && payload && payload.length > 0 && payload[0]) {
    const data = payload[0].payload as ScatterDataPoint;
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg dark:bg-gray-800 dark:border-gray-600">
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          {t("prNumber", { number: data.prNumber })}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t("size", { lines: data.size })}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t("leadTime", { hours: data.leadTime.toFixed(1) })}
        </p>
      </div>
    );
  }
  return null;
}

/**
 * PR Size vs Lead Time Scatter Chart Component
 *
 * Displays a scatter plot showing the relationship between PR size (x-axis)
 * and lead time (y-axis). Each point represents a merged PR.
 *
 * Performance optimizations:
 * - Component is memoized with React.memo
 * - Animations disabled for datasets with 500+ points
 *
 * @param data - Array of PR data points with size and lead time
 */
export const PRSizeVsLeadTimeChart = React.memo(function PRSizeVsLeadTimeChart({
  data,
}: PRSizeVsLeadTimeChartProps) {
  const t = useTranslations("prThroughput.scatterChart");

  // Disable animations for large datasets to improve performance
  const isAnimationActive = data.length < 500;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
        <CartesianGrid strokeDasharray="3 3" strokeWidth={1} />

        {/* CRITICAL: type='number' is required for scatter charts */}
        <XAxis
          type="number"
          dataKey="size"
          name={t("xAxisName")}
          label={{
            value: t("xAxisLabel"),
            position: "insideBottom",
            offset: -20,
          }}
        />

        <YAxis
          type="number"
          dataKey="leadTime"
          name={t("yAxisName")}
          label={{
            value: t("yAxisLabel"),
            angle: -90,
            position: "insideLeft",
            offset: -20,
          }}
        />

        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={CustomTooltip} />

        <Scatter
          name={t("seriesName")}
          data={data}
          fill="#8884d8"
          shape="circle"
          isAnimationActive={isAnimationActive}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
});
