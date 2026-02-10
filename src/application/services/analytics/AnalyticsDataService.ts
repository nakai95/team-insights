import { OctokitAdapter } from "@/infrastructure/github/OctokitAdapter";
import { createSessionProvider } from "@/infrastructure/auth/SessionProviderFactory";
import type { DateRange } from "@/domain/value-objects/DateRange";
import type { Result } from "@/lib/result";
import type {
  PullRequest,
  Deployment,
  GitCommit,
} from "@/domain/interfaces/IGitHubRepository";

/**
 * Analytics Data Service
 *
 * Purpose: Centralized service for fetching analytics data from GitHub API
 *
 * Responsibilities:
 * - Fetch PRs, deployments, and commits for a repository
 * - Parse repository identifiers
 * - Delegate to infrastructure adapters (OctokitAdapter)
 *
 * Design:
 * - Part of application layer (depends on infrastructure and domain)
 * - Can be reused across different routes and components
 * - Supports dependency injection via constructor
 * - Provides factory function for easy instantiation
 */
export class AnalyticsDataService {
  constructor(private githubAdapter: OctokitAdapter) {}

  /**
   * Fetch pull requests for a repository
   *
   * @param repositoryId Repository identifier in "owner/repo" format
   * @param dateRange Date range for filtering PRs
   * @returns Result containing PRs or error
   */
  async getPRs(
    repositoryId: string,
    dateRange: DateRange,
  ): Promise<Result<PullRequest[]>> {
    const [owner, repo] = repositoryId.split("/");
    if (!owner || !repo) {
      throw new Error(`Invalid repository ID: ${repositoryId}`);
    }
    return await this.githubAdapter.getPullRequests(
      owner,
      repo,
      dateRange.start,
    );
  }

  /**
   * Fetch deployments for a repository
   *
   * @param repositoryId Repository identifier in "owner/repo" format
   * @param dateRange Date range for filtering deployments
   * @returns Result containing deployments or error
   */
  async getDeployments(
    repositoryId: string,
    dateRange: DateRange,
  ): Promise<Result<Deployment[]>> {
    const [owner, repo] = repositoryId.split("/");
    if (!owner || !repo) {
      throw new Error(`Invalid repository ID: ${repositoryId}`);
    }
    return await this.githubAdapter.getDeployments(
      owner,
      repo,
      dateRange.start,
    );
  }

  /**
   * Fetch commits for a repository
   *
   * @param repositoryId Repository identifier in "owner/repo" format
   * @param dateRange Date range for filtering commits
   * @returns Result containing commits or error
   */
  async getCommits(
    repositoryId: string,
    dateRange: DateRange,
  ): Promise<Result<GitCommit[]>> {
    const githubUrl = `https://github.com/${repositoryId}`;
    return await this.githubAdapter.getLog(
      githubUrl,
      dateRange.start,
      dateRange.end,
    );
  }
}

/**
 * Factory function to create AnalyticsDataService instance
 *
 * Creates service with all required dependencies:
 * - SessionProvider for authentication
 * - OctokitAdapter for GitHub API access
 *
 * Usage:
 * ```typescript
 * const service = createAnalyticsDataService();
 * const result = await service.getPRs(repositoryId, dateRange);
 * ```
 */
export function createAnalyticsDataService(): AnalyticsDataService {
  const sessionProvider = createSessionProvider();
  const githubAdapter = new OctokitAdapter(sessionProvider);
  return new AnalyticsDataService(githubAdapter);
}
