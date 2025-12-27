"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import { SizeBucketData } from "@/application/dto/ThroughputResult";
import { SizeBucketType } from "@/domain/value-objects/SizeBucket";

export interface SizeBucketBarChartProps {
  /**
   * Size bucket analysis data (always 4 buckets: S, M, L, XL)
   */
  sizeBuckets: SizeBucketData[];

  /**
   * Optional bucket to highlight (optimal bucket from insight)
   */
  optimalBucket?: SizeBucketType | null;
}

/**
 * Custom Tooltip Props
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<Payload<number, string>>;
}

/**
 * Custom Tooltip Component for Bar Chart
 *
 * Displays bucket details when hovering over bars
 */
function CustomTooltip({ active, payload }: CustomTooltipProps) {
  const t = useTranslations("prThroughput.sizeBucketChart.tooltip");

  if (active && payload && payload.length > 0 && payload[0]) {
    const data = payload[0].payload as SizeBucketData;
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg dark:bg-gray-800 dark:border-gray-600">
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          {t("bucket")}: {data.bucket}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t("lineRange")}: {data.lineRange}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t("averageLeadTime")}: {data.averageLeadTimeDays.toFixed(1)}
          {t("days")}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t("prCount")}: {data.prCount}
        </p>
      </div>
    );
  }
  return null;
}

/**
 * Size Bucket Bar Chart Component
 *
 * Displays a bar chart comparing average lead times across size buckets.
 * Each bar represents a size bucket (S, M, L, XL) and its average lead time.
 * Optionally highlights the optimal bucket with a different color.
 *
 * Uses Recharts BarChart with performance optimizations:
 * - React.memo to prevent unnecessary re-renders
 * - Simple bar shapes for better performance
 */
export const SizeBucketBarChart = React.memo(function SizeBucketBarChart({
  sizeBuckets,
  optimalBucket,
}: SizeBucketBarChartProps) {
  const t = useTranslations("prThroughput.sizeBucketChart");

  // Default bar color (blue)
  const DEFAULT_COLOR = "#3b82f6";

  // Optimal bucket color (green)
  const OPTIMAL_COLOR = "#22c55e";

  /**
   * Get bar color based on whether bucket is optimal
   */
  const getBarColor = (bucket: SizeBucketType): string => {
    return optimalBucket !== null && bucket === optimalBucket
      ? OPTIMAL_COLOR
      : DEFAULT_COLOR;
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={sizeBuckets}
        margin={{ top: 20, right: 20, left: 60, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="bucket"
          label={{
            value: t("xAxisLabel"),
            position: "insideBottom",
            offset: -10,
          }}
        />
        <YAxis
          label={{
            value: t("yAxisLabel"),
            angle: -90,
            position: "insideLeft",
            offset: -20,
            dy: 40,
          }}
        />
        <Tooltip content={CustomTooltip} />
        <Bar dataKey="averageLeadTimeDays" radius={[8, 8, 0, 0]}>
          {sizeBuckets.map((bucket) => (
            <Cell key={bucket.bucket} fill={getBarColor(bucket.bucket)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});
