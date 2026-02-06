/**
 * Date-Filtered Pull Requests GraphQL Query
 *
 * This query fetches pull requests within a specific date range using the
 * `filterBy` parameter with `createdAt` filtering.
 *
 * Purpose: Enable progressive loading by fetching PRs for specific time periods
 * (e.g., last 30 days for initial load, 90-day chunks for background loading)
 *
 * Performance: Reduces data transfer and API costs by limiting results to
 * the requested date range.
 */

/**
 * Query to fetch pull requests filtered by creation date range
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param first - Number of PRs to fetch per page (max 100)
 * @param after - Pagination cursor (optional)
 * @param since - Start date for filtering (ISO 8601 format)
 * @param until - End date for filtering (ISO 8601 format)
 *
 * Note: GitHub GraphQL API requires ISO 8601 format for date filtering:
 * - Format: YYYY-MM-DDTHH:mm:ssZ
 * - Example: 2026-01-07T00:00:00Z
 */
export const GET_RANGED_PULL_REQUESTS_QUERY = `
  query GetRangedPullRequests(
    $owner: String!
    $repo: String!
    $first: Int!
    $after: String
    $since: DateTime!
    $until: DateTime!
  ) {
    repository(owner: $owner, name: $repo) {
      pullRequests(
        first: $first
        after: $after
        orderBy: { field: CREATED_AT, direction: DESC }
        filterBy: {
          createdAt: {
            since: $since
            until: $until
          }
        }
      ) {
        nodes {
          number
          title
          state
          createdAt
          mergedAt
          closedAt
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
        totalCount
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
 * Date-filtered pull request response
 *
 * Same structure as standard PR query but includes totalCount
 * for better progress tracking during background loading
 */
export interface RangedPullRequestsResponse {
  repository: {
    pullRequests: {
      nodes: Array<{
        number: number;
        title: string;
        state: "OPEN" | "CLOSED" | "MERGED";
        createdAt: string;
        mergedAt: string | null;
        closedAt: string | null;
        author: {
          login: string;
        } | null;
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
      }>;
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      totalCount: number;
    };
  };
  rateLimit: {
    limit: number;
    cost: number;
    remaining: number;
    resetAt: string;
  };
}

/**
 * Variables for the ranged pull requests query
 */
export interface RangedPullRequestsVariables {
  owner: string;
  repo: string;
  first: number;
  after?: string;
  since: string; // ISO 8601 format
  until: string; // ISO 8601 format
}

/**
 * Helper function to create query variables from date range
 *
 * @param repositoryId - Repository identifier (format: "owner/repo")
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @param pageSize - Number of items per page (default: 100)
 * @param cursor - Pagination cursor (optional)
 * @returns Query variables
 */
export function createRangedPRsVariables(
  repositoryId: string,
  startDate: Date,
  endDate: Date,
  pageSize: number = 100,
  cursor?: string,
): RangedPullRequestsVariables {
  const [owner, repo] = repositoryId.split("/");
  if (!owner || !repo) {
    throw new Error(
      `Invalid repository ID format: ${repositoryId}. Expected format: owner/repo`,
    );
  }

  return {
    owner,
    repo,
    first: Math.min(pageSize, 100), // GitHub API limit is 100
    after: cursor,
    since: startDate.toISOString(),
    until: endDate.toISOString(),
  };
}
