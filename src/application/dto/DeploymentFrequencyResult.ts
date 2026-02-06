/**
 * Deployment Frequency Result DTO
 *
 * Data Transfer Object for deployment frequency analysis results.
 * This DTO is used to pass deployment frequency data from the application
 * layer to the presentation layer.
 */

import {
  WeeklyDeploymentData,
  MonthlyDeploymentData,
  TrendAnalysis,
} from "@/domain/value-objects/DeploymentFrequency";

export interface DeploymentEventSummary {
  displayName: string;
  timestamp: string; // ISO 8601 date string
  source: "release" | "deployment" | "tag";
  environment?: string;
}

export interface DORALevelInfo {
  level: "elite" | "high" | "medium" | "low" | "insufficient_data";
  deploymentsPerYear: number;
  description: string;
  benchmarkRange: string;
  displayColor: string;
  improvementSuggestions: string[];
}

export interface DeploymentFrequencyResult {
  doraLevel: DORALevelInfo;
  totalDeployments: number;
  deploymentsPerYear: number;
  averagePerWeek: number;
  averagePerMonth: number;
  periodDays: number;
  weeklyData: WeeklyDeploymentData[];
  monthlyData: MonthlyDeploymentData[];
  recentDeployments: DeploymentEventSummary[];
  trendAnalysis?: TrendAnalysis; // Optional trend analysis
}
