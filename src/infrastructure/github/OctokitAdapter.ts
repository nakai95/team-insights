import { graphql, GraphqlResponseError } from "@octokit/graphql";
import {
  IGitHubRepository,
  GitCommit,
  PullRequest,
  ReviewComment,
  RateLimitInfo,
  Release,
  Deployment,
  Tag,
} from "@/domain/interfaces/IGitHubRepository";
import { ISessionProvider } from "@/domain/interfaces/ISessionProvider";
import { Result, ok, err } from "@/lib/result";
import { logger } from "@/lib/utils/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { RateLimiter } from "./RateLimiter";

// GraphQL queries and types
import {
  REPOSITORY_ACCESS_QUERY,
  RepositoryAccessResponse,
} from "./graphql/repository";
import { RATE_LIMIT_QUERY, RateLimitResponse } from "./graphql/rateLimit";
import {
  PULL_REQUESTS_QUERY,
  GitHubGraphQLPullRequestsResponse,
} from "./graphql/pullRequests";
import { COMMITS_QUERY, GitHubGraphQLCommitsResponse } from "./graphql/commits";
import {
  REVIEW_COMMENTS_QUERY,
  GitHubGraphQLReviewCommentsResponse,
} from "./graphql/reviewComments";
import {
  RELEASES_QUERY,
  GitHubGraphQLReleasesResponse,
} from "./graphql/releases";
import {
  DEPLOYMENTS_QUERY,
  GitHubGraphQLDeploymentsResponse,
} from "./graphql/deployments";
import { TAGS_QUERY, GitHubGraphQLTagsResponse } from "./graphql/tags";

// Data mappers
import {
  mapPullRequest,
  mapCommit,
  isMergeCommit,
  mapReviewComment,
  mapRateLimit,
  mapRelease,
  mapDeployment,
  mapTag,
} from "./mappers/graphqlMappers";

// Utilities
import { createBatches } from "./utils/paginationHelpers";
import { handleGraphQLError, parseGitHubUrl } from "./utils/errorHandlers";

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
  private graphqlWithAuth?: typeof graphql; // Cached authenticated graphql instance

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
   * Get authenticated graphql instance (cached per adapter instance)
   */
  private async getGraphqlWithAuth(): Promise<typeof graphql> {
    if (!this.graphqlWithAuth) {
      const token = await this.getToken();
      this.graphqlWithAuth = graphql.defaults({
        headers: {
          authorization: `token ${token}`,
        },
      });
    }
    return this.graphqlWithAuth;
  }

  /**
   * Validate GitHub token has access to repository
   */
  async validateAccess(owner: string, repo: string): Promise<Result<boolean>> {
    try {
      const graphqlWithAuth = await this.getGraphqlWithAuth();

      await graphqlWithAuth<RepositoryAccessResponse>(REPOSITORY_ACCESS_QUERY, {
        owner,
        repo,
      });

      return ok(true);
    } catch (error: unknown) {
      // validateAccess has custom logging to match original behavior
      if (error instanceof GraphqlResponseError) {
        const status = error.headers.status;
        logger.error("GitHub token validation failed", {
          owner,
          repo,
          error: error.message,
          status,
        });
      } else {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error("GitHub token validation failed", {
          owner,
          repo,
          error: errorMessage,
        });
      }
      return handleGraphQLError(error, "validating access");
    }
  }

  /**
   * Fetch a single page of pull requests from GitHub GraphQL API
   */
  private async fetchPullRequestsPage(
    graphqlWithAuth: typeof graphql,
    owner: string,
    repo: string,
    cursor: string | null,
  ): Promise<GitHubGraphQLPullRequestsResponse> {
    return await graphqlWithAuth<GitHubGraphQLPullRequestsResponse>(
      PULL_REQUESTS_QUERY,
      {
        owner,
        repo,
        first: 100,
        after: cursor,
      },
    );
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
      const graphqlWithAuth = await this.getGraphqlWithAuth();
      logger.debug("Fetching pull requests via GraphQL", {
        owner,
        repo,
        sinceDate: sinceDate?.toISOString(),
      });

      const allPullRequests: PullRequest[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        // Wait if rate limit is low
        await this.rateLimiter.waitIfNeeded();

        // Execute GraphQL query
        const response = await this.fetchPullRequestsPage(
          graphqlWithAuth,
          owner,
          repo,
          cursor,
        );

        // Transform GraphQL response to domain entities using mapper
        const prs = response.repository.pullRequests.nodes.map(mapPullRequest);

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
        this.rateLimiter.updateRateLimit(mapRateLimit(response.rateLimit));
      }

      logger.info(
        `Fetched ${allPullRequests.length} pull requests via GraphQL`,
      );
      return ok(allPullRequests);
    } catch (error: unknown) {
      return handleGraphQLError(error, "fetching pull requests");
    }
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
      // Validate token access first (even for empty arrays)
      await this.getToken();

      const startTime = Date.now();

      logger.debug("Fetching review comments via GraphQL (parallel batching)", {
        owner,
        repo,
        prCount: pullRequestNumbers.length,
        batchSize: this.BATCH_SIZE,
      });

      const allComments: ReviewComment[] = [];
      const allErrors: Error[] = [];

      // Split PRs into batches for parallel processing
      const batches = createBatches(pullRequestNumbers, this.BATCH_SIZE);

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
      return handleGraphQLError(error, "fetching review comments");
    }
  }

  /**
   * Split array into batches of specified size
   * @private
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    return createBatches(items, batchSize);
  }

  /**
   * Fetch a single page of review comments from GitHub GraphQL API
   */
  private async fetchReviewCommentsPage(
    graphqlWithAuth: typeof graphql,
    owner: string,
    repo: string,
    prNumber: number,
    cursor: string | null,
  ): Promise<GitHubGraphQLReviewCommentsResponse> {
    return await graphqlWithAuth<GitHubGraphQLReviewCommentsResponse>(
      REVIEW_COMMENTS_QUERY,
      {
        owner,
        repo,
        prNumber,
        first: 100,
        after: cursor,
      },
    );
  }

  /**
   * Fetch review comments for a single PR with pagination
   * Returns Result type for error handling
   */
  private async fetchCommentsForPR(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<Result<ReviewComment[]>> {
    const comments: ReviewComment[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    try {
      const graphqlWithAuth = await this.getGraphqlWithAuth();

      while (hasNextPage) {
        await this.rateLimiter.waitIfNeeded();

        const response = await this.fetchReviewCommentsPage(
          graphqlWithAuth,
          owner,
          repo,
          prNumber,
          cursor,
        );

        // Transform GraphQL response to domain entities using mapper
        const pageComments = response.repository.pullRequest.comments.nodes.map(
          (comment) => mapReviewComment(comment, prNumber),
        );

        comments.push(...pageComments);

        // Check if more pages exist
        hasNextPage =
          response.repository.pullRequest.comments.pageInfo.hasNextPage;
        cursor = response.repository.pullRequest.comments.pageInfo.endCursor;

        // Update rate limit info from GraphQL response
        this.rateLimiter.updateRateLimit(mapRateLimit(response.rateLimit));
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
   */
  private async fetchCommentsForBatch(
    owner: string,
    repo: string,
    prNumbers: number[],
  ): Promise<{ comments: ReviewComment[]; errors: Error[] }> {
    const results = await Promise.allSettled(
      prNumbers.map((prNumber) =>
        this.fetchCommentsForPR(owner, repo, prNumber),
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
   * Get current rate limit status using GraphQL
   */
  async getRateLimitStatus(): Promise<Result<RateLimitInfo>> {
    try {
      const graphqlWithAuth = await this.getGraphqlWithAuth();
      const response =
        await graphqlWithAuth<RateLimitResponse>(RATE_LIMIT_QUERY);

      const rateLimitInfo = mapRateLimit(response.rateLimit);

      logger.debug("Rate limit status", {
        remaining: rateLimitInfo.remaining,
        limit: rateLimitInfo.limit,
        resetAt: rateLimitInfo.resetAt.toISOString(),
      });

      return ok(rateLimitInfo);
    } catch (error: unknown) {
      // getRateLimitStatus has custom error handling to match original behavior
      const errorMessage =
        error instanceof GraphqlResponseError ? error.message : String(error);

      logger.error("Failed to fetch rate limit status", {
        error: errorMessage,
      });

      return err(
        new Error(`Failed to fetch rate limit status: ${errorMessage}`),
      );
    }
  }

  /**
   * Fetch a single page of commits from GitHub GraphQL API
   */
  private async fetchCommitsPage(
    graphqlWithAuth: typeof graphql,
    owner: string,
    repo: string,
    cursor: string | null,
    sinceDate?: Date,
    untilDate?: Date,
  ): Promise<GitHubGraphQLCommitsResponse> {
    return await graphqlWithAuth<GitHubGraphQLCommitsResponse>(COMMITS_QUERY, {
      owner,
      repo,
      first: 100,
      after: cursor,
      since: sinceDate?.toISOString(),
      until: untilDate?.toISOString(),
    });
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
      const graphqlWithAuth = await this.getGraphqlWithAuth();
      const parsed = parseGitHubUrl(repoPath);

      if (!parsed) {
        return err(new Error(`Invalid GitHub URL: ${repoPath}`));
      }

      const { owner, repo } = parsed;
      const startTime = Date.now();

      const commits: GitCommit[] = [];

      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        await this.rateLimiter.waitIfNeeded();

        // Execute GraphQL query with all commit details in one request
        const response = await this.fetchCommitsPage(
          graphqlWithAuth,
          owner,
          repo,
          cursor,
          sinceDate,
          untilDate,
        );

        // Check if repository has a default branch
        if (!response.repository.defaultBranchRef) {
          logger.warn("Repository has no default branch or is empty");
          break;
        }

        // Transform GraphQL response to domain entities using mapper
        const commitNodes =
          response.repository.defaultBranchRef.target.history.nodes;

        for (const commitData of commitNodes) {
          // Skip merge commits
          if (isMergeCommit(commitData)) {
            continue;
          }

          commits.push(mapCommit(commitData));
        }

        // Update pagination state
        hasNextPage =
          response.repository.defaultBranchRef.target.history.pageInfo
            .hasNextPage;
        cursor =
          response.repository.defaultBranchRef.target.history.pageInfo
            .endCursor;

        // Update rate limit info from GraphQL response
        this.rateLimiter.updateRateLimit(mapRateLimit(response.rateLimit));
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

      return handleGraphQLError(error, "fetching commits");
    }
  }

  /**
   * Get releases from repository with pagination (GraphQL)
   */
  async getReleases(
    owner: string,
    repo: string,
    sinceDate?: Date,
  ): Promise<Result<Release[]>> {
    try {
      const graphqlWithAuth = await this.getGraphqlWithAuth();
      logger.debug("Fetching releases via GraphQL", {
        owner,
        repo,
        sinceDate: sinceDate?.toISOString(),
      });

      const allReleases: Release[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        // Wait if rate limit is low
        await this.rateLimiter.waitIfNeeded();

        // Execute GraphQL query
        const response: GitHubGraphQLReleasesResponse =
          await graphqlWithAuth<GitHubGraphQLReleasesResponse>(RELEASES_QUERY, {
            owner,
            repo,
            first: 100,
            after: cursor,
          });

        // Transform GraphQL response to domain entities using mapper
        const releases = response.repository.releases.nodes.map(mapRelease);

        // Filter by date if provided (early termination)
        const filteredReleases = sinceDate
          ? releases.filter((release: Release) => {
              const releaseDate = new Date(
                release.publishedAt ?? release.createdAt,
              );
              return releaseDate >= sinceDate;
            })
          : releases;

        allReleases.push(...filteredReleases);

        // Early termination: Stop if we've reached releases older than sinceDate
        if (sinceDate && filteredReleases.length < releases.length) {
          logger.info(
            "Reached releases older than sinceDate, stopping pagination",
          );
          break;
        }

        // Check if more pages exist
        hasNextPage = response.repository.releases.pageInfo.hasNextPage;
        cursor = response.repository.releases.pageInfo.endCursor;

        // Update rate limit info from GraphQL response
        this.rateLimiter.updateRateLimit(mapRateLimit(response.rateLimit));
      }

      logger.info(`Fetched ${allReleases.length} releases via GraphQL`);
      return ok(allReleases);
    } catch (error: unknown) {
      return handleGraphQLError(error, "fetching releases");
    }
  }

  /**
   * Get deployments from repository with pagination (GraphQL)
   */
  async getDeployments(
    owner: string,
    repo: string,
    sinceDate?: Date,
  ): Promise<Result<Deployment[]>> {
    try {
      const graphqlWithAuth = await this.getGraphqlWithAuth();
      logger.debug("Fetching deployments via GraphQL", {
        owner,
        repo,
        sinceDate: sinceDate?.toISOString(),
      });

      const allDeployments: Deployment[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        // Wait if rate limit is low
        await this.rateLimiter.waitIfNeeded();

        // Execute GraphQL query
        const response: GitHubGraphQLDeploymentsResponse =
          await graphqlWithAuth<GitHubGraphQLDeploymentsResponse>(
            DEPLOYMENTS_QUERY,
            {
              owner,
              repo,
              first: 100,
              after: cursor,
            },
          );

        // Transform GraphQL response to domain entities using mapper
        const deployments =
          response.repository.deployments.nodes.map(mapDeployment);

        // Filter by date if provided (early termination)
        const filteredDeployments = sinceDate
          ? deployments.filter((deployment: Deployment) => {
              const deploymentDate = new Date(deployment.createdAt);
              return deploymentDate >= sinceDate;
            })
          : deployments;

        allDeployments.push(...filteredDeployments);

        // Early termination: Stop if we've reached deployments older than sinceDate
        if (sinceDate && filteredDeployments.length < deployments.length) {
          logger.info(
            "Reached deployments older than sinceDate, stopping pagination",
          );
          break;
        }

        // Check if more pages exist
        hasNextPage = response.repository.deployments.pageInfo.hasNextPage;
        cursor = response.repository.deployments.pageInfo.endCursor;

        // Update rate limit info from GraphQL response
        this.rateLimiter.updateRateLimit(mapRateLimit(response.rateLimit));
      }

      logger.info(`Fetched ${allDeployments.length} deployments via GraphQL`);
      return ok(allDeployments);
    } catch (error: unknown) {
      return handleGraphQLError(error, "fetching deployments");
    }
  }

  /**
   * Get tags from repository with pagination (GraphQL)
   */
  async getTags(
    owner: string,
    repo: string,
    sinceDate?: Date,
  ): Promise<Result<Tag[]>> {
    try {
      const graphqlWithAuth = await this.getGraphqlWithAuth();
      logger.debug("Fetching tags via GraphQL", {
        owner,
        repo,
        sinceDate: sinceDate?.toISOString(),
      });

      const allTags: Tag[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        // Wait if rate limit is low
        await this.rateLimiter.waitIfNeeded();

        // Execute GraphQL query
        const response: GitHubGraphQLTagsResponse =
          await graphqlWithAuth<GitHubGraphQLTagsResponse>(TAGS_QUERY, {
            owner,
            repo,
            first: 100,
            after: cursor,
          });

        // Transform GraphQL response to domain entities using mapper
        const tags = response.repository.refs.nodes.map(mapTag);

        // Filter by date if provided (early termination)
        const filteredTags = sinceDate
          ? tags.filter((tag: Tag) => {
              // Get date from either annotated tag or lightweight tag (commit)
              const tagDate = new Date(
                tag.target.tagger?.date ?? tag.target.committedDate ?? "",
              );
              return tagDate >= sinceDate;
            })
          : tags;

        allTags.push(...filteredTags);

        // Early termination: Stop if we've reached tags older than sinceDate
        if (sinceDate && filteredTags.length < tags.length) {
          logger.info("Reached tags older than sinceDate, stopping pagination");
          break;
        }

        // Check if more pages exist
        hasNextPage = response.repository.refs.pageInfo.hasNextPage;
        cursor = response.repository.refs.pageInfo.endCursor;

        // Update rate limit info from GraphQL response
        this.rateLimiter.updateRateLimit(mapRateLimit(response.rateLimit));
      }

      logger.info(`Fetched ${allTags.length} tags via GraphQL`);
      return ok(allTags);
    } catch (error: unknown) {
      return handleGraphQLError(error, "fetching tags");
    }
  }
}
