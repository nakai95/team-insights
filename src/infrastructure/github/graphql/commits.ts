/**
 * Commits GraphQL Query and Types
 *
 * This module contains the query and types for fetching commits.
 */

/**
 * Query to fetch commits with full details
 * Includes file changes, additions, and deletions
 * Supports date range filtering via since/until parameters
 */
export const COMMITS_QUERY = `
  query GetCommits($owner: String!, $repo: String!, $first: Int!, $after: String, $since: GitTimestamp, $until: GitTimestamp) {
    repository(owner: $owner, name: $repo) {
      defaultBranchRef {
        target {
          ... on Commit {
            history(first: $first, after: $after, since: $since, until: $until) {
              nodes {
                oid
                author {
                  name
                  email
                  date
                }
                message
                additions
                deletions
                changedFilesIfAvailable
                parents(first: 2) {
                  totalCount
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
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
 * Commit response from GitHub GraphQL API
 */
export interface GitHubGraphQLCommit {
  oid: string;
  author: {
    name: string;
    email: string;
    date: string;
  } | null;
  message: string;
  additions: number;
  deletions: number;
  changedFilesIfAvailable: number;
  parents: {
    totalCount: number;
  };
}

/**
 * Commits query response
 */
export interface GitHubGraphQLCommitsResponse {
  repository: {
    defaultBranchRef: {
      target: {
        history: {
          nodes: GitHubGraphQLCommit[];
          pageInfo: {
            hasNextPage: boolean;
            endCursor: string | null;
          };
        };
      };
    } | null;
  };
  rateLimit: {
    limit: number;
    cost: number;
    remaining: number;
    resetAt: string;
  };
}
