/**
 * Tags GraphQL Query and Types
 *
 * This module contains the query and types for fetching Git tags.
 */

/**
 * Query to fetch tags with all required data
 * Includes pagination support
 * Handles both annotated and lightweight tags
 */
export const TAGS_QUERY = `
  query GetTags($owner: String!, $repo: String!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $repo) {
      refs(
        refPrefix: "refs/tags/"
        first: $first
        after: $after
        orderBy: { field: TAG_COMMIT_DATE, direction: DESC }
      ) {
        nodes {
          name
          target {
            ... on Commit {
              committedDate
            }
            ... on Tag {
              tagger {
                date
              }
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
 * Tag response from GitHub GraphQL API
 */
export interface GitHubGraphQLTag {
  name: string;
  target: {
    committedDate?: string; // For lightweight tags (commit)
    tagger?: {
      date: string; // For annotated tags
    } | null;
  };
}

/**
 * Tags query response
 */
export interface GitHubGraphQLTagsResponse {
  repository: {
    refs: {
      nodes: GitHubGraphQLTag[];
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
