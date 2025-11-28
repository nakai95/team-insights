// Type definitions for domain layer

export const AnalysisStatus = {
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;
export type AnalysisStatus =
  (typeof AnalysisStatus)[keyof typeof AnalysisStatus];

export const Period = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
} as const;
export type Period = (typeof Period)[keyof typeof Period];

export const RankingCriteria = {
  COMMITS: "commits",
  LINE_CHANGES: "lineChanges",
  PULL_REQUESTS: "pullRequests",
  REVIEW_COMMENTS: "reviewComments",
  IMPLEMENTATION_SCORE: "implementationScore",
  REVIEW_SCORE: "reviewScore",
} as const;
export type RankingCriteria =
  (typeof RankingCriteria)[keyof typeof RankingCriteria];

export const TrendDirection = {
  INCREASING: "increasing",
  DECREASING: "decreasing",
  STABLE: "stable",
} as const;
export type TrendDirection =
  (typeof TrendDirection)[keyof typeof TrendDirection];

// Types for ActivityAggregationService
export type Trend = {
  direction: TrendDirection;
  velocity: number; // Change per period
};

export type Comparison = {
  currentTotal: number;
  previousTotal: number;
  percentageChange: number;
  topMovers: Array<{ id: string; change: number }>;
};
