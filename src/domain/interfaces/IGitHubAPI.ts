import { Result } from "@/lib/result";

export interface PullRequest {
  number: number;
  title: string;
  author: string;
  createdAt: Date;
  state: "open" | "closed" | "merged";
  reviewCommentCount: number;
}

export interface ReviewComment {
  id: number;
  author: string;
  createdAt: Date;
  body: string;
  pullRequestNumber: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

export interface IGitHubAPI {
  /**
   * Validate GitHub token has access to repository
   * @param owner Repository owner
   * @param repo Repository name
   * @param token GitHub personal access token
   * @returns Result with validation status
   */
  validateAccess(
    owner: string,
    repo: string,
    token: string,
  ): Promise<Result<boolean>>;

  /**
   * Get pull requests from repository
   * @param owner Repository owner
   * @param repo Repository name
   * @param token GitHub token
   * @param sinceDate Optional date filter
   * @returns Result with array of pull requests
   */
  getPullRequests(
    owner: string,
    repo: string,
    token: string,
    sinceDate?: Date,
  ): Promise<Result<PullRequest[]>>;

  /**
   * Get review comments for pull requests
   * @param owner Repository owner
   * @param repo Repository name
   * @param token GitHub token
   * @param pullRequestNumbers Array of PR numbers to fetch comments for
   * @returns Result with array of review comments
   */
  getReviewComments(
    owner: string,
    repo: string,
    token: string,
    pullRequestNumbers: number[],
  ): Promise<Result<ReviewComment[]>>;

  /**
   * Get current rate limit status
   * @param token GitHub token
   * @returns Result with rate limit information
   */
  getRateLimitStatus(token: string): Promise<Result<RateLimitInfo>>;
}
