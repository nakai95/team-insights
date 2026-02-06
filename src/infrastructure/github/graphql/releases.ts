/**
 * Releases GraphQL Query and Types
 *
 * This module contains the query and types for fetching GitHub releases.
 */

/**
 * Query to fetch releases with all required data
 * Includes pagination support
 */
export const RELEASES_QUERY = `
  query GetReleases($owner: String!, $repo: String!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $repo) {
      releases(
        first: $first
        after: $after
        orderBy: { field: CREATED_AT, direction: DESC }
      ) {
        nodes {
          name
          tagName
          createdAt
          publishedAt
          isPrerelease
          isDraft
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
 * Release response from GitHub GraphQL API
 */
export interface GitHubGraphQLRelease {
  name: string | null;
  tagName: string;
  createdAt: string; // ISO 8601 date string
  publishedAt: string | null; // null if not published
  isPrerelease: boolean;
  isDraft: boolean;
}

/**
 * Releases query response
 */
export interface GitHubGraphQLReleasesResponse {
  repository: {
    releases: {
      nodes: GitHubGraphQLRelease[];
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
