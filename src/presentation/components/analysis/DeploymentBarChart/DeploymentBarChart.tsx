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
import type { MonthlyDeploymentData } from "@/domain/value-objects/DeploymentFrequency";

export interface DeploymentBarChartProps {
  /**
   * Monthly deployment data
   */
  monthlyData: MonthlyDeploymentData[];

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
 * Custom Tooltip Component for Bar Chart
 *
 * Displays month details when hovering over bars
 */
function CustomTooltip({ active, payload }: CustomTooltipProps) {
  const t = useTranslations("deployment.charts");

  if (active && payload && payload.length > 0 && payload[0]) {
    const data = payload[0].payload as MonthlyDeploymentData;
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg dark:bg-gray-800 dark:border-gray-600">
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          {data.monthName}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t("deployments")}: {data.deploymentCount}
        </p>
      </div>
    );
  }

  return null;
}

/**
 * Deployment Bar Chart Component
 *
 * Displays monthly deployment counts with a bar chart
 */
export const DeploymentBarChart = React.memo(function DeploymentBarChart({
  monthlyData,
  isLoading = false,
}: DeploymentBarChartProps) {
  const t = useTranslations("deployment.charts");

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[350px] min-h-[280px] sm:min-h-[350px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer
      width="100%"
      height={350}
      className="min-h-[280px] sm:min-h-[350px]"
    >
      <BarChart
        data={monthlyData}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        <XAxis
          dataKey="monthName"
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
        <Bar
          dataKey="deploymentCount"
          fill="#10b981"
          radius={[8, 8, 0, 0]}
          name={t("deployments")}
        />
      </BarChart>
    </ResponsiveContainer>
  );
});
