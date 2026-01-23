/**
 * API Contracts for PR Changes Timeseries Feature
 *
 * This file defines TypeScript types and interfaces for the timeseries analysis feature.
 * These contracts document the data structures passed between layers:
 * - Server Actions ↔ Client Components
 * - Application Use Cases ↔ Presentation Layer
 *
 * NOTE: This is a documentation-only file (excluded from compilation).
 * Actual implementation lives in src/application/dto/TimeseriesResult.ts
 */

/**
 * Trend Direction Enum
 * Represents the directional change in weekly code changes over time
 */
export const TrendDirection = {
  INCREASING: "increasing",
  DECREASING: "decreasing",
  STABLE: "stable",
} as const;
export type TrendDirection =
  (typeof TrendDirection)[keyof typeof TrendDirection];

/**
 * Weekly Aggregate DTO
 * Aggregated PR change metrics for a single calendar week (Monday-Sunday)
 */
export interface WeeklyAggregateDto {
  /** ISO 8601 date string for Monday 00:00:00 of the week */
  weekStart: string;

  /** ISO 8601 date string for Sunday 23:59:59 of the week */
  weekEnd: string;

  /** Total lines added across all PRs merged this week (>= 0) */
  additions: number;

  /** Total lines deleted across all PRs merged this week (>= 0) */
  deletions: number;

  /** additions + deletions (>= 0) */
  totalChanges: number;

  /** additions - deletions (can be negative if codebase shrunk) */
  netChange: number;

  /** Number of PRs merged this week (>= 0) */
  prCount: number;

  /** totalChanges / prCount, or 0 if prCount = 0 (>= 0) */
  averagePRSize: number;

  /** Total files changed across all PRs (>= 0) */
  changedFilesTotal: number;
}

/**
 * Change Trend DTO
 * Directional trend analysis over a time period (typically 4 weeks)
 */
export interface ChangeTrendDto {
  /** Direction of change: increasing, decreasing, or stable */
  direction: TrendDirection;

  /** Magnitude of change as percentage (always positive, >= 0) */
  percentChange: number;

  /** Number of weeks analyzed (typically 4) */
  analyzedWeeks: number;

  /** Average weekly changes in first half of period (>= 0) */
  startValue: number;

  /** Average weekly changes in second half of period (>= 0) */
  endValue: number;
}

/**
 * Outlier Week DTO
 * Week identified as having abnormally high code changes (> mean + 2σ)
 */
export interface OutlierWeekDto {
  /** ISO 8601 date string for Monday of the outlier week */
  weekStart: string;

  /** Total lines changed (additions + deletions) for this week (> 0) */
  totalChanges: number;

  /** Number of PRs merged this week (> 0) */
  prCount: number;

  /** Number of standard deviations from mean (> 2.0) */
  zScore: number;

  /** Mean of all weekly totals in dataset (>= 0) */
  meanValue: number;

  /** Standard deviation of weekly totals (>= 0) */
  stdDeviation: number;
}

/**
 * Timeseries Summary DTO
 * Aggregate statistics across the entire analysis period
 */
export interface TimeseriesSummary {
  /** Sum of prCount across all weeks (>= 0) */
  totalPRs: number;

  /** Sum of additions across all weeks (>= 0) */
  totalAdditions: number;

  /** Sum of deletions across all weeks (>= 0) */
  totalDeletions: number;

  /** Mean of totalChanges across all weeks (>= 0) */
  averageWeeklyChanges: number;

  /** Total changes / total PRs (>= 0) */
  averagePRSize: number;

  /** Number of weeks in dataset (>= 0) */
  weeksAnalyzed: number;
}

/**
 * Timeseries Result DTO
 * Complete timeseries analysis response
 * Used by Server Actions and passed to presentation components
 */
export interface TimeseriesResult {
  /** Array of weekly aggregates (chronological order, oldest to newest) */
  weeklyData: WeeklyAggregateDto[];

  /** Trend analysis (null if insufficient data, requires >= 4 weeks) */
  trend: ChangeTrendDto | null;

  /** Weeks with abnormally high changes (empty array if none detected or insufficient data) */
  outlierWeeks: OutlierWeekDto[];

  /** Aggregate statistics across entire period */
  summary: TimeseriesSummary;
}

/**
 * Extended Analysis Result
 * Existing AnalysisResult DTO extended with timeseries data
 *
 * NOTE: This extends the existing interface in src/application/dto/AnalysisResult.ts
 */
export interface AnalysisResultWithTimeseries {
  /** Existing analysis metadata */
  analysis: {
    id: string;
    repositoryUrl: string;
    analyzedAt: string;
    dateRange: {
      start: string;
      end: string;
    };
    status: "completed";
  };

  /** Existing contributors data */
  contributors: unknown[]; // ContributorDto[]

  /** Existing summary statistics */
  summary: {
    totalContributors: number;
    totalCommits: number;
    totalPullRequests: number;
    totalReviewComments: number;
    analysisTimeMs: number;
  };

  /** Existing PR throughput analysis (optional) */
  throughput?: unknown; // ThroughputResult

  /** NEW: Timeseries analysis data (optional) */
  timeseries?: TimeseriesResult;
}

/**
 * Validation Constraints
 *
 * WeeklyAggregateDto:
 * - weekStart MUST be Monday (ISO week definition)
 * - weekEnd MUST be Sunday, 6 days after weekStart
 * - All numeric fields >= 0 (except netChange which can be negative)
 * - averagePRSize = 0 if prCount = 0
 *
 * ChangeTrendDto:
 * - Requires >= 4 weeks of data (throws error if fewer)
 * - Stable: |change| < 10%
 * - Increasing: change >= +10%
 * - Decreasing: change <= -10%
 * - percentChange is always positive
 *
 * OutlierWeekDto:
 * - Requires >= 4 weeks of data (empty array if fewer)
 * - Only high outliers detected (> mean + 2σ)
 * - zScore > 2.0 for all flagged weeks
 * - Handles zero variance gracefully (returns empty array)
 *
 * TimeseriesSummary:
 * - All fields >= 0
 * - averagePRSize = 0 if totalPRs = 0
 * - weeksAnalyzed matches length of weeklyData array
 */

/**
 * Example Usage
 */

// Example: Successful timeseries analysis
const exampleTimeseriesResult: TimeseriesResult = {
  weeklyData: [
    {
      weekStart: "2026-01-06T00:00:00Z",
      weekEnd: "2026-01-12T23:59:59Z",
      additions: 450,
      deletions: 150,
      totalChanges: 600,
      netChange: 300,
      prCount: 3,
      averagePRSize: 200,
      changedFilesTotal: 12,
    },
    {
      weekStart: "2026-01-13T00:00:00Z",
      weekEnd: "2026-01-19T23:59:59Z",
      additions: 500,
      deletions: 200,
      totalChanges: 700,
      netChange: 300,
      prCount: 4,
      averagePRSize: 175,
      changedFilesTotal: 15,
    },
    // ... more weeks
  ],
  trend: {
    direction: "increasing",
    percentChange: 15.5,
    analyzedWeeks: 4,
    startValue: 650,
    endValue: 750,
  },
  outlierWeeks: [
    {
      weekStart: "2026-01-20T00:00:00Z",
      totalChanges: 5000,
      prCount: 10,
      zScore: 3.2,
      meanValue: 1200,
      stdDeviation: 800,
    },
  ],
  summary: {
    totalPRs: 50,
    totalAdditions: 25000,
    totalDeletions: 8000,
    averageWeeklyChanges: 1650,
    averagePRSize: 660,
    weeksAnalyzed: 8,
  },
};

// Example: Insufficient data (< 4 weeks)
const exampleInsufficientData: TimeseriesResult = {
  weeklyData: [
    {
      weekStart: "2026-01-20T00:00:00Z",
      weekEnd: "2026-01-26T23:59:59Z",
      additions: 300,
      deletions: 100,
      totalChanges: 400,
      netChange: 200,
      prCount: 2,
      averagePRSize: 200,
      changedFilesTotal: 8,
    },
  ],
  trend: null, // Not enough data for trend analysis
  outlierWeeks: [], // Not enough data for outlier detection
  summary: {
    totalPRs: 2,
    totalAdditions: 300,
    totalDeletions: 100,
    averageWeeklyChanges: 400,
    averagePRSize: 200,
    weeksAnalyzed: 1,
  },
};

// Example: No merged PRs in date range
const exampleEmptyState: TimeseriesResult = {
  weeklyData: [],
  trend: null,
  outlierWeeks: [],
  summary: {
    totalPRs: 0,
    totalAdditions: 0,
    totalDeletions: 0,
    averageWeeklyChanges: 0,
    averagePRSize: 0,
    weeksAnalyzed: 0,
  },
};
