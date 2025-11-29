"use client";

import { ContributorDto } from "@/application/dto/ContributorDto";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface ImplementationActivityChartProps {
  contributors: ContributorDto[];
  maxContributors?: number;
}

/**
 * Component to visualize implementation activity metrics
 * Uses Recharts to display commits and line changes per contributor
 */
export function ImplementationActivityChart({
  contributors,
  maxContributors = 10,
}: ImplementationActivityChartProps) {
  // Sort by activity score and take top N
  const topContributors = [...contributors]
    .sort(
      (a, b) =>
        b.implementationActivity.activityScore -
        a.implementationActivity.activityScore,
    )
    .slice(0, maxContributors);

  // Transform data for Recharts
  const chartData = topContributors.map((contributor) => ({
    name: contributor.displayName,
    commits: contributor.implementationActivity.commitCount,
    linesAdded: contributor.implementationActivity.linesAdded,
    linesDeleted: contributor.implementationActivity.linesDeleted,
    filesChanged: contributor.implementationActivity.filesChanged,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Implementation Activity</CardTitle>
        <CardDescription>
          Top {maxContributors} contributors by implementation score
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
            margin={{
              top: 20,
              right: 60,
              left: 20,
              bottom: 80,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
            />
            <YAxis
              yAxisId="left"
              label={{ value: "Commits", angle: -90, position: "insideLeft" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: "Lines", angle: 90, position: "insideRight" }}
            />
            <Tooltip />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="commits"
              fill="#8884d8"
              name="Commits"
            />
            <Bar
              yAxisId="right"
              dataKey="linesAdded"
              fill="#82ca9d"
              name="Lines Added"
            />
            <Bar
              yAxisId="right"
              dataKey="linesDeleted"
              fill="#ffc658"
              name="Lines Deleted"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
