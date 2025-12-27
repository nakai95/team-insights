/**
 * Contract: AnalysisResult DTO Extension
 *
 * This contract defines the changes to the existing AnalysisResult DTO
 * to include PR throughput analysis results.
 *
 * Location: src/application/dto/AnalysisResult.ts
 */

import { ThroughputResult } from "./ThroughputResult";

/**
 * EXISTING DTO - Extended with new field
 */
export interface AnalysisResult {
  // EXISTING FIELDS (no changes)
  analysis: {
    repositoryUrl: string;
    analyzedAt: string;
    dateRange: {
      start: string;
      end: string;
    };
  };
  contributors: ContributorDto[];
  summary: {
    totalContributors: number;
    totalCommits: number;
    totalPullRequests: number;
    totalReviewComments: number;
    analysisTimeMs: number;
  };

  // NEW FIELD for throughput analysis
  /**
   * PR throughput analysis results
   * - null if no merged PRs available
   * - Contains metrics, charts data, and insights
   * - Optional for backward compatibility
   */
  throughput?: ThroughputResult | null;
}

/**
 * BACKWARD COMPATIBILITY:
 * - New field is optional (?)
 * - Existing code continues to work without changes
 * - Dashboard components check for presence before rendering
 *
 * POPULATION:
 * - Set by AnalyzeRepository use case
 * - Calls CalculateThroughputMetrics internally
 * - null if calculation fails or no merged PRs
 *
 * USAGE IN PRESENTATION LAYER:
 * ```typescript
 * export function Dashboard({ result }: DashboardProps) {
 *   // ... existing code ...
 *
 *   return (
 *     <div>
 *       {/* Existing sections *}
 *       <ImplementationActivityChart ... />
 *       <ReviewActivity ... />
 *
 *       {/* NEW: Throughput section *}
 *       {result.throughput && (
 *         <PRThroughputSection throughput={result.throughput} />
 *       )}
 *
 *       <ContributorList ... />
 *     </div>
 *   );
 * }
 * ```
 */
