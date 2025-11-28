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
  BarChart,
  Bar,
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
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
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
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="commits" fill="#8884d8" name="Commits" />
            <Bar dataKey="linesAdded" fill="#82ca9d" name="Lines Added" />
            <Bar dataKey="linesDeleted" fill="#ffc658" name="Lines Deleted" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
