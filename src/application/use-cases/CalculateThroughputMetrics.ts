import { Result, ok, err } from "@/lib/result";
import { PullRequest } from "@/domain/interfaces/IGitHubRepository";
import { PRThroughput, DateRange } from "@/domain/entities/PRThroughput";
import {
  ThroughputResult,
  fromDomain,
} from "@/application/dto/ThroughputResult";

/**
 * Calculate PR Throughput Metrics Use Case
 *
 * Analyzes pull request data to calculate throughput metrics including:
 * - Lead time statistics (average, median)
 * - Size bucket analysis (S/M/L/XL)
 * - Automated insights for optimal PR sizing
 *
 * This use case orchestrates the throughput analysis by:
 * 1. Creating the PRThroughput aggregate from pull request data
 * 2. Converting the domain entity to a presentation-friendly DTO
 */
export class CalculateThroughputMetrics {
  /**
   * Execute the throughput metrics calculation
   *
   * @param repositoryUrl - Repository URL for context
   * @param pullRequests - Array of pull requests (must include throughput fields for merged PRs)
   * @param dateRange - Date range of analysis
   * @returns Result with ThroughputResult DTO or error
   */
  execute(
    repositoryUrl: string,
    pullRequests: PullRequest[],
    dateRange: DateRange,
  ): Result<ThroughputResult> {
    // Validate input parameters
    if (!repositoryUrl || repositoryUrl.trim().length === 0) {
      return err(new Error("Repository URL cannot be empty"));
    }

    if (!pullRequests) {
      return err(new Error("Pull requests array cannot be null or undefined"));
    }

    if (!dateRange) {
      return err(new Error("Date range cannot be null or undefined"));
    }

    if (!dateRange.start || !dateRange.end) {
      return err(new Error("Date range must have both start and end dates"));
    }

    // Create PRThroughput aggregate
    const throughputResult = PRThroughput.create(
      repositoryUrl,
      pullRequests,
      dateRange,
    );

    if (!throughputResult.ok) {
      return err(throughputResult.error);
    }

    // Convert to DTO
    const dto = fromDomain(throughputResult.value);

    return ok(dto);
  }
}
