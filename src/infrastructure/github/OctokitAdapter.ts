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

      logger.info("GitHub token validation successful");
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
      logger.debug("Fetching review comments via GraphQL", {
        owner,
        repo,
        prCount: pullRequestNumbers.length,
      });

      const octokit = new Octokit({ auth: token });
      const allComments: ReviewComment[] = [];

      // Fetch comments for each PR using GraphQL
      for (const prNumber of pullRequestNumbers) {
        let hasNextPage = true;
        let cursor: string | null = null;

        while (hasNextPage) {
          // Wait if rate limit is low
          await this.rateLimiter.waitIfNeeded();

          // Execute GraphQL query
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
          const comments = response.repository.pullRequest.comments.nodes.map(
            (comment) => ({
              id: parseInt(comment.id, 10), // Convert GraphQL string ID to number
              author: comment.author?.login ?? "unknown",
              createdAt: new Date(comment.createdAt),
              body: comment.body,
              pullRequestNumber: prNumber,
            }),
          );

          allComments.push(...comments);

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
      }

      logger.info(`Fetched ${allComments.length} review comments via GraphQL`);
      return ok(allComments);
    } catch (error: unknown) {
      return this.handleGraphQLError(error, "fetching review comments");
    }
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

      logger.info("Fetching commits from GitHub API", {
        owner,
        repo,
        sinceDate: sinceDate?.toISOString(),
        untilDate: untilDate?.toISOString(),
      });

      const octokit = new Octokit({ auth: token });
      const commits: GitCommit[] = [];

      // Fetch commits with pagination
      let page = 1;
      const perPage = 100; // Max per page

      while (true) {
        const params: any = {
          owner,
          repo,
          per_page: perPage,
          page,
        };

        // Add date filters if provided
        if (sinceDate) {
          params.since = sinceDate.toISOString();
        }
        if (untilDate) {
          params.until = untilDate.toISOString();
        }

        logger.debug(`Fetching commits page ${page}`);

        // Wait if rate limit is low
        await this.rateLimiter.waitIfNeeded();

        const response = await octokit.rest.repos.listCommits(params);

        // Update rate limit info after each request
        const rateLimitResult = await this.getRateLimitStatus();
        if (rateLimitResult.ok) {
          this.rateLimiter.updateRateLimit(rateLimitResult.value);
        }

        if (response.data.length === 0) {
          break; // No more commits
        }

        // Process each commit
        for (const commitData of response.data) {
          // Skip commits without SHA
          if (!commitData.sha) {
            continue;
          }

          // Skip merge commits to match SimpleGitAdapter behavior
          if (commitData.parents && commitData.parents.length > 1) {
            continue;
          }

          const commit = commitData.commit;
          const author = commit.author?.name || "Unknown";
          const email = commit.author?.email || "";
          const date = new Date(
            commit.author?.date || commitData.commit.committer?.date || "",
          );
          const message = commit.message?.split("\n")[0] || ""; // First line only

          // Fetch detailed commit data to get file changes
          logger.debug(`Fetching commit details for ${commitData.sha}`);

          await this.rateLimiter.waitIfNeeded();

          const detailResponse = await octokit.rest.repos.getCommit({
            owner,
            repo,
            ref: commitData.sha,
          });

          // Update rate limit info after each request
          const rateLimitResult2 = await this.getRateLimitStatus();
          if (rateLimitResult2.ok) {
            this.rateLimiter.updateRateLimit(rateLimitResult2.value);
          }

          const files = detailResponse.data.files || [];
          let filesChanged = files.length;
          let linesAdded = 0;
          let linesDeleted = 0;

          for (const file of files) {
            linesAdded += file.additions || 0;
            linesDeleted += file.deletions || 0;
          }

          commits.push({
            hash: commitData.sha,
            author,
            email,
            date,
            message,
            filesChanged,
            linesAdded,
            linesDeleted,
          });
        }

        // Check if there are more pages
        if (response.data.length < perPage) {
          break; // Last page
        }

        page++;
      }

      logger.info(
        `Successfully fetched ${commits.length} commits from GitHub API`,
      );
      return ok(commits);
    } catch (error: any) {
      logger.error("Failed to fetch commits from GitHub API", {
        error: getErrorMessage(error),
        status: error?.status,
      });

      // Handle specific error cases
      if (error?.status === 403) {
        return err(
          new Error(
            "GitHub API rate limit exceeded or insufficient permissions. Please try again later or verify your access rights.",
          ),
        );
      }

      if (error?.status === 404) {
        return err(
          new Error(
            "Repository not found or you do not have permission to access it.",
          ),
        );
      }

      return err(
        new Error(`Failed to fetch commits: ${getErrorMessage(error)}`),
      );
    }
  }
}
