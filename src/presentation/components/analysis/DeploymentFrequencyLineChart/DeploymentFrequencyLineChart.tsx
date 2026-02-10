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
import type {
  WeeklyDeploymentData,
  TrendDirection,
} from "@/domain/value-objects/DeploymentFrequency";

export interface DeploymentFrequencyLineChartProps {
  /**
   * Weekly deployment data
   */
  weeklyData: WeeklyDeploymentData[];

  /**
   * Moving average values (optional)
   */
  movingAverage?: number[];

  /**
   * Trend direction (optional)
   */
  trendDirection?: TrendDirection;

  /**
   * Loading state (optional)
   */
  isLoading?: boolean;
}

/**
 * Custom Tooltip Props
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<Payload<number, string>>;
}

/**
 * Custom Tooltip Component for Line Chart
 *
 * Displays week details when hovering over data points
 */
function CustomTooltip({ active, payload }: CustomTooltipProps) {
  const t = useTranslations("deployment.charts");

  if (active && payload && payload.length > 0 && payload[0]) {
    const data = payload[0].payload as WeeklyDeploymentData & {
      movingAverage?: number;
    };
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg dark:bg-gray-800 dark:border-gray-600">
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          {t("week")} {data.weekKey}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t("start")} {data.weekStartDate}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t("deployments")}: {data.deploymentCount}
        </p>
        {data.movingAverage !== undefined && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("fourWeekAvg")} {data.movingAverage.toFixed(1)}
          </p>
        )}
      </div>
    );
  }

  return null;
}

/**
 * Get trend indicator icon based on direction
 */
function getTrendIcon(direction?: TrendDirection): string | null {
  switch (direction) {
    case "increasing":
      return "↗";
    case "decreasing":
      return "↘";
    case "stable":
      return "→";
    default:
      return null;
  }
}

/**
 * Get trend indicator color based on direction
 */
function getTrendColor(direction?: TrendDirection): string {
  switch (direction) {
    case "increasing":
      return "text-green-600 dark:text-green-400";
    case "decreasing":
      return "text-red-600 dark:text-red-400";
    case "stable":
      return "text-gray-600 dark:text-gray-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

/**
 * Get translated trend direction text
 */
function getTrendDirectionText(
  direction: TrendDirection,
  t: (key: string) => string,
): string {
  return t(`trendDirections.${direction}`);
}

/**
 * Deployment Frequency Line Chart Component
 *
 * Displays weekly deployment counts over time with a line chart
 * and optional moving average trend line
 */
export const DeploymentFrequencyLineChart = React.memo(
  function DeploymentFrequencyLineChart({
    weeklyData,
    movingAverage,
    trendDirection,
    isLoading = false,
  }: DeploymentFrequencyLineChartProps) {
    const t = useTranslations("deployment.charts");

    // Show loading state
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-[350px] min-h-[280px] sm:min-h-[350px]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          </div>
        </div>
      );
    }

    // Combine weekly data with moving average for chart
    const chartData = weeklyData.map((week, index) => ({
      ...week,
      movingAverage: movingAverage?.[index],
    }));

    const trendIcon = getTrendIcon(trendDirection);
    const trendColor = getTrendColor(trendDirection);

    return (
      <div>
        {/* Trend Indicator */}
        {trendDirection && trendIcon && (
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {t("trend")}
            </span>
            <span className={`font-semibold ${trendColor} flex items-center`}>
              {trendIcon} {getTrendDirectionText(trendDirection, t)}
            </span>
          </div>
        )}

        <ResponsiveContainer
          width="100%"
          height={350}
          className="min-h-[280px] sm:min-h-[350px]"
        >
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200 dark:stroke-gray-700"
            />
            <XAxis
              dataKey="weekKey"
              className="text-xs text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              className="text-xs text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
              label={{
                value: t("deployments"),
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fontSize: 12 },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="deploymentCount"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 4 }}
              activeDot={{ r: 6 }}
              name={t("deployments")}
            />
            {movingAverage && movingAverage.length > 0 && (
              <Line
                type="monotone"
                dataKey="movingAverage"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name={t("movingAverage")}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  },
);
