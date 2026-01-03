/**
 * Rate Limit GraphQL Query and Types
 *
 * This module contains the query and types for fetching rate limit status.
 */

/**
 * Query to fetch rate limit status
 */
export const RATE_LIMIT_QUERY = `
  query {
    rateLimit {
      limit
      cost
      remaining
      resetAt
    }
  }
`;

/**
 * Rate limit query response
 */
export interface RateLimitResponse {
  rateLimit: {
    limit: number;
    cost: number;
    remaining: number;
    resetAt: string; // ISO 8601 date string
  };
}
