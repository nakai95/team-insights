/**
 * Pull Requests GraphQL Query and Types
 *
 * This module contains the query and types for fetching pull requests.
 */

/**
 * Query to fetch pull requests with all required data
 * Includes pagination support and fetches up to 100 comments per PR
 */
export const PULL_REQUESTS_QUERY = `
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
 * Pull Request response from GitHub GraphQL API
 */
export interface GitHubGraphQLPullRequest {
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

/**
 * Pull Requests query response
 */
export interface GitHubGraphQLPullRequestsResponse {
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
