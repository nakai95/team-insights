/**
 * Contract: IGitHubRepository Interface Extension
 *
 * This contract defines the changes to the existing IGitHubRepository interface
 * to support PR Throughput Analysis.
 *
 * Location: src/domain/interfaces/IGitHubRepository.ts
 */

/**
 * EXISTING INTERFACE - Extended with new fields
 */
export interface PullRequest {
  // EXISTING FIELDS (no changes)
  number: number;
  title: string;
  author: string;
  createdAt: Date;
  state: "open" | "closed" | "merged";
  reviewCommentCount: number;

  // NEW FIELDS for throughput analysis
  /**
   * Timestamp when the PR was merged
   * - null for non-merged PRs (open or closed without merge)
   * - ISO 8601 Date for merged PRs
   * - Required for calculating lead time
   */
  mergedAt?: Date;

  /**
   * Total number of lines added across all files in the PR
   * - Non-negative integer
   * - Fetched from GitHub API pulls.get() endpoint
   * - Used for calculating PR size
   */
  additions?: number;

  /**
   * Total number of lines deleted across all files in the PR
   * - Non-negative integer
   * - Fetched from GitHub API pulls.get() endpoint
   * - Used for calculating PR size
   */
  deletions?: number;

  /**
   * Total number of files changed in the PR
   * - Non-negative integer
   * - Fetched from GitHub API pulls.get() endpoint
   * - Optional metadata for analysis
   */
  changedFiles?: number;
}

/**
 * EXISTING METHOD - Implementation changes required
 */
export interface IGitHubRepository {
  /**
   * Get pull requests from repository
   *
   * CHANGES REQUIRED:
   * - For merged PRs, call pulls.get() to fetch detailed statistics
   * - Populate mergedAt, additions, deletions, changedFiles fields
   * - Continue using pulls.list() for initial filtering
   *
   * Implementation Pattern (see research.md):
   * 1. Use pulls.list() to get all PRs (paginated)
   * 2. For each merged PR (state === 'merged'), call pulls.get() for details
   * 3. Apply rate limiting between requests (existing RateLimiter)
   *
   * @param owner Repository owner
   * @param repo Repository name
   * @param sinceDate Optional date filter
   * @returns Result with array of pull requests (including new throughput fields)
   */
  getPullRequests(
    owner: string,
    repo: string,
    sinceDate?: Date,
  ): Promise<Result<PullRequest[]>>;

  // Other methods remain unchanged...
}

/**
 * BACKWARD COMPATIBILITY:
 * - All new fields are optional (?)
 * - Existing code continues to work without changes
 * - Only new throughput analysis code requires these fields
 *
 * VALIDATION:
 * - mergedAt must be >= createdAt (if both present)
 * - additions, deletions, changedFiles must be >= 0 (if present)
 * - For merged PRs, mergedAt should always be populated
 */
