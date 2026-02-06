/**
 * Deployments GraphQL Query and Types
 *
 * This module contains the query and types for fetching GitHub deployments.
 */

/**
 * Query to fetch deployments with all required data
 * Includes pagination support and latest status
 */
export const DEPLOYMENTS_QUERY = `
  query GetDeployments($owner: String!, $repo: String!, $first: Int!, $after: String) {
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
 * Deployment response from GitHub GraphQL API
 */
export interface GitHubGraphQLDeployment {
  id: string;
  createdAt: string; // ISO 8601 date string
  environment: string | null;
  state: string;
  ref: {
    name: string;
  } | null;
  latestStatus: {
    state: string;
    createdAt: string;
  } | null;
}

/**
 * Deployments query response
 */
export interface GitHubGraphQLDeploymentsResponse {
  repository: {
    deployments: {
      nodes: GitHubGraphQLDeployment[];
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
