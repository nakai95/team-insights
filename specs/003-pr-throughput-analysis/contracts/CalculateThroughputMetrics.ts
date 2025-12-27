/**
 * Contract: CalculateThroughputMetrics Use Case
 *
 * This contract defines the interface for the new use case that calculates
 * PR throughput metrics from pull request data.
 *
 * Location: src/application/use-cases/CalculateThroughputMetrics.ts
 */

import { Result } from "@/lib/result";

/**
 * Input DTO for CalculateThroughputMetrics use case
 */
export interface CalculateThroughputMetricsRequest {
  /**
   * Repository URL for context
   */
  repositoryUrl: string;

  /**
   * Array of pull requests (must include throughput fields)
   * Only merged PRs should be included
   */
  pullRequests: PullRequest[];

  /**
   * Date range of analysis
   */
  dateRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Output DTO for CalculateThroughputMetrics use case
 */
export interface ThroughputResult {
  /**
   * Summary statistics
   */
  totalMergedPRs: number;
  averageLeadTimeHours: number;
  averageLeadTimeDays: number;
  medianLeadTimeHours: number;
  medianLeadTimeDays: number;

  /**
   * Scatter plot data
   * Each point represents one PR
   */
  scatterData: Array<{
    prNumber: number;
    size: number; // additions + deletions
    leadTime: number; // hours
  }>;

  /**
   * Size bucket analysis
   * Always contains 4 buckets: S, M, L, XL
   */
  sizeBuckets: SizeBucket[];

  /**
   * Automated insight recommendation
   */
  insight: ThroughputInsight;
}

/**
 * Size bucket aggregate data
 */
export interface SizeBucket {
  bucket: "S" | "M" | "L" | "XL";
  lineRange: string; // e.g., "1-50", "51-200"
  averageLeadTimeHours: number;
  averageLeadTimeDays: number;
  prCount: number;
  percentage: number; // 0-100
}

/**
 * Automated insight about optimal PR size
 */
export interface ThroughputInsight {
  type: "optimal" | "no_difference" | "insufficient_data";
  message: string;
  optimalBucket: "S" | "M" | "L" | "XL" | null;
}

/**
 * CalculateThroughputMetrics Use Case Interface
 */
export interface ICalculateThroughputMetrics {
  /**
   * Calculate throughput metrics from pull request data
   *
   * @param request - Contains repository URL, pull requests, and date range
   * @returns Result with throughput metrics or error
   *
   * Error Cases:
   * - Empty pull request array → success with "insufficient_data" insight
   * - Invalid date range (end < start) → error
   * - Missing required fields (mergedAt, additions, deletions) → error
   * - Negative values for additions/deletions → error
   * - mergedAt < createdAt → error
   */
  execute(
    request: CalculateThroughputMetricsRequest,
  ): Promise<Result<ThroughputResult>>;
}

/**
 * PROCESSING STEPS:
 *
 * 1. Validate Input:
 *    - Check date range is valid
 *    - Verify all merged PRs have required fields
 *
 * 2. Filter PRs:
 *    - Only include PRs with state === 'merged'
 *    - Only include PRs with non-null mergedAt
 *
 * 3. Calculate Individual PR Metrics:
 *    - size = additions + deletions
 *    - leadTimeHours = (mergedAt - createdAt) / 3600000
 *    - sizeBucket = categorize based on size (S/M/L/XL)
 *
 * 4. Group by Size Bucket:
 *    - S: 1-50 lines
 *    - M: 51-200 lines
 *    - L: 201-500 lines
 *    - XL: 501+ lines
 *
 * 5. Calculate Bucket Aggregates:
 *    - Average lead time per bucket
 *    - PR count per bucket
 *    - Percentage distribution
 *
 * 6. Generate Insight:
 *    - Insufficient data: < 10 total PRs
 *    - No difference: all buckets within 20% of each other
 *    - Optimal: identify bucket with lowest average lead time
 *
 * 7. Calculate Summary Statistics:
 *    - Overall average lead time
 *    - Overall median lead time
 *    - Total merged PR count
 *
 * 8. Prepare Scatter Data:
 *    - Map each PR to { prNumber, size, leadTime }
 *    - Sort by PR number (optional)
 *
 * DEPENDENCIES:
 * - PRThroughputData value object (domain layer)
 * - SizeBucket value object (domain layer)
 * - ThroughputInsight value object (domain layer)
 * - PRThroughput entity (domain layer)
 *
 * TESTING:
 * - Unit tests for all calculation logic
 * - Edge cases: 0 PRs, 1 PR, 10 PRs, 1000+ PRs
 * - Edge cases: same-day merge, very large PRs (10k+ lines)
 * - Edge cases: all PRs in one bucket, equal distribution
 */
