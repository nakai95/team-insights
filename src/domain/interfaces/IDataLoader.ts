import { type Result } from "@/lib/result";
import { DateRange } from "@/domain/value-objects/DateRange";
import { type PullRequest } from "@/domain/interfaces/IGitHubRepository";
import { type DeploymentEvent } from "@/domain/value-objects/DeploymentEvent";

/**
 * Commit data (simplified for progressive loading)
 */
export interface Commit {
  sha: string;
  message: string;
  author: string;
  authoredAt: Date;
  committedAt: Date;
}

/**
 * Data loading error types
 */
export const DataLoadErrorType = {
  RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
  NETWORK_ERROR: "network_error",
  AUTH_ERROR: "auth_error",
  NOT_FOUND: "not_found",
  INVALID_REPOSITORY: "invalid_repository",
  TIMEOUT: "timeout",
  ABORTED: "aborted",
  UNKNOWN: "unknown",
} as const;

export type DataLoadErrorType =
  (typeof DataLoadErrorType)[keyof typeof DataLoadErrorType];

/**
 * Data loading error with metadata
 */
export interface DataLoadError {
  type: DataLoadErrorType;
  message: string;
  rateLimitReset?: Date; // For RATE_LIMIT_EXCEEDED: when rate limit resets
  retryAfter?: number; // For RATE_LIMIT_EXCEEDED: milliseconds until retry allowed
}

/**
 * GitHub API rate limit information
 */
export interface RateLimitInfo {
  /** Total rate limit points per hour */
  total: number;
  /** Remaining rate limit points */
  remaining: number;
  /** When rate limit resets */
  resetAt: Date;
  /** Cost of last query executed */
  cost?: number;
}

/**
 * IDataLoader - Abstraction for data fetching operations
 *
 * Purpose: Provides a clean interface for fetching GitHub data with
 * date range filtering, pagination, and cancellation support.
 *
 * Implementation: GitHubGraphQLAdapter (uses @octokit/graphql)
 *
 * Usage Pattern:
 * 1. Initial 30-day load: Parallel queries for fast first paint
 * 2. Background historical load: Chunked batches (90-day chunks) with progress updates
 * 3. Custom date range: User-selected period fetched on demand
 */
export interface IDataLoader {
  /**
   * Fetch pull requests for a date range
   *
   * Implementation: GitHub GraphQL query with date filtering and pagination
   * Query: pullRequests(first: 100, filterBy: { createdAt: { since, until } })
   *
   * @param repositoryId - Repository identifier (format: "{owner}/{name}")
   * @param dateRange - Date range to fetch (inclusive)
   * @param signal - Optional AbortSignal for cancellation
   * @returns Result with PullRequest array or error
   *
   * @example
   * // Initial 30-day load
   * const result = await loader.fetchPRs(
   *   'facebook/react',
   *   DateRange.last30Days(),
   *   abortSignal
   * );
   *
   * if (result.ok) {
   *   console.log(`Fetched ${result.value.length} PRs`);
   * } else {
   *   if (result.error.type === DataLoadErrorType.RATE_LIMIT_EXCEEDED) {
   *     console.log(`Rate limit hit, retry after ${result.error.retryAfter}ms`);
   *   }
   * }
   */
  fetchPRs(
    repositoryId: string,
    dateRange: DateRange,
    signal?: AbortSignal,
  ): Promise<Result<PullRequest[], DataLoadError>>;

  /**
   * Fetch deployment events for a date range
   *
   * Implementation: GitHub GraphQL query for releases, deployments, and tags
   * Queries: releases(), deployments(), refs(refPrefix: "refs/tags/")
   *
   * @param repositoryId - Repository identifier
   * @param dateRange - Date range to fetch (inclusive)
   * @param signal - Optional AbortSignal for cancellation
   * @returns Result with DeploymentEvent array or error
   *
   * @example
   * // Fetch deployments for last 30 days
   * const result = await loader.fetchDeployments(
   *   'facebook/react',
   *   DateRange.last30Days(),
   *   abortSignal
   * );
   */
  fetchDeployments(
    repositoryId: string,
    dateRange: DateRange,
    signal?: AbortSignal,
  ): Promise<Result<DeploymentEvent[], DataLoadError>>;

  /**
   * Fetch commits for a date range
   *
   * Implementation: GitHub GraphQL query with commit history filtering
   * Query: defaultBranchRef { target { ... on Commit { history(since, until) } } }
   *
   * @param repositoryId - Repository identifier
   * @param dateRange - Date range to fetch (inclusive)
   * @param signal - Optional AbortSignal for cancellation
   * @returns Result with Commit array or error
   *
   * @example
   * // Fetch commits for custom range
   * const result = await loader.fetchCommits(
   *   'facebook/react',
   *   DateRange.fromCustomRange(new Date('2025-12-01'), new Date('2026-01-31')),
   *   abortSignal
   * );
   */
  fetchCommits(
    repositoryId: string,
    dateRange: DateRange,
    signal?: AbortSignal,
  ): Promise<Result<Commit[], DataLoadError>>;

  /**
   * Fetch rate limit status from GitHub API
   *
   * Implementation: GitHub GraphQL rateLimit query
   *
   * @returns Result with rate limit information or error
   *
   * @example
   * const result = await loader.getRateLimitStatus();
   * if (result.ok) {
   *   const { remaining, total, resetAt } = result.value;
   *   if (remaining < total * 0.1) {
   *     console.warn('Rate limit low, pausing background load');
   *   }
   * }
   */
  getRateLimitStatus(): Promise<Result<RateLimitInfo, DataLoadError>>;
}
