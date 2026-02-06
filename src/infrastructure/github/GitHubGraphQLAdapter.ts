import { graphql, GraphqlResponseError } from "@octokit/graphql";
import {
  IDataLoader,
  DataLoadError,
  DataLoadErrorType,
  RateLimitInfo,
  Commit,
} from "@/domain/interfaces/IDataLoader";
import { DateRange } from "@/domain/value-objects/DateRange";
import { PullRequest } from "@/domain/interfaces/IGitHubRepository";
import { DeploymentEvent } from "@/domain/value-objects/DeploymentEvent";
import { ISessionProvider } from "@/domain/interfaces/ISessionProvider";
import { Result, ok, err } from "@/lib/result";
import { logger } from "@/lib/utils/logger";
import { RateLimiter } from "./RateLimiter";

// GraphQL queries and types
import {
  PULL_REQUESTS_QUERY,
  GitHubGraphQLPullRequestsResponse,
} from "./graphql/pullRequests";
import { COMMITS_QUERY, GitHubGraphQLCommitsResponse } from "./graphql/commits";
import {
  RELEASES_QUERY,
  GitHubGraphQLReleasesResponse,
} from "./graphql/releases";
import {
  DEPLOYMENTS_QUERY,
  GitHubGraphQLDeploymentsResponse,
} from "./graphql/deployments";
import { TAGS_QUERY, GitHubGraphQLTagsResponse } from "./graphql/tags";
import { RATE_LIMIT_QUERY, RateLimitResponse } from "./graphql/rateLimit";

// Data mappers
import {
  mapPullRequest,
  mapCommit,
  isMergeCommit,
  mapRelease,
  mapDeployment,
  mapTag,
  mapRateLimit,
} from "./mappers/graphqlMappers";

/**
 * GitHubGraphQLAdapter - Implementation of IDataLoader interface
 *
 * This adapter provides progressive loading support with:
 * - Date range filtering for all data types
 * - AbortSignal support for cancellation
 * - Automatic pagination
 * - Rate limit awareness
 *
 * Used by LoadInitialData and LoadHistoricalData use cases.
 */
export class GitHubGraphQLAdapter implements IDataLoader {
  private rateLimiter = new RateLimiter();
  private graphqlWithAuth?: typeof graphql;

  constructor(private sessionProvider: ISessionProvider) {}

  /**
   * Get GitHub access token from session
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
   * Parse repository ID into owner and repo
   */
  private parseRepositoryId(repositoryId: string): {
    owner: string;
    repo: string;
  } {
    const parts = repositoryId.split("/");
    if (parts.length !== 2) {
      throw new Error(
        `Invalid repository ID format: ${repositoryId}. Expected format: owner/repo`,
      );
    }
    return { owner: parts[0]!, repo: parts[1]! };
  }

  /**
   * Create DataLoadError from GraphQL error
   */
  private createDataLoadError(
    error: unknown,
    operation: string,
  ): DataLoadError {
    if (error instanceof GraphqlResponseError) {
      const status = parseInt(String(error.headers.status || "0"));

      // Rate limit error
      if (status === 403 && error.message.includes("rate limit")) {
        const resetAt = error.headers["x-ratelimit-reset"]
          ? new Date(
              parseInt(error.headers["x-ratelimit-reset"] as string) * 1000,
            )
          : new Date(Date.now() + 3600000); // Default to 1 hour

        return new DataLoadError(
          DataLoadErrorType.RATE_LIMIT_EXCEEDED,
          `GitHub API rate limit exceeded during ${operation}`,
          resetAt,
          resetAt.getTime() - Date.now(),
        );
      }

      // Authentication error
      if (status === 401 || status === 403) {
        return new DataLoadError(
          DataLoadErrorType.AUTH_ERROR,
          `Authentication failed during ${operation}: ${error.message}`,
        );
      }

      // Not found error
      if (status === 404) {
        return new DataLoadError(
          DataLoadErrorType.NOT_FOUND,
          `Resource not found during ${operation}: ${error.message}`,
        );
      }

      // Network error
      return new DataLoadError(
        DataLoadErrorType.NETWORK_ERROR,
        `Network error during ${operation}: ${error.message}`,
      );
    }

    // Abort error
    if (error instanceof Error && error.name === "AbortError") {
      return new DataLoadError(
        DataLoadErrorType.ABORTED,
        `Operation aborted: ${operation}`,
      );
    }

    // Timeout error
    if (error instanceof Error && error.message.includes("timeout")) {
      return new DataLoadError(
        DataLoadErrorType.TIMEOUT,
        `Timeout during ${operation}`,
      );
    }

    // Unknown error
    return new DataLoadError(
      DataLoadErrorType.UNKNOWN,
      `Unknown error during ${operation}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  /**
   * Fetch pull requests for a date range
   */
  async fetchPRs(
    repositoryId: string,
    dateRange: DateRange,
    signal?: AbortSignal,
  ): Promise<Result<PullRequest[]>> {
    try {
      const { owner, repo } = this.parseRepositoryId(repositoryId);
      const graphqlWithAuth = await this.getGraphqlWithAuth();

      logger.debug("Fetching pull requests with date range", {
        owner,
        repo,
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const allPullRequests: PullRequest[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        // Check for abort signal
        if (signal?.aborted) {
          return err(
            this.createDataLoadError(
              new Error("Operation aborted"),
              "fetching pull requests",
            ),
          );
        }

        // Wait if rate limit is low
        await this.rateLimiter.waitIfNeeded();

        // Execute GraphQL query
        const response: GitHubGraphQLPullRequestsResponse =
          await graphqlWithAuth<GitHubGraphQLPullRequestsResponse>(
            PULL_REQUESTS_QUERY,
            {
              owner,
              repo,
              first: 100,
              after: cursor,
            },
          );

        // Transform GraphQL response to domain entities
        const prs = response.repository.pullRequests.nodes.map(mapPullRequest);

        // Filter by date range
        const filteredPRs = prs.filter(
          (pr: PullRequest) =>
            pr.createdAt >= dateRange.start && pr.createdAt <= dateRange.end,
        );

        allPullRequests.push(...filteredPRs);

        // Early termination: Stop if we've reached PRs older than dateRange.start
        if (
          prs.length > 0 &&
          prs[prs.length - 1]!.createdAt < dateRange.start
        ) {
          logger.info(
            "Reached PRs older than date range start, stopping pagination",
          );
          break;
        }

        // Check if more pages exist
        hasNextPage = response.repository.pullRequests.pageInfo.hasNextPage;
        cursor = response.repository.pullRequests.pageInfo.endCursor;

        // Update rate limit info
        this.rateLimiter.updateRateLimit(mapRateLimit(response.rateLimit));
      }

      logger.info(
        `Fetched ${allPullRequests.length} pull requests for date range`,
      );
      return ok(allPullRequests);
    } catch (error: unknown) {
      logger.error("Failed to fetch pull requests", {
        error: error instanceof Error ? error.message : String(error),
      });
      return err(this.createDataLoadError(error, "fetching pull requests"));
    }
  }

  /**
   * Fetch deployment events for a date range
   */
  async fetchDeployments(
    repositoryId: string,
    dateRange: DateRange,
    signal?: AbortSignal,
  ): Promise<Result<DeploymentEvent[]>> {
    try {
      const { owner, repo } = this.parseRepositoryId(repositoryId);
      const graphqlWithAuth = await this.getGraphqlWithAuth();

      logger.debug("Fetching deployments with date range", {
        owner,
        repo,
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      // Fetch releases, deployments, and tags in parallel
      const [releasesResult, deploymentsResult, tagsResult] = await Promise.all(
        [
          this.fetchReleases(graphqlWithAuth, owner, repo, dateRange, signal),
          this.fetchDeploymentsFromAPI(
            graphqlWithAuth,
            owner,
            repo,
            dateRange,
            signal,
          ),
          this.fetchTags(graphqlWithAuth, owner, repo, dateRange, signal),
        ],
      );

      if (!releasesResult.ok) return releasesResult;
      if (!deploymentsResult.ok) return deploymentsResult;
      if (!tagsResult.ok) return tagsResult;

      // Combine all deployment events
      const allEvents = [
        ...releasesResult.value,
        ...deploymentsResult.value,
        ...tagsResult.value,
      ];

      // Deduplicate and sort by date
      const uniqueEvents = this.deduplicateDeploymentEvents(allEvents);
      uniqueEvents.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );

      logger.info(
        `Fetched ${uniqueEvents.length} deployment events for date range`,
      );
      return ok(uniqueEvents);
    } catch (error: unknown) {
      logger.error("Failed to fetch deployments", {
        error: error instanceof Error ? error.message : String(error),
      });
      return err(this.createDataLoadError(error, "fetching deployments"));
    }
  }

  /**
   * Fetch releases from GitHub API
   */
  private async fetchReleases(
    graphqlWithAuth: typeof graphql,
    owner: string,
    repo: string,
    dateRange: DateRange,
    signal?: AbortSignal,
  ): Promise<Result<DeploymentEvent[]>> {
    try {
      const allReleases: DeploymentEvent[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        if (signal?.aborted) {
          return err(
            this.createDataLoadError(
              new Error("Operation aborted"),
              "fetching releases",
            ),
          );
        }

        await this.rateLimiter.waitIfNeeded();

        const response: GitHubGraphQLReleasesResponse =
          await graphqlWithAuth<GitHubGraphQLReleasesResponse>(RELEASES_QUERY, {
            owner,
            repo,
            first: 100,
            after: cursor,
          });

        const releases = response.repository.releases.nodes.map(mapRelease);

        // Filter by date range and convert to DeploymentEvent
        const filteredReleases = releases
          .filter((release) => {
            const releaseDate = new Date(
              release.publishedAt ?? release.createdAt,
            );
            return (
              releaseDate >= dateRange.start && releaseDate <= dateRange.end
            );
          })
          .map((release) => DeploymentEvent.fromRelease(release));

        allReleases.push(...filteredReleases);

        // Early termination
        if (
          releases.length > 0 &&
          new Date(releases[releases.length - 1]!.createdAt) < dateRange.start
        ) {
          break;
        }

        hasNextPage = response.repository.releases.pageInfo.hasNextPage;
        cursor = response.repository.releases.pageInfo.endCursor;
        this.rateLimiter.updateRateLimit(mapRateLimit(response.rateLimit));
      }

      return ok(allReleases);
    } catch (error: unknown) {
      return err(this.createDataLoadError(error, "fetching releases"));
    }
  }

  /**
   * Fetch deployments from GitHub API
   */
  private async fetchDeploymentsFromAPI(
    graphqlWithAuth: typeof graphql,
    owner: string,
    repo: string,
    dateRange: DateRange,
    signal?: AbortSignal,
  ): Promise<Result<DeploymentEvent[]>> {
    try {
      const allDeployments: DeploymentEvent[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        if (signal?.aborted) {
          return err(
            this.createDataLoadError(
              new Error("Operation aborted"),
              "fetching deployments",
            ),
          );
        }

        await this.rateLimiter.waitIfNeeded();

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

        const deployments =
          response.repository.deployments.nodes.map(mapDeployment);

        // Filter by date range and convert to DeploymentEvent
        const filteredDeployments = deployments
          .filter((deployment) => {
            const deploymentDate = new Date(deployment.createdAt);
            return (
              deploymentDate >= dateRange.start &&
              deploymentDate <= dateRange.end
            );
          })
          .map((deployment) => DeploymentEvent.fromDeployment(deployment));

        allDeployments.push(...filteredDeployments);

        // Early termination
        if (
          deployments.length > 0 &&
          new Date(deployments[deployments.length - 1]!.createdAt) <
            dateRange.start
        ) {
          break;
        }

        hasNextPage = response.repository.deployments.pageInfo.hasNextPage;
        cursor = response.repository.deployments.pageInfo.endCursor;
        this.rateLimiter.updateRateLimit(mapRateLimit(response.rateLimit));
      }

      return ok(allDeployments);
    } catch (error: unknown) {
      return err(this.createDataLoadError(error, "fetching deployments"));
    }
  }

  /**
   * Fetch tags from GitHub API
   */
  private async fetchTags(
    graphqlWithAuth: typeof graphql,
    owner: string,
    repo: string,
    dateRange: DateRange,
    signal?: AbortSignal,
  ): Promise<Result<DeploymentEvent[]>> {
    try {
      const allTags: DeploymentEvent[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        if (signal?.aborted) {
          return err(
            this.createDataLoadError(
              new Error("Operation aborted"),
              "fetching tags",
            ),
          );
        }

        await this.rateLimiter.waitIfNeeded();

        const response: GitHubGraphQLTagsResponse =
          await graphqlWithAuth<GitHubGraphQLTagsResponse>(TAGS_QUERY, {
            owner,
            repo,
            first: 100,
            after: cursor,
          });

        const tags = response.repository.refs.nodes.map(mapTag);

        // Filter by date range and convert to DeploymentEvent
        const filteredTags = tags
          .filter((tag) => {
            const tagDate = new Date(
              tag.target.tagger?.date ?? tag.target.committedDate ?? "",
            );
            return tagDate >= dateRange.start && tagDate <= dateRange.end;
          })
          .map((tag) => DeploymentEvent.fromTag(tag));

        allTags.push(...filteredTags);

        // Early termination
        if (
          tags.length > 0 &&
          new Date(
            tags[tags.length - 1]!.target.tagger?.date ??
              tags[tags.length - 1]!.target.committedDate ??
              "",
          ) < dateRange.start
        ) {
          break;
        }

        hasNextPage = response.repository.refs.pageInfo.hasNextPage;
        cursor = response.repository.refs.pageInfo.endCursor;
        this.rateLimiter.updateRateLimit(mapRateLimit(response.rateLimit));
      }

      return ok(allTags);
    } catch (error: unknown) {
      return err(this.createDataLoadError(error, "fetching tags"));
    }
  }

  /**
   * Deduplicate deployment events by ID combination
   */
  private deduplicateDeploymentEvents(
    events: DeploymentEvent[],
  ): DeploymentEvent[] {
    const seen = new Set<string>();
    return events.filter((event) => {
      const key = `${event.id}-${event.tagName}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Fetch commits for a date range
   */
  async fetchCommits(
    repositoryId: string,
    dateRange: DateRange,
    signal?: AbortSignal,
  ): Promise<Result<Commit[]>> {
    try {
      const { owner, repo } = this.parseRepositoryId(repositoryId);
      const graphqlWithAuth = await this.getGraphqlWithAuth();

      logger.debug("Fetching commits with date range", {
        owner,
        repo,
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const commits: Commit[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        // Check for abort signal
        if (signal?.aborted) {
          return err(
            this.createDataLoadError(
              new Error("Operation aborted"),
              "fetching commits",
            ),
          );
        }

        // Wait if rate limit is low
        await this.rateLimiter.waitIfNeeded();

        // Execute GraphQL query with date range
        const response: GitHubGraphQLCommitsResponse =
          await graphqlWithAuth<GitHubGraphQLCommitsResponse>(COMMITS_QUERY, {
            owner,
            repo,
            first: 100,
            after: cursor,
            since: dateRange.start.toISOString(),
            until: dateRange.end.toISOString(),
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
          // Skip merge commits
          if (isMergeCommit(commitData)) {
            continue;
          }

          const domainCommit = mapCommit(commitData);

          // Convert to Commit interface for IDataLoader
          commits.push({
            sha: domainCommit.hash,
            message: domainCommit.message,
            author: domainCommit.author,
            authoredAt: domainCommit.date,
            committedAt: domainCommit.date,
          });
        }

        // Update pagination state
        hasNextPage =
          response.repository.defaultBranchRef.target.history.pageInfo
            .hasNextPage;
        cursor =
          response.repository.defaultBranchRef.target.history.pageInfo
            .endCursor;

        // Update rate limit info
        this.rateLimiter.updateRateLimit(mapRateLimit(response.rateLimit));
      }

      logger.info(`Fetched ${commits.length} commits for date range`);
      return ok(commits);
    } catch (error: unknown) {
      logger.error("Failed to fetch commits", {
        error: error instanceof Error ? error.message : String(error),
      });
      return err(this.createDataLoadError(error, "fetching commits"));
    }
  }

  /**
   * Fetch rate limit status from GitHub API
   */
  async getRateLimitStatus(): Promise<Result<RateLimitInfo>> {
    try {
      const graphqlWithAuth = await this.getGraphqlWithAuth();
      const response: RateLimitResponse =
        await graphqlWithAuth<RateLimitResponse>(RATE_LIMIT_QUERY);

      const rateLimitInfo = mapRateLimit(response.rateLimit);

      logger.debug("Rate limit status", {
        remaining: rateLimitInfo.remaining,
        limit: rateLimitInfo.limit,
        resetAt: rateLimitInfo.resetAt.toISOString(),
      });

      return ok({
        total: rateLimitInfo.limit,
        remaining: rateLimitInfo.remaining,
        resetAt: rateLimitInfo.resetAt,
        cost: response.rateLimit.cost,
      });
    } catch (error: unknown) {
      logger.error("Failed to fetch rate limit status", {
        error: error instanceof Error ? error.message : String(error),
      });
      return err(this.createDataLoadError(error, "fetching rate limit status"));
    }
  }
}
