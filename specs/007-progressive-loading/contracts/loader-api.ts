/**
 * Data Loader API Contracts
 *
 * TypeScript interfaces defining the data loading abstraction for
 * progressive data loading with background fetching and cancellation support.
 * These contracts are documentation only (excluded from compilation per tsconfig.json).
 *
 * Implementation: src/infrastructure/github/GitHubGraphQLAdapter.ts
 *
 * Feature: 007-progressive-loading
 * Date: 2026-02-06
 */

// ============================================================================
// Domain Types
// ============================================================================

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Result type for operations that can fail
 */
export type Result<T> =
  | { success: true; value: T }
  | { success: false; error: DataLoadError };

/**
 * Data loading errors
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

export interface DataLoadError {
  type: DataLoadErrorType;
  message: string;
  rateLimitReset?: Date; // For RATE_LIMIT_EXCEEDED: when rate limit resets
  retryAfter?: number; // For RATE_LIMIT_EXCEEDED: milliseconds until retry allowed
}

// ============================================================================
// GitHub Data Types (from existing domain entities)
// ============================================================================

/**
 * Pull Request data (from src/domain/entities/PullRequest.ts)
 */
export interface PullRequest {
  number: number;
  title: string;
  author: string;
  createdAt: Date;
  mergedAt: Date | null;
  closedAt: Date | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  state: "OPEN" | "CLOSED" | "MERGED";
}

/**
 * Deployment Event data (from src/domain/value-objects/DeploymentEvent.ts)
 */
export interface DeploymentEvent {
  id: string;
  environment: string;
  createdAt: Date;
  state: string;
  ref: string; // Branch or tag reference
}

/**
 * Commit data (simplified)
 */
export interface Commit {
  sha: string;
  message: string;
  author: string;
  authoredAt: Date;
  committedAt: Date;
}

// ============================================================================
// Data Loader Interface
// ============================================================================

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
   *   { start: new Date('2026-01-07'), end: new Date('2026-02-06') },
   *   abortSignal
   * );
   *
   * if (result.success) {
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
  ): Promise<Result<PullRequest[]>>;

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
  ): Promise<Result<DeploymentEvent[]>>;

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
   *   { start: new Date('2025-12-01'), end: new Date('2026-01-31') },
   *   abortSignal
   * );
   */
  fetchCommits(
    repositoryId: string,
    dateRange: DateRange,
    signal?: AbortSignal,
  ): Promise<Result<Commit[]>>;

  /**
   * Fetch rate limit status from GitHub API
   *
   * Implementation: GitHub GraphQL rateLimit query
   *
   * @returns Result with rate limit information or error
   *
   * @example
   * const result = await loader.getRateLimitStatus();
   * if (result.success) {
   *   const { remaining, total, resetAt } = result.value;
   *   if (remaining < total * 0.1) {
   *     console.warn('Rate limit low, pausing background load');
   *   }
   * }
   */
  getRateLimitStatus(): Promise<Result<RateLimitInfo>>;
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

// ============================================================================
// Background Loading Interface
// ============================================================================

/**
 * Data chunk returned during progressive loading
 */
export interface DataChunk<T> {
  /** Type of data in this chunk */
  dataType: "pull_requests" | "deployments" | "commits";
  /** Date range covered by this chunk */
  dateRange: DateRange;
  /** Data fetched for this chunk */
  data: T[];
  /** True if this is the final chunk */
  isComplete: boolean;
  /** Progress percentage (0-100) */
  progress: number;
}

/**
 * IBackgroundLoader - Abstraction for background historical data loading
 *
 * Purpose: Orchestrates chunked loading of historical data (31-365 days)
 * with progress callbacks and cancellation support.
 *
 * Implementation: Application layer use case (LoadHistoricalData)
 * Uses: IDataLoader for actual API calls, ICacheRepository for caching
 *
 * Usage Pattern:
 * 1. Component calls loadHistorical() after initial 30-day load completes
 * 2. loadHistorical() divides date range into 90-day chunks
 * 3. Each chunk fetched in parallel (PRs + deployments + commits)
 * 4. Progress callback invoked after each chunk completes
 * 5. AbortSignal allows cancellation on unmount or navigation
 */
export interface IBackgroundLoader {
  /**
   * Load historical data in chunks with progress updates
   *
   * @param repositoryId - Repository identifier
   * @param dataType - Type of data to load
   * @param startDate - Start date for historical range
   * @param endDate - End date for historical range
   * @param onProgress - Callback invoked after each chunk completes
   * @param abortSignal - Signal for cancellation
   *
   * @example
   * // Background load historical PRs
   * await backgroundLoader.loadHistorical(
   *   'facebook/react',
   *   'pull_requests',
   *   new Date('2025-02-07'), // 365 days ago
   *   new Date('2026-01-07'), // 31 days ago (initial load covered last 30 days)
   *   (chunk) => {
   *     console.log(`Loaded chunk: ${chunk.progress}% complete`);
   *     // Update component state with chunk.data
   *   },
   *   abortSignal
   * );
   */
  loadHistorical<T>(
    repositoryId: string,
    dataType: "pull_requests" | "deployments" | "commits",
    startDate: Date,
    endDate: Date,
    onProgress: (chunk: DataChunk<T>) => void,
    abortSignal: AbortSignal,
  ): Promise<void>;

  /**
   * Check if background loading is currently in progress
   *
   * @param repositoryId - Repository identifier
   * @param dataType - Type of data
   * @returns true if background loading is active
   *
   * @example
   * if (backgroundLoader.isLoading('facebook/react', 'pull_requests')) {
   *   // Show loading indicator
   * }
   */
  isLoading(
    repositoryId: string,
    dataType: "pull_requests" | "deployments" | "commits",
  ): boolean;

  /**
   * Cancel background loading for a specific data type
   *
   * @param repositoryId - Repository identifier
   * @param dataType - Type of data
   *
   * @example
   * // User navigates away, cancel background loading
   * backgroundLoader.cancel('facebook/react', 'pull_requests');
   */
  cancel(
    repositoryId: string,
    dataType: "pull_requests" | "deployments" | "commits",
  ): void;

  /**
   * Cancel all background loading operations
   *
   * @example
   * // User logs out or switches repositories
   * backgroundLoader.cancelAll();
   */
  cancelAll(): void;
}

// ============================================================================
// Loading Strategy Configuration (from research.md)
// ============================================================================

/**
 * Loading strategy configuration
 */
export const LoadingConfig = {
  // Initial load configuration
  INITIAL_LOAD_DAYS: 30, // Last 30 days loaded initially
  INITIAL_LOAD_TIMEOUT: 5000, // 5 seconds max for initial load

  // Background load configuration
  HISTORICAL_LOAD_DAYS: 365, // Load up to 1 year of historical data
  CHUNK_SIZE_DAYS: 90, // Load in 90-day chunks
  MAX_PARALLEL_CHUNKS: 3, // Max 3 chunks loading in parallel per data type

  // Pagination configuration
  ITEMS_PER_PAGE: 100, // GitHub GraphQL page size
  MAX_PAGES: 100, // Max pages to fetch per chunk (safety limit)

  // Timeout configuration
  API_REQUEST_TIMEOUT: 30000, // 30 seconds per API request
  BACKGROUND_LOAD_TIMEOUT: 300000, // 5 minutes total for background loading

  // Rate limit protection
  MIN_RATE_LIMIT_REMAINING: 100, // Pause if < 100 points remaining
  RATE_LIMIT_BUFFER: 0.1, // Pause if < 10% budget remaining
} as const;

// ============================================================================
// Hybrid Waterfall Pattern (from research.md)
// ============================================================================

/**
 * Hybrid waterfall loading pattern
 *
 * Phase 1: Initial Load (30 days) - Parallel for speed
 *   - Execute 3 queries in parallel: PRs, deployments, commits
 *   - Target: <5 seconds completion
 *   - Immediate UI display
 *
 * Phase 2: Background Load (31-365 days) - Chunked batches
 *   - Divide historical period into 90-day chunks
 *   - Load each chunk in parallel (3 queries per chunk)
 *   - Progressive UI updates after each chunk
 *   - Rate limit awareness: pause if budget low
 *
 * @example
 * // Initial load (Server Component or initial useEffect)
 * const [prsResult, deploymentsResult, commitsResult] = await Promise.all([
 *   loader.fetchPRs(repo, DateRange.last30Days(), abortSignal),
 *   loader.fetchDeployments(repo, DateRange.last30Days(), abortSignal),
 *   loader.fetchCommits(repo, DateRange.last30Days(), abortSignal),
 * ]);
 *
 * // Background load (Client Component with useTransition)
 * startTransition(async () => {
 *   await backgroundLoader.loadHistorical(
 *     repo,
 *     'pull_requests',
 *     new Date('2025-02-07'),
 *     new Date('2026-01-07'),
 *     (chunk) => setData(prev => [...prev, ...chunk.data]),
 *     abortSignal
 *   );
 * });
 */
export type HybridWaterfallLoader = {
  /** Phase 1: Load initial 30-day data in parallel */
  loadInitial: (
    repositoryId: string,
    signal?: AbortSignal,
  ) => Promise<{
    prs: Result<PullRequest[]>;
    deployments: Result<DeploymentEvent[]>;
    commits: Result<Commit[]>;
  }>;

  /** Phase 2: Load historical data in chunked batches */
  loadHistorical: <T>(
    repositoryId: string,
    dataType: "pull_requests" | "deployments" | "commits",
    onProgress: (chunk: DataChunk<T>) => void,
    signal?: AbortSignal,
  ) => Promise<void>;
};
