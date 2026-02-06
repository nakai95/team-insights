"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeploymentSummaryCards } from "../DeploymentSummaryCards";
import { DeploymentFrequencyChart } from "../DeploymentFrequencyChart";
import { DeploymentBarChart } from "../DeploymentBarChart";
import type { DeploymentFrequencyResult } from "@/application/dto/DeploymentFrequencyResult";

export interface DeploymentFrequencyTabProps {
  /** Deployment frequency analysis data */
  data: DeploymentFrequencyResult;
}

/**
 * Deployment Frequency Tab Component
 *
 * Displays DORA Deployment Frequency metrics including:
 * - Summary statistics (total, averages, period)
 * - Weekly deployment trend line chart
 * - Monthly deployment bar chart
 */
export function DeploymentFrequencyTab({ data }: DeploymentFrequencyTabProps) {
  // Handle no data case
  if (data.totalDeployments === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-semibold mb-2">No Deployment Data</h3>
        <p className="text-muted-foreground mb-4">
          No deployment events found for this repository.
        </p>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>To track deployments, you can:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Create GitHub Releases for your versions</li>
            <li>Tag your commits with semantic versioning (v1.0.0)</li>
            <li>Set up GitHub Actions to create Deployment events</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <DeploymentSummaryCards
        totalDeployments={data.totalDeployments}
        averagePerWeek={data.averagePerWeek}
        averagePerMonth={data.averagePerMonth}
        periodDays={data.periodDays}
      />

      {/* DORA Performance Level */}
      <Card>
        <CardHeader>
          <CardTitle>DORA Performance Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div
              className="px-4 py-2 rounded-lg font-semibold text-lg"
              style={{
                backgroundColor: data.doraLevel.displayColor + "20",
                color: data.doraLevel.displayColor,
                border: `2px solid ${data.doraLevel.displayColor}`,
              }}
            >
              {data.doraLevel.level.toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                {data.doraLevel.description}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.doraLevel.benchmarkRange}
              </p>
            </div>
          </div>
          {data.doraLevel.improvementSuggestions.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">
                Suggestions for Improvement:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {data.doraLevel.improvementSuggestions.map((suggestion, i) => (
                  <li key={i}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly trend chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Deployment Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <DeploymentFrequencyChart
            weeklyData={data.weeklyData}
            movingAverage={data.trendAnalysis?.movingAverage}
            trendDirection={data.trendAnalysis?.direction}
          />
        </CardContent>
      </Card>

      {/* Monthly bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Deployment Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <DeploymentBarChart monthlyData={data.monthlyData} />
        </CardContent>
      </Card>

      {/* Recent deployments */}
      {data.recentDeployments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Deployments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentDeployments.map((deployment, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-sm font-medium">
                      {deployment.displayName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(deployment.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-muted">
                      {deployment.source}
                    </span>
                    {deployment.environment && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {deployment.environment}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
