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
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";

/**
 * Weekly or Monthly deployment data structure
 */
interface WeeklyData {
  weekStart: string;
  deploymentCount: number;
}

interface MonthlyData {
  monthKey: string;
  monthName: string;
  deploymentCount: number;
}

type DeploymentData = WeeklyData | MonthlyData;

/**
 * Custom Tooltip Props for Recharts
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<Payload<number, string>>;
  label?: string | number;
  aggregationLevel: "weekly" | "monthly";
}

/**
 * Custom Tooltip Component
 *
 * Displays detailed metrics when hovering over chart bars
 */
function CustomTooltip({
  active,
  payload,
  aggregationLevel,
}: CustomTooltipProps) {
  const t = useTranslations("analytics.widgets.deploymentFrequency");

  if (active && payload && payload.length > 0 && payload[0]) {
    const data = payload[0].payload as DeploymentData;

    // Format label based on aggregation level
    let label: string;
    if (aggregationLevel === "monthly") {
      label = (data as MonthlyData).monthName;
    } else {
      const weekDate = new Date((data as WeeklyData).weekStart);
      label = weekDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    return (
      <div className="bg-background p-3 border rounded shadow-lg">
        <p className="font-semibold mb-2">{label}</p>
        <p className="text-primary">
          {t("tooltip.deploymentCount", { count: data.deploymentCount })}
        </p>
      </div>
    );
  }
  return null;
}

export interface DeploymentFrequencyChartProps {
  /** Aggregated deployment data (weekly or monthly) */
  data: Array<WeeklyData | MonthlyData>;
  /** Aggregation level */
  aggregationLevel: "weekly" | "monthly";
  /** Chart height in pixels (default: 400) */
  height?: number;
}

/**
 * DeploymentFrequencyChart Component
 *
 * Displays deployment frequency as a bar chart using Recharts
 *
 * Features:
 * - Bar chart showing deployment count over time
 * - Supports both weekly and monthly aggregation
 * - Custom tooltip with deployment details
 * - Responsive layout
 * - Formatted axes
 */
export const DeploymentFrequencyChart = React.memo(
  function DeploymentFrequencyChart({
    data,
    aggregationLevel,
    height = 400,
  }: DeploymentFrequencyChartProps) {
    const t = useTranslations("analytics.widgets.deploymentFrequency.chart");

    /**
     * Format date for X-axis display
     * Shows abbreviated date for weekly, month name for monthly
     */
    const formatXAxis = (value: string): string => {
      if (aggregationLevel === "monthly") {
        const date = new Date(value + "-01");
        return date.toLocaleDateString(undefined, {
          month: "short",
          year: "2-digit",
        });
      } else {
        const date = new Date(value);
        return date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
      }
    };

    // Determine dataKey based on aggregation level
    const xAxisKey = aggregationLevel === "monthly" ? "monthKey" : "weekStart";

    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={xAxisKey}
            tickFormatter={formatXAxis}
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          <YAxis
            label={{
              value: t("yAxisLabel"),
              angle: -90,
              position: "insideLeft",
            }}
            allowDecimals={false}
          />
          <Tooltip
            content={(props) => (
              <CustomTooltip {...props} aggregationLevel={aggregationLevel} />
            )}
          />
          <Bar
            dataKey="deploymentCount"
            fill="#10b981"
            radius={[8, 8, 0, 0]}
            name={t("deploymentCountLabel")}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  },
);
