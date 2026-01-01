import { Octokit } from "@octokit/rest";
import {
  IGitHubRepository,
  GitCommit,
  PullRequest,
  ReviewComment,
  RateLimitInfo,
} from "@/domain/interfaces/IGitHubRepository";
import { ISessionProvider } from "@/domain/interfaces/ISessionProvider";
import { Result, ok, err } from "@/lib/result";
import { logger } from "@/lib/utils/logger";
import { maskToken } from "@/lib/utils/tokenMasker";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { RateLimiter } from "./RateLimiter";

/**
 * GitHub GraphQL API Response Types
 */
interface GitHubGraphQLPullRequest {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  createdAt: string; // ISO 8601 date string
  mergedAt: string | null; // null if not merged
  author: {
    login: string;
  } | null; // null if user deleted
  additions: number;
  deletions: number;
  changedFiles: number;
  reviews: {
    totalCount: number;
  };
  comments: {
    nodes: Array<{
      id: string;
      body: string;
      createdAt: string;
      author: {
        login: string;
      } | null;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

interface GitHubGraphQLPullRequestsResponse {
  repository: {
    pullRequests: {
      nodes: GitHubGraphQLPullRequest[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
  rateLimit: {
    limit: number;
    cost: number;
    remaining: number;
    resetAt: string; // ISO 8601 date string
  };
}

interface GitHubGraphQLReviewCommentsResponse {
  repository: {
    pullRequest: {
      number: number;
      comments: {
        nodes: Array<{
          id: string;
          body: string;
          createdAt: string;
          author: {
            login: string;
          } | null;
        }>;
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    };
  };
  rateLimit: {
    limit: number;
    cost: number;
    remaining: number;
    resetAt: string;
  };
}

interface GitHubGraphQLError {
  message: string;
  type?: string; // e.g., "NOT_FOUND", "FORBIDDEN"
  path?: string[]; // Query path where error occurred
  extensions?: {
    code?: string; // e.g., "AUTHENTICATION_FAILURE"
  };
}

interface GitHubGraphQLCommit {
  oid: string;
  author: {
    name: string;
    email: string;
    date: string;
  } | null;
  message: string;
  additions: number;
  deletions: number;
  changedFilesIfAvailable: number;
  parents: {
    totalCount: number;
  };
}

interface GitHubGraphQLCommitsResponse {
  repository: {
    defaultBranchRef: {
      target: {
        history: {
          nodes: GitHubGraphQLCommit[];
          pageInfo: {
            hasNextPage: boolean;
            endCursor: string | null;
          };
        };
      };
    } | null;
  };
  rateLimit: {
    limit: number;
    cost: number;
    remaining: number;
    resetAt: string;
  };
}

/**
 * GraphQL query for fetching pull requests with all required data
 */
const PULL_REQUESTS_QUERY = `
  query GetPullRequests($owner: String!, $repo: String!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $repo) {
      pullRequests(
        first: $first
        after: $after
        orderBy: { field: CREATED_AT, direction: DESC }
      ) {
        nodes {
          number
          title
          state
          createdAt
          mergedAt
          author {
            login
          }
          additions
          deletions
          changedFiles
          reviews {
            totalCount
          }
          comments(first: 100) {
            nodes {
              id
              body
              createdAt
              author {
                login
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
    rateLimit {
      limit
      cost
      remaining
      resetAt
    }
  }
`;

/**
 * GraphQL query for fetching commits with full details
 * Includes file changes, additions, and deletions in a single query
 */
const COMMITS_QUERY = `
  query GetCommits($owner: String!, $repo: String!, $first: Int!, $after: String, $since: GitTimestamp, $until: GitTimestamp) {
    repository(owner: $owner, name: $repo) {
      defaultBranchRef {
        target {
          ... on Commit {
            history(first: $first, after: $after, since: $since, until: $until) {
              nodes {
                oid
                author {
                  name
                  email
                  date
                }
                message
                additions
                deletions
                changedFilesIfAvailable
                parents(first: 2) {
                  totalCount
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      }
    }
    rateLimit {
      limit
      cost
      remaining
      resetAt
    }
  }
`;

/**
 * GraphQL query for fetching review comments for a specific PR
 * Used when a PR has 100+ comments requiring pagination
 */
const REVIEW_COMMENTS_QUERY = `
  query GetReviewComments($owner: String!, $repo: String!, $prNumber: Int!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $prNumber) {
        number
        comments(first: $first, after: $after) {
          nodes {
            id
            body
            createdAt
            author {
              login
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
    rateLimit {
      limit
      cost
      remaining
      resetAt
    }
  }
`;

/**
 * GitHub repository adapter using Octokit
 * Implements IGitHubRepository interface
 *
 * This adapter provides all GitHub-related operations:
 * - Repository access validation
 * - Commit history fetching (via GitHub API)
 * - Pull request fetching
 * - Review comment fetching
 * - Rate limit management
 *
 * Suitable for serverless environments (no git binary required).
 */
export class OctokitAdapter implements IGitHubRepository {
  private rateLimiter = new RateLimiter();
  private readonly BATCH_SIZE = 15; // Number of PRs to fetch in parallel per batch

  constructor(private sessionProvider: ISessionProvider) {}

  /**
   * Get GitHub access token from session
   * @throws Error if token retrieval fails
   */
  private async getToken(): Promise<string> {
    const tokenResult = await this.sessionProvider.getAccessToken();
    if (!tokenResult.ok) {
      throw tokenResult.error;
    }
    return tokenResult.value;
  }

  /**
   * Validate GitHub token has access to repository
   */
  async validateAccess(owner: string, repo: string): Promise<Result<boolean>> {
    try {
      const token = await this.getToken();
      logger.debug("Validating GitHub token access", {
        owner,
        repo,
        token: maskToken(token),
      });

      const octokit = new Octokit({ auth: token });

      // Try to get repository info to validate access
      await octokit.rest.repos.get({ owner, repo });

      return ok(true);
    } catch (error: any) {
      logger.error("GitHub token validation failed", {
        owner,
        repo,
        error: error?.message || String(error),
        status: error?.status,
      });

      // Handle specific error cases
      if (error?.status === 401) {
        return err(new Error("Invalid GitHub token. Please sign in again."));
      }

      if (error?.status === 404) {
        return err(
          new Error(
            "Repository not found or you do not have permission to access it. Please check the repository URL and your access rights.",
          ),
        );
      }

      if (error?.status === 403) {
        return err(
          new Error(
            "You do not have permission to access this repository. This may be due to rate limiting or insufficient access rights. Please verify you have read access or that the repository is not private.",
          ),
        );
      }

      return err(
        new Error(
          `Failed to validate access: ${error?.message || String(error)}`,
        ),
      );
    }
  }

  /**
   * Get pull requests from repository with pagination (GraphQL)
   */
  async getPullRequests(
    owner: string,
    repo: string,
    sinceDate?: Date,
  ): Promise<Result<PullRequest[]>> {
    try {
      const token = await this.getToken();
      logger.debug("Fetching pull requests via GraphQL", {
        owner,
        repo,
        sinceDate: sinceDate?.toISOString(),
      });

      const octokit = new Octokit({ auth: token });
      const allPullRequests: PullRequest[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        // Wait if rate limit is low
        await this.rateLimiter.waitIfNeeded();

        // Execute GraphQL query
        const response: GitHubGraphQLPullRequestsResponse =
          await octokit.graphql<GitHubGraphQLPullRequestsResponse>(
            PULL_REQUESTS_QUERY,
            {
              owner,
              repo,
              first: 100,
              after: cursor,
            },
          );

        // Transform GraphQL response to domain entities
        const prs = response.repository.pullRequests.nodes.map(
          (gqlPR: GitHubGraphQLPullRequest): PullRequest => {
            // Handle null author (deleted users)
            const author = gqlPR.author?.login ?? "unknown";

            // Map GraphQL state to domain state
            // GraphQL: "OPEN" | "CLOSED" | "MERGED"
            // Domain: "open" | "closed" | "merged"
            let state: "open" | "closed" | "merged" = "open";
            if (gqlPR.state === "MERGED") {
              state = "merged";
            } else if (gqlPR.state === "CLOSED") {
              state = "closed";
            } else {
              state = "open";
            }

            const pullRequest: PullRequest = {
              number: gqlPR.number,
              title: gqlPR.title,
              author,
              createdAt: new Date(gqlPR.createdAt),
              state,
              reviewCommentCount: gqlPR.reviews.totalCount,
            };

            // Add optional fields for merged PRs
            if (gqlPR.mergedAt) {
              pullRequest.mergedAt = new Date(gqlPR.mergedAt);
            }

            // Add code change statistics (always available in GraphQL)
            pullRequest.additions = gqlPR.additions;
            pullRequest.deletions = gqlPR.deletions;
            pullRequest.changedFiles = gqlPR.changedFiles;

            return pullRequest;
          },
        );

        // Filter by date if provided (early termination)
        const filteredPRs = sinceDate
          ? prs.filter((pr: PullRequest) => pr.createdAt >= sinceDate)
          : prs;

        allPullRequests.push(...filteredPRs);

        // Early termination: Stop if we've reached PRs older than sinceDate
        if (sinceDate && filteredPRs.length < prs.length) {
          logger.info("Reached PRs older than sinceDate, stopping pagination");
          break;
        }

        // Check if more pages exist
        hasNextPage = response.repository.pullRequests.pageInfo.hasNextPage;
        cursor = response.repository.pullRequests.pageInfo.endCursor;

        // Update rate limit info from GraphQL response
        this.rateLimiter.updateRateLimit({
          limit: response.rateLimit.limit,
          remaining: response.rateLimit.remaining,
          resetAt: new Date(response.rateLimit.resetAt),
        });
      }

      logger.info(
        `Fetched ${allPullRequests.length} pull requests via GraphQL`,
      );
      return ok(allPullRequests);
    } catch (error: unknown) {
      return this.handleGraphQLError(error, "fetching pull requests");
    }
  }

  /**
   * Handle GraphQL errors and map to REST-equivalent error messages
   */
  private handleGraphQLError(error: unknown, operation: string): Result<never> {
    const graphqlError = error as {
      message?: string;
      errors?: Array<{ type?: string; message?: string }>;
    };

    logger.error(`GraphQL error while ${operation}`, {
      error: graphqlError.message || String(error),
      errors: graphqlError.errors,
    });

    // Check for specific GraphQL error types
    if (graphqlError.errors && graphqlError.errors.length > 0) {
      const firstError = graphqlError.errors[0];

      if (firstError && firstError.type === "NOT_FOUND") {
        return err(
          new Error(
            "Repository not found or you do not have permission to access it. Please check the repository URL and your access rights.",
          ),
        );
      }

      if (firstError && firstError.type === "FORBIDDEN") {
        if (firstError.message?.includes("Bad credentials")) {
          return err(new Error("Invalid GitHub token. Please sign in again."));
        }
        return err(
          new Error(
            "You do not have permission to access this repository. Please verify you have read access or that the repository is not private.",
          ),
        );
      }

      if (
        (firstError && firstError.type === "AUTHENTICATION_FAILURE") ||
        graphqlError.message?.includes("Bad credentials")
      ) {
        return err(new Error("Invalid GitHub token. Please sign in again."));
      }
    }

    // Generic error fallback
    const message = graphqlError.message ?? `Error ${operation}`;
    return err(new Error(`Failed to ${operation}: ${message}`));
  }

  /**
   * Get review comments for specific pull requests (GraphQL)
   */
  async getReviewComments(
    owner: string,
    repo: string,
    pullRequestNumbers: number[],
  ): Promise<Result<ReviewComment[]>> {
    try {
      const token = await this.getToken();
      const startTime = Date.now();

      logger.debug("Fetching review comments via GraphQL (parallel batching)", {
        owner,
        repo,
        prCount: pullRequestNumbers.length,
        batchSize: this.BATCH_SIZE,
      });

      const octokit = new Octokit({ auth: token });
      const allComments: ReviewComment[] = [];
      const allErrors: Error[] = [];

      // Split PRs into batches for parallel processing
      const batches = this.createBatches(pullRequestNumbers, this.BATCH_SIZE);

      logger.debug(
        `Processing ${batches.length} batches of ${this.BATCH_SIZE} PRs each`,
      );

      // Process batches sequentially, PRs within batch in parallel
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]!;

        // Check rate limit before processing batch
        if (this.rateLimiter.getRemainingPercentage() < 10) {
          logger.warn("Rate limit running low, waiting before next batch", {
            remaining: this.rateLimiter.getRateLimitInfo()?.remaining,
          });
          await this.rateLimiter.waitIfNeeded();
        }

        // Fetch comments for all PRs in this batch concurrently
        const { comments, errors } = await this.fetchCommentsForBatch(
          octokit,
          owner,
          repo,
          batch,
        );

        allComments.push(...comments);
        allErrors.push(...errors);
      }

      // Calculate performance metrics
      const duration = Date.now() - startTime;
      const durationSeconds = (duration / 1000).toFixed(2);

      // Log summary
      if (allErrors.length > 0) {
        logger.warn(`Completed with ${allErrors.length} errors`, {
          totalComments: allComments.length,
          totalErrors: allErrors.length,
          errorMessages: allErrors.map((e) => e.message),
        });
      }

      logger.info(
        `Fetched ${allComments.length} review comments from ${pullRequestNumbers.length} PRs in ${durationSeconds}s`,
      );

      return ok(allComments);
    } catch (error: unknown) {
      return this.handleGraphQLError(error, "fetching review comments");
    }
  }

  /**
   * Split array into batches of specified size
   * @private
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Fetch review comments for a single PR with pagination
   * Returns Result type for error handling
   * @private
   */
  private async fetchCommentsForPR(
    octokit: Octokit,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<Result<ReviewComment[]>> {
    const comments: ReviewComment[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    try {
      while (hasNextPage) {
        await this.rateLimiter.waitIfNeeded();

        const response: GitHubGraphQLReviewCommentsResponse =
          await octokit.graphql<GitHubGraphQLReviewCommentsResponse>(
            REVIEW_COMMENTS_QUERY,
            {
              owner,
              repo,
              prNumber,
              first: 100,
              after: cursor,
            },
          );

        // Transform GraphQL response to domain entities
        const pageComments = response.repository.pullRequest.comments.nodes.map(
          (comment) => ({
            id: parseInt(comment.id, 10),
            author: comment.author?.login ?? "unknown",
            createdAt: new Date(comment.createdAt),
            body: comment.body,
            pullRequestNumber: prNumber,
          }),
        );

        comments.push(...pageComments);

        // Check if more pages exist
        hasNextPage =
          response.repository.pullRequest.comments.pageInfo.hasNextPage;
        cursor = response.repository.pullRequest.comments.pageInfo.endCursor;

        // Update rate limit info from GraphQL response
        this.rateLimiter.updateRateLimit({
          limit: response.rateLimit.limit,
          remaining: response.rateLimit.remaining,
          resetAt: new Date(response.rateLimit.resetAt),
        });
      }

      return ok(comments);
    } catch (error: unknown) {
      logger.error(`Failed to fetch comments for PR #${prNumber}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        new Error(`Failed to fetch comments for PR #${prNumber}: ${error}`),
      );
    }
  }

  /**
   * Fetch review comments for a batch of PRs in parallel
   * @private
   */
  private async fetchCommentsForBatch(
    octokit: Octokit,
    owner: string,
    repo: string,
    prNumbers: number[],
  ): Promise<{ comments: ReviewComment[]; errors: Error[] }> {
    const results = await Promise.allSettled(
      prNumbers.map((prNumber) =>
        this.fetchCommentsForPR(octokit, owner, repo, prNumber),
      ),
    );

    const comments: ReviewComment[] = [];
    const errors: Error[] = [];

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.ok) {
        comments.push(...result.value.value);
      } else if (result.status === "fulfilled" && !result.value.ok) {
        errors.push(result.value.error);
      } else if (result.status === "rejected") {
        errors.push(new Error(String(result.reason)));
      }
    }

    return { comments, errors };
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(): Promise<Result<RateLimitInfo>> {
    try {
      const token = await this.getToken();
      const octokit = new Octokit({ auth: token });
      const response = await octokit.rest.rateLimit.get();

      const rateLimit = response.data.rate;

      const rateLimitInfo: RateLimitInfo = {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        resetAt: new Date(rateLimit.reset * 1000), // Unix timestamp to Date
      };

      logger.debug("Rate limit status", {
        remaining: rateLimitInfo.remaining,
        limit: rateLimitInfo.limit,
        resetAt: rateLimitInfo.resetAt.toISOString(),
      });

      return ok(rateLimitInfo);
    } catch (error: any) {
      logger.error("Failed to fetch rate limit status", {
        error: error?.message || String(error),
        status: error?.status,
      });

      return err(
        new Error(
          `Failed to fetch rate limit status: ${
            error?.message || String(error)
          }`,
        ),
      );
    }
  }

  // ============================================================================
  // Commit Operations
  // ============================================================================

  /**
   * Parse owner and repo from GitHub URL
   */
  private parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    // Match patterns like:
    // - https://github.com/owner/repo
    // - https://github.com/owner/repo.git
    // - git@github.com:owner/repo.git
    const httpsMatch = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    if (httpsMatch && httpsMatch[1] && httpsMatch[2]) {
      return { owner: httpsMatch[1], repo: httpsMatch[2] };
    }
    return null;
  }

  /**
   * Get commit log from GitHub API
   * @param repoPath Repository URL (not a local path in this implementation)
   * @param sinceDate Optional date to filter commits (inclusive)
   * @param untilDate Optional end date to filter commits (inclusive)
   */
  async getLog(
    repoPath: string,
    sinceDate?: Date,
    untilDate?: Date,
  ): Promise<Result<GitCommit[]>> {
    try {
      const token = await this.getToken();
      const parsed = this.parseGitHubUrl(repoPath);

      if (!parsed) {
        return err(new Error(`Invalid GitHub URL: ${repoPath}`));
      }

      const { owner, repo } = parsed;
      const startTime = Date.now();

      const octokit = new Octokit({ auth: token });
      const commits: GitCommit[] = [];

      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        await this.rateLimiter.waitIfNeeded();

        // Execute GraphQL query with all commit details in one request
        const response: GitHubGraphQLCommitsResponse =
          await octokit.graphql<GitHubGraphQLCommitsResponse>(COMMITS_QUERY, {
            owner,
            repo,
            first: 100,
            after: cursor,
            since: sinceDate?.toISOString(),
            until: untilDate?.toISOString(),
          });

        // Check if repository has a default branch
        if (!response.repository.defaultBranchRef) {
          logger.warn("Repository has no default branch or is empty");
          break;
        }

        // Transform GraphQL response to domain entities
        const commitNodes =
          response.repository.defaultBranchRef.target.history.nodes;

        for (const commitData of commitNodes) {
          // Skip merge commits (parents.totalCount > 1)
          if (commitData.parents.totalCount > 1) {
            continue;
          }

          const author = commitData.author?.name || "Unknown";
          const email = commitData.author?.email || "";
          const date = new Date(commitData.author?.date || "");
          const message = commitData.message.split("\n")[0] || ""; // First line only

          commits.push({
            hash: commitData.oid,
            author,
            email,
            date,
            message,
            filesChanged: commitData.changedFilesIfAvailable,
            linesAdded: commitData.additions,
            linesDeleted: commitData.deletions,
          });
        }

        // Update pagination state
        hasNextPage =
          response.repository.defaultBranchRef.target.history.pageInfo
            .hasNextPage;
        cursor =
          response.repository.defaultBranchRef.target.history.pageInfo
            .endCursor;

        // Update rate limit info from GraphQL response
        this.rateLimiter.updateRateLimit({
          limit: response.rateLimit.limit,
          remaining: response.rateLimit.remaining,
          resetAt: new Date(response.rateLimit.resetAt),
        });
      }

      const duration = Date.now() - startTime;
      logger.info(
        `Successfully fetched ${commits.length} commits via GraphQL in ${(duration / 1000).toFixed(2)}s`,
      );
      return ok(commits);
    } catch (error: any) {
      logger.error("Failed to fetch commits via GraphQL", {
        error: getErrorMessage(error),
        status: error?.status,
      });

      return this.handleGraphQLError(error, "fetching commits");
    }
  }
}
