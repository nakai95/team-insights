"use client";

import React from "react";
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
import type { WeeklyDeploymentData } from "@/domain/value-objects/DeploymentFrequency";

export interface DeploymentFrequencyChartProps {
  /**
   * Weekly deployment data
   */
  weeklyData: WeeklyDeploymentData[];
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
  if (active && payload && payload.length > 0 && payload[0]) {
    const data = payload[0].payload as WeeklyDeploymentData;
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg dark:bg-gray-800 dark:border-gray-600">
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          Week: {data.weekKey}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Start: {data.weekStartDate}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Deployments: {data.deploymentCount}
        </p>
      </div>
    );
  }

  return null;
}

/**
 * Deployment Frequency Line Chart Component
 *
 * Displays weekly deployment counts over time with a line chart
 */
export function DeploymentFrequencyChart({
  weeklyData,
}: DeploymentFrequencyChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart
        data={weeklyData}
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
            value: "Deployments",
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
          name="Deployments"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
