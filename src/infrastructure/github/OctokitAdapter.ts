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
   * Get pull requests from repository with pagination
   */
  async getPullRequests(
    owner: string,
    repo: string,
    sinceDate?: Date,
  ): Promise<Result<PullRequest[]>> {
    try {
      const token = await this.getToken();
      logger.debug("Fetching pull requests", {
        owner,
        repo,
        sinceDate: sinceDate?.toISOString(),
      });

      const octokit = new Octokit({ auth: token });
      const pullRequests: PullRequest[] = [];

      // Fetch all PRs with pagination
      let page = 1;
      const perPage = 100; // Max per page

      while (true) {
        // Wait if rate limit is low
        await this.rateLimiter.waitIfNeeded();

        const response = await octokit.rest.pulls.list({
          owner,
          repo,
          state: "all", // Get open, closed, and merged PRs
          sort: "created",
          direction: "desc",
          per_page: perPage,
          page,
        });

        // Update rate limit info after each request
        const rateLimitResult = await this.getRateLimitStatus();
        if (rateLimitResult.ok) {
          this.rateLimiter.updateRateLimit(rateLimitResult.value);
        }

        if (response.data.length === 0) {
          break; // No more PRs
        }

        for (const pr of response.data) {
          const createdAt = new Date(pr.created_at);

          // Filter by date if provided
          if (sinceDate && createdAt < sinceDate) {
            // Since PRs are sorted by created date descending,
            // we can stop once we hit an older PR
            logger.info(
              `Reached PRs older than sinceDate, stopping pagination at page ${page}`,
            );
            return ok(pullRequests);
          }

          // Determine PR state
          let state: "open" | "closed" | "merged" = "open";
          if (pr.state === "closed") {
            state = pr.merged_at ? "merged" : "closed";
          }

          // For merged PRs, fetch detailed statistics via pulls.get()
          // This is necessary because pulls.list() doesn't reliably return additions/deletions
          if (state === "merged" && pr.merged_at) {
            await this.rateLimiter.waitIfNeeded();

            const detailResponse = await octokit.rest.pulls.get({
              owner,
              repo,
              pull_number: pr.number,
            });

            const rateLimitResult = await this.getRateLimitStatus();
            if (rateLimitResult.ok) {
              this.rateLimiter.updateRateLimit(rateLimitResult.value);
            }

            pullRequests.push({
              number: pr.number,
              title: pr.title,
              author: pr.user?.login || "unknown",
              createdAt,
              state,
              reviewCommentCount: 0, // Will be populated separately
              mergedAt: new Date(pr.merged_at),
              additions: detailResponse.data.additions,
              deletions: detailResponse.data.deletions,
              changedFiles: detailResponse.data.changed_files,
            });
          } else {
            // For non-merged PRs, we don't need detailed statistics
            pullRequests.push({
              number: pr.number,
              title: pr.title,
              author: pr.user?.login || "unknown",
              createdAt,
              state,
              reviewCommentCount: 0, // Will be populated separately
            });
          }
        }

        // Check if there are more pages
        if (response.data.length < perPage) {
          break; // Last page
        }

        page++;
      }

      logger.info(`Fetched ${pullRequests.length} pull requests`);
      return ok(pullRequests);
    } catch (error: any) {
      logger.error("Failed to fetch pull requests", {
        owner,
        repo,
        error: error?.message || String(error),
        status: error?.status,
      });

      // Handle specific permission errors
      if (error?.status === 403) {
        return err(
          new Error(
            "You do not have permission to access this repository. Please verify you have read access or that the repository is not private.",
          ),
        );
      }

      if (error?.status === 404) {
        return err(
          new Error(
            "Repository not found or you do not have permission to access it. Please check the repository URL and your access rights.",
          ),
        );
      }

      return err(
        new Error(
          `Failed to fetch pull requests: ${error?.message || String(error)}`,
        ),
      );
    }
  }

  /**
   * Get review comments for specific pull requests
   */
  async getReviewComments(
    owner: string,
    repo: string,
    pullRequestNumbers: number[],
  ): Promise<Result<ReviewComment[]>> {
    try {
      const token = await this.getToken();
      logger.debug("Fetching review comments", {
        owner,
        repo,
        prCount: pullRequestNumbers.length,
      });

      const octokit = new Octokit({ auth: token });
      const allComments: ReviewComment[] = [];

      // Fetch comments for each PR
      for (const prNumber of pullRequestNumbers) {
        let page = 1;
        const perPage = 100;

        while (true) {
          // Wait if rate limit is low
          await this.rateLimiter.waitIfNeeded();

          const response = await octokit.rest.pulls.listReviewComments({
            owner,
            repo,
            pull_number: prNumber,
            per_page: perPage,
            page,
          });

          // Update rate limit info after each request
          const rateLimitResult = await this.getRateLimitStatus();
          if (rateLimitResult.ok) {
            this.rateLimiter.updateRateLimit(rateLimitResult.value);
          }

          if (response.data.length === 0) {
            break;
          }

          for (const comment of response.data) {
            allComments.push({
              id: comment.id,
              author: comment.user?.login || "unknown",
              createdAt: new Date(comment.created_at),
              body: comment.body || "",
              pullRequestNumber: prNumber,
            });
          }

          if (response.data.length < perPage) {
            break;
          }

          page++;
        }
      }

      logger.info(`Fetched ${allComments.length} review comments`);
      return ok(allComments);
    } catch (error: any) {
      logger.error("Failed to fetch review comments", {
        owner,
        repo,
        error: error?.message || String(error),
        status: error?.status,
      });

      // Handle specific permission errors
      if (error?.status === 403) {
        return err(
          new Error(
            "You do not have permission to access this repository. Please verify you have read access or that the repository is not private.",
          ),
        );
      }

      if (error?.status === 404) {
        return err(
          new Error(
            "Repository not found or you do not have permission to access it. Please check the repository URL and your access rights.",
          ),
        );
      }

      return err(
        new Error(
          `Failed to fetch review comments: ${error?.message || String(error)}`,
        ),
      );
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
