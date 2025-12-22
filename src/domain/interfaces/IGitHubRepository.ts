import { Result } from "@/lib/result";

/**
 * Git commit data structure
 */
export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
}

/**
 * Pull request data structure
 */
export interface PullRequest {
  number: number;
  title: string;
  author: string;
  createdAt: Date;
  state: "open" | "closed" | "merged";
  reviewCommentCount: number;
}

/**
 * Review comment data structure
 */
export interface ReviewComment {
  id: number;
  author: string;
  createdAt: Date;
  body: string;
  pullRequestNumber: number;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

/**
 * Unified GitHub repository interface
 *
 * This interface provides all operations needed to analyze a GitHub repository:
 * - Repository access validation
 * - Commit history fetching
 * - Pull request fetching
 * - Review comment fetching
 * - Rate limit management
 *
 * All operations use the GitHub API, making it suitable for serverless
 * environments where git binary is not available.
 */
export interface IGitHubRepository {
  /**
   * Validate access to a GitHub repository
   * @param owner Repository owner
   * @param repo Repository name
   * @returns Result with validation status
   */
  validateAccess(owner: string, repo: string): Promise<Result<boolean>>;

  /**
   * Get commit log from repository
   * @param repoPath Repository URL
   * @param sinceDate Optional date to filter commits (inclusive)
   * @param untilDate Optional end date to filter commits (inclusive)
   * @returns Result with array of commits
   */
  getLog(
    repoPath: string,
    sinceDate?: Date,
    untilDate?: Date,
  ): Promise<Result<GitCommit[]>>;

  /**
   * Get pull requests from repository
   * @param owner Repository owner
   * @param repo Repository name
   * @param sinceDate Optional date filter
   * @returns Result with array of pull requests
   */
  getPullRequests(
    owner: string,
    repo: string,
    sinceDate?: Date,
  ): Promise<Result<PullRequest[]>>;

  /**
   * Get review comments for pull requests
   * @param owner Repository owner
   * @param repo Repository name
   * @param pullRequestNumbers Array of PR numbers to fetch comments for
   * @returns Result with array of review comments
   */
  getReviewComments(
    owner: string,
    repo: string,
    pullRequestNumbers: number[],
  ): Promise<Result<ReviewComment[]>>;

  /**
   * Get current rate limit status
   * @returns Result with rate limit information
   */
  getRateLimitStatus(): Promise<Result<RateLimitInfo>>;
}
