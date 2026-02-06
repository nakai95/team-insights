/**
 * Date-Filtered Deployments GraphQL Query
 *
 * This query fetches deployments for a specific date range.
 *
 * Note: Unlike pullRequests, the GitHub GraphQL API's `deployments` field
 * does NOT support a `filterBy` parameter with date filtering. We fetch
 * deployments ordered by creation date and filter client-side, or we
 * rely on the adapter to stop fetching when dates fall outside the range.
 *
 * Purpose: Enable progressive loading by fetching deployments for specific
 * time periods (e.g., last 30 days for initial load, 90-day chunks for
 * background loading)
 *
 * Strategy: Fetch in descending order by createdAt, stop pagination when
 * deployment dates fall before the requested range.
 */

/**
 * Query to fetch deployments (client-side date filtering required)
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param first - Number of deployments to fetch per page (max 100)
 * @param after - Pagination cursor (optional)
 *
 * Note: Date filtering happens client-side after fetch.
 * The adapter will paginate until dates fall outside the requested range.
 */
export const GET_RANGED_DEPLOYMENTS_QUERY = `
  query GetRangedDeployments(
    $owner: String!
    $repo: String!
    $first: Int!
    $after: String
  ) {
    repository(owner: $owner, name: $repo) {
      deployments(
        first: $first
        after: $after
        orderBy: { field: CREATED_AT, direction: DESC }
      ) {
        nodes {
          id
          createdAt
          environment
          state
          ref {
            name
          }
          latestStatus {
            state
            createdAt
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
 * Date-filtered deployments response
 *
 * Same structure as standard deployments query but includes totalCount
 * for better progress tracking
 */
export interface RangedDeploymentsResponse {
  repository: {
    deployments: {
      nodes: Array<{
        id: string;
        createdAt: string; // ISO 8601 format
        environment: string | null;
        state: string;
        ref: {
          name: string;
        } | null;
        latestStatus: {
          state: string;
          createdAt: string;
        } | null;
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
 * Variables for the ranged deployments query
 */
export interface RangedDeploymentsVariables {
  owner: string;
  repo: string;
  first: number;
  after?: string;
}

/**
 * Helper function to create query variables
 *
 * @param repositoryId - Repository identifier (format: "owner/repo")
 * @param pageSize - Number of items per page (default: 100)
 * @param cursor - Pagination cursor (optional)
 * @returns Query variables
 *
 * Note: Date filtering is NOT part of the query variables because GitHub's
 * deployments API doesn't support it. The adapter will filter results
 * client-side based on the date range.
 */
export function createRangedDeploymentsVariables(
  repositoryId: string,
  pageSize: number = 100,
  cursor?: string,
): RangedDeploymentsVariables {
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
  };
}

/**
 * Filter deployments by date range (client-side)
 *
 * @param deployments - Array of deployment nodes
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Filtered deployments within the date range
 */
export function filterDeploymentsByDateRange(
  deployments: RangedDeploymentsResponse["repository"]["deployments"]["nodes"],
  startDate: Date,
  endDate: Date,
): RangedDeploymentsResponse["repository"]["deployments"]["nodes"] {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  return deployments.filter((deployment) => {
    const createdTime = new Date(deployment.createdAt).getTime();
    return createdTime >= startTime && createdTime <= endTime;
  });
}

/**
 * Check if deployment is before the date range (stop pagination signal)
 *
 * @param deployment - Deployment node
 * @param startDate - Start of date range
 * @returns True if deployment was created before the range
 */
export function isDeploymentBeforeRange(
  deployment: RangedDeploymentsResponse["repository"]["deployments"]["nodes"][0],
  startDate: Date,
): boolean {
  const createdTime = new Date(deployment.createdAt).getTime();
  return createdTime < startDate.getTime();
}
