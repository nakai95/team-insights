/**
 * Review Comments GraphQL Query and Types
 *
 * This module contains the query and types for fetching review comments.
 */

/**
 * Query to fetch review comments for a specific PR
 * Used when a PR has 100+ comments requiring pagination
 */
export const REVIEW_COMMENTS_QUERY = `
  query GetReviewComments($owner: String!, $repo: String!, $prNumber: Int!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $prNumber) {
        number
        comments(first: $first, after: $after) {
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
 * Review comments query response
 */
export interface GitHubGraphQLReviewCommentsResponse {
  repository: {
    pullRequest: {
      number: number;
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
    };
  };
  rateLimit: {
    limit: number;
    cost: number;
    remaining: number;
    resetAt: string;
  };
}
