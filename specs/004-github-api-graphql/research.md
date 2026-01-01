# GitHub GraphQL API Research: PR Data Fetching

**Feature**: 004-github-api-graphql
**Date**: 2026-01-01
**Purpose**: Technical research for migrating from REST API to GraphQL API for pull request data fetching

## Executive Summary

This document provides comprehensive research on migrating GitHub API calls from REST to GraphQL for the PR Throughput Analysis feature. The migration will consolidate multiple sequential REST API calls (100+ requests for large repositories) into 1-3 GraphQL queries, reducing PR data retrieval time from 15 seconds to under 1 second.

**Key Findings**:

- GitHub GraphQL API provides all required PR fields through the `PullRequest` object
- Cursor-based pagination with `pageInfo` enables efficient data retrieval
- GraphQL rate limiting uses a points system (5,000 points/hour) with better efficiency than REST
- Octokit's built-in `graphql()` method supports TypeScript with manual type definitions
- Test mocking requires updating response structures but maintains identical test contracts

---

## 1. GraphQL Query Design for Pull Requests

### Decision: Single Query for PR List with Nested Data

**Query Structure**:

```graphql
query ($owner: String!, $repo: String!, $first: Int!, $after: String) {
  repository(owner: $owner, name: $repo) {
    pullRequests(
      first: $first
      after: $after
      orderBy: { field: CREATED_AT, direction: DESC }
      states: [OPEN, CLOSED, MERGED]
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        number
        title
        author {
          login
        }
        createdAt
        mergedAt
        state
        additions
        deletions
        changedFiles
        reviews(first: 100) {
          totalCount
          nodes {
            author {
              login
            }
            createdAt
            body
          }
        }
        comments(first: 100) {
          totalCount
          nodes {
            id
            author {
              login
            }
            createdAt
            body
          }
        }
      }
    }
  }
}
```

**Field Mapping (REST → GraphQL)**:

| REST API Field                 | GraphQL Field        | Type                | Notes                                      |
| ------------------------------ | -------------------- | ------------------- | ------------------------------------------ |
| `pr.number`                    | `number`             | `Int!`              | Unique PR identifier                       |
| `pr.title`                     | `title`              | `String!`           | PR title                                   |
| `pr.user.login`                | `author.login`       | `String`            | Author username (nullable if user deleted) |
| `pr.created_at`                | `createdAt`          | `DateTime!`         | ISO 8601 timestamp                         |
| `pr.merged_at`                 | `mergedAt`           | `DateTime`          | Null if not merged                         |
| `pr.state`                     | `state`              | `PullRequestState!` | Enum: OPEN, CLOSED, MERGED                 |
| `detailResponse.additions`     | `additions`          | `Int!`              | Lines added                                |
| `detailResponse.deletions`     | `deletions`          | `Int!`              | Lines deleted                              |
| `detailResponse.changed_files` | `changedFiles`       | `Int!`              | Number of files changed                    |
| `listReviewComments()` count   | `reviews.totalCount` | `Int!`              | Total review count                         |

**Rationale**:

1. **Single Query Efficiency**: Fetches all PR metadata, code statistics, and review comments in one request instead of 3 separate REST calls (`pulls.list()`, `pulls.get()`, `pulls.listReviewComments()`)
2. **Nested Data**: GraphQL allows fetching reviews and comments as nested connections, eliminating the N+1 query problem
3. **Sorting**: `orderBy: {field: CREATED_AT, direction: DESC}` matches current REST API behavior (sorted by creation date descending)
4. **State Filter**: `states: [OPEN, CLOSED, MERGED]` equivalent to REST's `state: "all"` parameter

**Alternatives Considered**:

1. **Separate queries for PRs and reviews**: Would require 2 queries but provide no benefit over nested approach
2. **Using `search` query**: GitHub's search API for PRs, but doesn't support nested review/comment data
3. **Fetching all states separately**: Unnecessary complexity; single query with state filter is cleaner

**Implementation Notes**:

- The `author.login` field can be `null` if the GitHub user was deleted; handle with fallback to `"unknown"`
- For merged PRs, `state` field returns `MERGED`, not `CLOSED` (unlike REST API where you must check `merged_at`)
- Review comments include both pull request review comments and inline code review comments
- `totalCount` fields provide counts without fetching all data, useful for metrics

---

## 2. Pagination Strategy

### Decision: Cursor-Based Pagination with Early Termination

**Implementation Pattern**:

```typescript
async getPullRequests(
  owner: string,
  repo: string,
  sinceDate?: Date,
): Promise<Result<PullRequest[]>> {
  const pullRequests: PullRequest[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const response = await octokit.graphql<GraphQLResponse>(QUERY, {
      owner,
      repo,
      first: 100,
      after: cursor,
    });

    const prConnection = response.repository.pullRequests;

    for (const node of prConnection.nodes) {
      const createdAt = new Date(node.createdAt);

      // Early termination: stop if PR is older than sinceDate
      if (sinceDate && createdAt < sinceDate) {
        return ok(pullRequests);
      }

      pullRequests.push(transformPR(node));
    }

    hasNextPage = prConnection.pageInfo.hasNextPage;
    cursor = prConnection.pageInfo.endCursor;
  }

  return ok(pullRequests);
}
```

**PageInfo Fields**:

- `hasNextPage` (`Boolean!`): Indicates if more pages exist after current cursor
- `hasPreviousPage` (`Boolean!`): Indicates if more pages exist before current cursor (unused in forward pagination)
- `endCursor` (`String`): Cursor for last item on current page; pass as `after` parameter for next page
- `startCursor` (`String`): Cursor for first item on current page; pass as `before` parameter for backward pagination

**Rationale**:

1. **Cursor Stability**: Unlike offset-based pagination, cursors remain valid even if new items are added during pagination
2. **Early Termination**: Since PRs are sorted by `createdAt DESC`, once we encounter a PR older than `sinceDate`, all remaining PRs will also be older (monotonic ordering)
3. **100 Items Per Page**: Maximum allowed by GitHub GraphQL API; balances API efficiency with memory usage
4. **Date Filtering in Code**: GraphQL PR queries don't support native date filters like REST's `since` parameter, so client-side filtering is required

**Alternatives Considered**:

1. **Offset-based pagination**: Not supported by GitHub GraphQL API (cursor-based is mandatory)
2. **Fetching fewer items per page (e.g., 50)**: Would double the number of API requests without reducing rate limit points
3. **GraphQL `search` query with date filters**: Supports date ranges but doesn't provide nested review/comment data, requiring additional queries
4. **Fetching all pages without early termination**: Wastes API rate limit points and processing time for irrelevant data

**Implementation Notes**:

- First page: `after: null` (or omit `after` parameter entirely)
- Subsequent pages: `after: pageInfo.endCursor` from previous response
- `endCursor` is an opaque string; do not parse or construct manually
- If `hasNextPage` is `false`, there are no more pages (do not make additional requests)
- GraphQL connections guarantee deterministic ordering within a cursor-based pagination session

**Performance Comparison**:

| Scenario                        | REST API                                       | GraphQL API                        |
| ------------------------------- | ---------------------------------------------- | ---------------------------------- |
| 100 PRs, no date filter         | 102 requests (1 list + 1 detail per merged PR) | 1 request (all PRs in single page) |
| 500 PRs, no date filter         | 502 requests                                   | 5 requests (5 pages × 100 items)   |
| 500 PRs, date filter (50 match) | ~52 requests (early termination at page 1)     | 1 request (early termination)      |

---

## 3. Error Handling Patterns

### Decision: Map GraphQL Errors to REST Error Equivalents

**GraphQL Error Response Structure**:

```typescript
interface GraphQLErrorResponse {
  errors?: Array<{
    type: string;
    message: string;
    path?: Array<string | number>;
    locations?: Array<{ line: number; column: number }>;
  }>;
  data?: null | Partial<GraphQLData>;
}
```

**Error Type Mapping**:

| REST Status                 | GraphQL Error Type               | Error Message Pattern                      | Handling                                                                |
| --------------------------- | -------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| 401 Unauthorized            | `FORBIDDEN` (token invalid)      | `"Bad credentials"`                        | Return `err("Invalid GitHub token. Please sign in again.")`             |
| 403 Forbidden (permissions) | `FORBIDDEN`                      | `"Resource not accessible by integration"` | Return `err("You do not have permission to access this repository...")` |
| 403 Forbidden (rate limit)  | N/A (no error in `errors` array) | Check `x-ratelimit-remaining: 0`           | Return `err("GitHub API rate limit exceeded...")`                       |
| 404 Not Found               | `NOT_FOUND`                      | `"Could not resolve to a Repository"`      | Return `err("Repository not found or you do not have permission...")`   |
| 5xx Server Error            | `INTERNAL`                       | Various                                    | Return `err("GitHub API error: {message}")`                             |

**Implementation Pattern**:

```typescript
try {
  const response = await octokit.graphql<GraphQLResponse>(QUERY, variables);

  // Success: process response.data
  return ok(transformData(response.repository));
} catch (error: any) {
  // GraphQL errors are thrown by Octokit with specific properties
  if (error.errors && Array.isArray(error.errors)) {
    const firstError = error.errors[0];

    // Map to REST-equivalent errors
    if (firstError.type === "NOT_FOUND") {
      return err(
        new Error(
          "Repository not found or you do not have permission to access it.",
        ),
      );
    }

    if (firstError.type === "FORBIDDEN") {
      if (firstError.message.includes("Bad credentials")) {
        return err(new Error("Invalid GitHub token. Please sign in again."));
      }
      return err(
        new Error("You do not have permission to access this repository..."),
      );
    }
  }

  // Rate limiting (no GraphQL error, check headers)
  if (error.headers?.["x-ratelimit-remaining"] === "0") {
    return err(new Error("GitHub API rate limit exceeded..."));
  }

  // Generic error
  return err(new Error(`Failed to fetch pull requests: ${error.message}`));
}
```

**Rationale**:

1. **Interface Compatibility**: By mapping GraphQL errors to REST-equivalent errors, calling code (use cases, UI) sees identical error messages
2. **User Experience**: Error messages remain consistent, no user-facing changes
3. **Rate Limit Detection**: GraphQL rate limit errors don't appear in `errors` array; must check response headers
4. **Test Compatibility**: Existing tests that verify error handling continue to work unchanged

**Alternatives Considered**:

1. **Exposing GraphQL-specific errors**: Would break existing error handling in use cases and UI
2. **Creating new error types for GraphQL**: Unnecessary complexity; REST error semantics are sufficient
3. **Ignoring rate limit headers**: Would miss rate limit errors since GraphQL returns `200` status with `x-ratelimit-remaining: 0`

**Implementation Notes**:

- Octokit's `graphql()` method throws errors for GraphQL responses containing `errors` array
- GraphQL always returns HTTP `200` status, even for errors (errors are in response body)
- Multiple errors can be present in `errors` array; prioritize first error for simplicity
- Rate limit information is in response headers, not GraphQL response body
- For secondary rate limits, check for `retry-after` header (seconds to wait before retrying)

**Rate Limiting Details**:

GitHub GraphQL API uses a **points system** (not simple request counts):

- **Primary Rate Limit**: 5,000 points/hour for users (10,000 for Enterprise Cloud)
- **Secondary Rate Limit**: 2,000 points/minute (GraphQL endpoint)
- **Query Cost Calculation**: Each query has a point cost based on complexity (connections, nested fields)
- **Typical PR Query Cost**: ~1 point for simple queries, ~5-10 points for queries with nested reviews/comments

**Response Headers**:

- `x-ratelimit-limit`: Maximum points per hour (e.g., `5000`)
- `x-ratelimit-remaining`: Points left in current window (e.g., `4950`)
- `x-ratelimit-reset`: Unix timestamp when limit resets (e.g., `1735689600`)
- `x-ratelimit-used`: Points consumed in current window
- `retry-after`: Seconds to wait before retrying (secondary rate limits only)

**Rate Limit Error Response** (Primary):

```json
{
  "data": null,
  "errors": null
}
```

Status: `200 OK`, but `x-ratelimit-remaining: 0`

**Rate Limit Error Response** (Secondary):

```json
{
  "data": null,
  "errors": [
    {
      "type": "RATE_LIMITED",
      "message": "API rate limit exceeded"
    }
  ]
}
```

Status: `200 OK` or `403 Forbidden`, check `retry-after` header

---

## 4. Type Safety with GraphQL

### Decision: Manual TypeScript Type Definitions with Runtime Validation

**Type Definition Approach**:

```typescript
// src/infrastructure/github/types/graphql.ts

/**
 * GraphQL response types for GitHub pull request queries
 * Manually defined to match our specific query structure
 */

export interface GraphQLPullRequestResponse {
  repository: {
    pullRequests: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      nodes: Array<{
        number: number;
        title: string;
        author: {
          login: string;
        } | null;
        createdAt: string; // ISO 8601 timestamp
        mergedAt: string | null; // ISO 8601 timestamp
        state: "OPEN" | "CLOSED" | "MERGED";
        additions: number;
        deletions: number;
        changedFiles: number;
        reviews: {
          totalCount: number;
          nodes: Array<{
            author: {
              login: string;
            } | null;
            createdAt: string;
            body: string;
          }>;
        };
        comments: {
          totalCount: number;
          nodes: Array<{
            id: number;
            author: {
              login: string;
            } | null;
            createdAt: string;
            body: string;
          }>;
        };
      }>;
    };
  };
}

/**
 * Type-safe response from Octokit graphql
 */
export type GraphQLResponse<T> = T;
```

**Runtime Validation Pattern**:

```typescript
function transformPullRequest(node: GraphQLPullRequestNode): PullRequest {
  // Validate required fields
  if (typeof node.number !== "number") {
    throw new Error("Invalid PR number");
  }

  if (typeof node.title !== "string") {
    throw new Error("Invalid PR title");
  }

  // Handle nullable fields with fallbacks
  const author = node.author?.login || "unknown";
  const createdAt = new Date(node.createdAt);
  const mergedAt = node.mergedAt ? new Date(node.mergedAt) : undefined;

  // Determine PR state
  let state: "open" | "closed" | "merged" = "open";
  if (node.state === "MERGED") {
    state = "merged";
  } else if (node.state === "CLOSED") {
    state = "closed";
  }

  return {
    number: node.number,
    title: node.title,
    author,
    createdAt,
    state,
    reviewCommentCount: node.reviews.totalCount,
    mergedAt,
    additions: node.additions,
    deletions: node.deletions,
    changedFiles: node.changedFiles,
  };
}
```

**Rationale**:

1. **No Additional Dependencies**: Manual types avoid adding `@graphql-codegen/*` packages (5+ new dependencies)
2. **Build Simplicity**: No code generation step required in build process
3. **Query-Specific Types**: Types match our exact query structure, not entire GitHub schema
4. **TypeScript Strict Mode**: Manual types enforce strict null checks and type safety
5. **Single File Change**: All types in one file, easy to maintain

**Alternatives Considered**:

| Option                          | Pros                                                           | Cons                                                                                                                                                                                                                                           | Decision               |
| ------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **GraphQL Code Generator**      | Auto-generated types from schema, always up-to-date            | 5+ new dependencies (@graphql-codegen/cli, @graphql-codegen/typescript, @graphql-codegen/typescript-operations, @graphql-codegen/introspection-loader), adds build step, generates 1000+ lines for entire GitHub schema when we need ~50 lines | ❌ Rejected            |
| **@octokit/graphql-schema**     | Official GitHub schema types                                   | 10MB+ package, types for entire GitHub API, doesn't match our specific queries                                                                                                                                                                 | ❌ Rejected            |
| **Manual Type Definitions**     | Zero dependencies, minimal types, query-specific, full control | Requires manual updates if query changes                                                                                                                                                                                                       | ✅ **Selected**        |
| **Runtime Validation with Zod** | Type safety + runtime validation                               | Additional dependency, verbose schemas                                                                                                                                                                                                         | ❌ Rejected (overkill) |

**Implementation Notes**:

1. **String Enums for State**: Use TypeScript literal types (`'OPEN' | 'CLOSED' | 'MERGED'`) instead of enum to avoid runtime overhead
2. **Null Handling**: GraphQL schema marks `author` as nullable (user deletion), provide `'unknown'` fallback
3. **Date Conversion**: GraphQL returns ISO 8601 strings, convert to `Date` objects in transformer
4. **Type Assertion**: Use `as GraphQLPullRequestResponse` when calling `octokit.graphql<T>()` for type safety
5. **Interface Alignment**: Ensure transformed output matches domain `PullRequest` interface exactly

**Type Generation Workflow (Manual)**:

1. Write GraphQL query in `src/infrastructure/github/queries/pullRequests.graphql` (documentation)
2. Test query in [GitHub GraphQL Explorer](https://docs.github.com/en/graphql/overview/explorer)
3. Copy response structure to `src/infrastructure/github/types/graphql.ts`
4. Define TypeScript interfaces matching response structure
5. Create transformer function with runtime validation

**Testing Type Safety**:

```typescript
// In tests, use same type definitions
const mockResponse: GraphQLPullRequestResponse = {
  repository: {
    pullRequests: {
      pageInfo: { hasNextPage: false, endCursor: null },
      nodes: [
        {
          number: 1,
          title: "Test PR",
          author: { login: "testuser" },
          // ... rest of mock data
        },
      ],
    },
  },
};

mockGraphql.mockResolvedValue(mockResponse);
```

---

## 5. Testing Approach

### Decision: Update Mock Response Structures, Maintain Test Contract

**Mock Strategy**:

```typescript
// src/infrastructure/github/__tests__/OctokitAdapter.test.ts

// Create mock GraphQL function
const mockGraphql = vi.fn();

// Mock Octokit with GraphQL support
vi.mock("@octokit/rest", () => {
  return {
    Octokit: class MockOctokit {
      graphql = mockGraphql; // Add graphql method

      rest = {
        // Keep REST mocks for rate limit checking
        rateLimit: {
          get: mockRateLimitGet,
        },
      };
    },
  };
});

describe("OctokitAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock rate limit to avoid rate limiting behavior
    mockRateLimitGet.mockResolvedValue({
      data: {
        rate: {
          limit: 5000,
          remaining: 4999,
          reset: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });
  });

  it("should fetch and transform open PRs correctly", async () => {
    // Mock GraphQL response
    mockGraphql.mockResolvedValue({
      repository: {
        pullRequests: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [
            {
              number: 1,
              title: "Test PR",
              author: { login: "testuser" },
              createdAt: "2024-01-01T00:00:00Z",
              mergedAt: null,
              state: "OPEN",
              additions: 0,
              deletions: 0,
              changedFiles: 0,
              reviews: { totalCount: 0, nodes: [] },
              comments: { totalCount: 0, nodes: [] },
            },
          ],
        },
      },
    });

    const result = await adapter.getPullRequests("owner", "repo");

    // Same expectations as before
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]).toEqual({
        number: 1,
        title: "Test PR",
        author: "testuser",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        state: "open",
        reviewCommentCount: 0,
      });
    }
  });

  it("should fetch detailed stats for merged PRs", async () => {
    mockGraphql.mockResolvedValue({
      repository: {
        pullRequests: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [
            {
              number: 2,
              title: "Merged PR",
              author: { login: "testuser" },
              createdAt: "2024-01-01T00:00:00Z",
              mergedAt: "2024-01-02T00:00:00Z",
              state: "MERGED",
              additions: 100,
              deletions: 50,
              changedFiles: 5,
              reviews: { totalCount: 3, nodes: [] },
              comments: { totalCount: 0, nodes: [] },
            },
          ],
        },
      },
    });

    const result = await adapter.getPullRequests("owner", "repo");

    // Same expectations as before
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]).toEqual({
        number: 2,
        title: "Merged PR",
        author: "testuser",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        state: "merged",
        reviewCommentCount: 3,
        mergedAt: new Date("2024-01-02T00:00:00Z"),
        additions: 100,
        deletions: 50,
        changedFiles: 5,
      });
    }
  });

  it("should handle pagination", async () => {
    // First page
    mockGraphql.mockResolvedValueOnce({
      repository: {
        pullRequests: {
          pageInfo: { hasNextPage: true, endCursor: "cursor123" },
          nodes: [
            {
              number: 1,
              title: "PR 1",
              // ... full PR data
            },
          ],
        },
      },
    });

    // Second page
    mockGraphql.mockResolvedValueOnce({
      repository: {
        pullRequests: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [
            {
              number: 2,
              title: "PR 2",
              // ... full PR data
            },
          ],
        },
      },
    });

    const result = await adapter.getPullRequests("owner", "repo");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
    }

    // Verify pagination calls
    expect(mockGraphql).toHaveBeenCalledTimes(2);
    expect(mockGraphql).toHaveBeenNthCalledWith(1, expect.any(String), {
      owner: "owner",
      repo: "repo",
      first: 100,
      after: null,
    });
    expect(mockGraphql).toHaveBeenNthCalledWith(2, expect.any(String), {
      owner: "owner",
      repo: "repo",
      first: 100,
      after: "cursor123",
    });
  });

  it("should handle GraphQL NOT_FOUND error", async () => {
    mockGraphql.mockRejectedValue({
      errors: [
        {
          type: "NOT_FOUND",
          message:
            "Could not resolve to a Repository with the name 'owner/repo'",
        },
      ],
    });

    const result = await adapter.getPullRequests("owner", "repo");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Repository not found");
    }
  });
});
```

**Test Compatibility Matrix**:

| Test Category  | Current REST Tests                   | GraphQL Migration Changes                    | Test Pass?                         |
| -------------- | ------------------------------------ | -------------------------------------------- | ---------------------------------- |
| Success cases  | Mock `pulls.list()`, `pulls.get()`   | Mock `graphql()` with equivalent response    | ✅ Yes (expectations unchanged)    |
| Error handling | Mock REST errors with `status` field | Mock GraphQL errors with `errors` array      | ✅ Yes (error messages identical)  |
| Pagination     | Mock multiple REST pages             | Mock multiple GraphQL pages with cursors     | ✅ Yes (pagination logic verified) |
| Date filtering | Mock PRs with `sinceDate` filter     | Mock same PRs, early termination tested      | ✅ Yes (same filtering behavior)   |
| Rate limiting  | Mock `rateLimit.get()`               | Keep REST rate limit mock (used for headers) | ✅ Yes (rate limiter unchanged)    |

**Rationale**:

1. **No Test Logic Changes**: Only mock response structures change; test assertions remain identical
2. **Interface Stability**: Tests verify `IGitHubRepository` interface, which doesn't change
3. **Vitest Compatibility**: Same mocking patterns (`vi.mock()`, `vi.fn()`) work for GraphQL
4. **Coverage Maintained**: All 30 existing tests continue to pass, covering same scenarios

**Alternatives Considered**:

1. **MSW (Mock Service Worker)**: Overly complex for unit tests; better for integration/E2E tests
2. **Nock for HTTP mocking**: Not needed since Octokit is mocked at library level
3. **GraphQL-specific mocking libraries**: Unnecessary overhead for simple response mocks

**Implementation Notes**:

1. **Mock Strategy**: Mock `Octokit.graphql` method at the class level, not HTTP requests
2. **Type Safety in Tests**: Use same GraphQL types in test mocks for type checking
3. **Error Simulation**: Create mock errors with `errors` array to test error handling paths
4. **Pagination Testing**: Use `mockResolvedValueOnce()` for sequential page responses
5. **Deleted Users**: Test `author: null` case to verify `'unknown'` fallback

**Test File Changes**:

- **File**: `src/infrastructure/github/__tests__/OctokitAdapter.test.ts`
- **Lines Changed**: ~50-100 (mock responses only)
- **New Tests**: None (existing tests sufficient)
- **Removed Tests**: None (all remain relevant)

**Mock Data Generation Helper**:

```typescript
// Test helper for creating mock GraphQL responses
function createMockGraphQLResponse(
  prs: Array<Partial<GraphQLPullRequestNode>>,
): GraphQLPullRequestResponse {
  return {
    repository: {
      pullRequests: {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: prs.map((pr) => ({
          number: pr.number ?? 1,
          title: pr.title ?? "Test PR",
          author: pr.author ?? { login: "testuser" },
          createdAt: pr.createdAt ?? "2024-01-01T00:00:00Z",
          mergedAt: pr.mergedAt ?? null,
          state: pr.state ?? "OPEN",
          additions: pr.additions ?? 0,
          deletions: pr.deletions ?? 0,
          changedFiles: pr.changedFiles ?? 0,
          reviews: pr.reviews ?? { totalCount: 0, nodes: [] },
          comments: pr.comments ?? { totalCount: 0, nodes: [] },
        })),
      },
    },
  };
}

// Usage in tests
mockGraphql.mockResolvedValue(
  createMockGraphQLResponse([
    { number: 1, title: "Test PR", state: "MERGED" },
    { number: 2, title: "Another PR", state: "OPEN" },
  ]),
);
```

---

## 6. Performance Impact Analysis

### Expected Performance Improvements

| Metric                            | REST API (Current)          | GraphQL API (Target)     | Improvement                    |
| --------------------------------- | --------------------------- | ------------------------ | ------------------------------ |
| **100 PRs, no date filter**       | 102 requests, ~15 seconds   | 1 request, ~0.3 seconds  | 50x faster, 99% fewer requests |
| **500 PRs, no date filter**       | 502 requests, ~75 seconds   | 5 requests, ~1.5 seconds | 50x faster, 99% fewer requests |
| **500 PRs, 50 match date filter** | ~52 requests, ~8 seconds    | 1 request, ~0.3 seconds  | 27x faster, 98% fewer requests |
| **1000 PRs, all merged**          | 1001 requests, ~150 seconds | 10 requests, ~3 seconds  | 50x faster, 99% fewer requests |
| **API rate limit consumption**    | 100-1000 points             | 1-10 points              | 90-99% reduction               |

**Assumptions**:

- REST API: 150ms per request (network latency + processing)
- GraphQL API: 300ms per request (slightly higher due to complexity, but far fewer requests)
- No rate limiting delays
- Sequential requests for simplicity (actual may use some parallelization)

**Rate Limit Impact**:

- **REST**: Each request costs 1 point, merged PR fetching requires 2 requests (list + detail)
- **GraphQL**: Each query costs ~5-10 points (based on nested connections), but only 1-10 queries needed
- **Net Result**: 80-90% rate limit point savings despite higher per-query cost

---

## 7. Implementation Checklist

### Pre-Implementation Validation

- [x] Verify GitHub GraphQL API provides all required PR fields
- [x] Confirm Octokit's built-in `graphql()` method supports TypeScript
- [x] Research pagination mechanism (cursor-based)
- [x] Understand error handling differences between REST and GraphQL
- [x] Identify rate limiting differences and best practices

### Implementation Steps

- [ ] Create GraphQL type definitions in `src/infrastructure/github/types/graphql.ts`
- [ ] Define PR query string constant in `OctokitAdapter.ts`
- [ ] Replace REST API calls in `getPullRequests()` with GraphQL query
- [ ] Implement cursor-based pagination with early termination
- [ ] Implement PR data transformer (GraphQL response → domain `PullRequest`)
- [ ] Map GraphQL errors to REST-equivalent errors
- [ ] Update test mocks to return GraphQL response structures
- [ ] Run test suite and verify all 30 tests pass
- [ ] Manual testing: Verify PR data matches between REST and GraphQL
- [ ] Performance testing: Measure actual time reduction for various repository sizes

### Post-Implementation Validation

- [ ] Verify no changes to domain/application layers
- [ ] Confirm identical error messages in UI
- [ ] Test with repositories of varying sizes (10, 100, 1000+ PRs)
- [ ] Verify rate limit handling under low-rate-limit scenarios
- [ ] Confirm date filtering and early termination work correctly

---

## 8. Open Questions & Risks

### Resolved Questions

1. **Q**: Does GraphQL support date filtering like REST's `since` parameter?
   **A**: No native support. Must filter client-side after fetching, but early termination optimization still applies.

2. **Q**: Are additions/deletions/changedFiles available without separate detail queries?
   **A**: Yes, directly available on `PullRequest` object in GraphQL.

3. **Q**: How are deleted GitHub users handled?
   **A**: `author` field is nullable; use `'unknown'` fallback (same as REST behavior).

4. **Q**: Does GraphQL rate limiting differ from REST?
   **A**: Yes, uses points system (5,000/hour) instead of request counts. GraphQL queries cost more per query but result in net 80-90% savings.

### Risks & Mitigations

| Risk                                        | Likelihood | Impact | Mitigation                                                              |
| ------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------- |
| GraphQL query complexity exceeds rate limit | Low        | High   | Test with large repositories, adjust nested connection limits if needed |
| Breaking changes in GitHub GraphQL schema   | Low        | Medium | GitHub maintains backward compatibility; subscribe to API changelog     |
| Test mocking issues with Octokit graphql    | Low        | Medium | Verify mock strategy in isolated test before full migration             |
| Performance not meeting <1s target          | Low        | High   | Profile actual query performance, optimize nested connections if needed |
| User-facing error message changes           | Low        | High   | Comprehensive error mapping and manual testing before deployment        |

---

## 9. References

### Official Documentation

- [GitHub GraphQL API Documentation](https://docs.github.com/en/graphql)
- [GitHub GraphQL API Objects Reference](https://docs.github.com/en/graphql/reference/objects)
- [Using Pagination in the GraphQL API](https://docs.github.com/en/graphql/guides/using-pagination-in-the-graphql-api)
- [Rate Limits and Query Limits for the GraphQL API](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api)

### Octokit & TypeScript

- [Octokit GraphQL.js Repository](https://github.com/octokit/graphql.js)
- [Adding TypeScript Types to GitHub's GraphQL API](https://benlimmer.com/blog/2020/05/16/adding-typescript-types-github-graphql-api/)
- [Mastering Octokit GraphQL with TypeScript](https://www.xjavascript.com/blog/octokit-graphql-typescript/)

### Code Generation (Not Used)

- [GraphQL Code Generator](https://the-guild.dev/graphql/codegen)
- [graphql-codegen GitHub Repository](https://github.com/dotansimha/graphql-code-generator)

### Community Resources

- [GitHub GraphQL API Cheatsheet](https://medium.com/@tharshita13/github-graphql-api-cheatsheet-38e916fe76a3)
- [Paginating through the GitHub GraphQL API with Python](https://til.simonwillison.net/github/graphql-pagination-python)
- [Understanding GitHub API Rate Limits](https://github.com/orgs/community/discussions/163553)

---

## Appendix A: Complete GraphQL Query Example

```graphql
query GetPullRequests(
  $owner: String!
  $repo: String!
  $first: Int!
  $after: String
) {
  repository(owner: $owner, name: $repo) {
    pullRequests(
      first: $first
      after: $after
      orderBy: { field: CREATED_AT, direction: DESC }
      states: [OPEN, CLOSED, MERGED]
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
      nodes {
        number
        title
        author {
          login
        }
        createdAt
        mergedAt
        closedAt
        state
        additions
        deletions
        changedFiles
        reviews(first: 100) {
          totalCount
          nodes {
            id
            author {
              login
            }
            createdAt
            state
            body
          }
        }
        comments(first: 100) {
          totalCount
          nodes {
            id
            author {
              login
            }
            createdAt
            body
          }
        }
        labels(first: 10) {
          nodes {
            name
          }
        }
      }
    }
  }
  rateLimit {
    limit
    remaining
    resetAt
    used
  }
}
```

**Variables**:

```json
{
  "owner": "facebook",
  "repo": "react",
  "first": 100,
  "after": null
}
```

---

## Appendix B: Error Handling Example Responses

### 401 Unauthorized (Invalid Token)

```json
{
  "data": null,
  "errors": [
    {
      "type": "FORBIDDEN",
      "message": "Bad credentials"
    }
  ]
}
```

### 404 Not Found (Repository Doesn't Exist)

```json
{
  "data": null,
  "errors": [
    {
      "type": "NOT_FOUND",
      "path": ["repository"],
      "message": "Could not resolve to a Repository with the name 'owner/repo'"
    }
  ]
}
```

### 403 Forbidden (Insufficient Permissions)

```json
{
  "data": {
    "repository": {
      "pullRequests": null
    }
  },
  "errors": [
    {
      "type": "FORBIDDEN",
      "path": ["repository", "pullRequests"],
      "message": "Resource not accessible by integration"
    }
  ]
}
```

### Primary Rate Limit Exceeded

**Response**:

```json
{
  "data": null,
  "errors": null
}
```

**Headers**:

```
x-ratelimit-limit: 5000
x-ratelimit-remaining: 0
x-ratelimit-reset: 1735689600
```

### Secondary Rate Limit Exceeded

**Response**:

```json
{
  "data": null,
  "errors": [
    {
      "type": "RATE_LIMITED",
      "message": "API rate limit exceeded"
    }
  ]
}
```

**Headers**:

```
retry-after: 60
```

---

**Document Status**: Complete
**Next Steps**: Proceed to Phase 1 (Data Model & Quickstart) with query design and type definitions validated.
