# Quickstart: GitHub API GraphQL Migration

**Feature**: GitHub API GraphQL Migration
**Branch**: `004-github-api-graphql`
**Created**: 2026-01-01

## Overview

This guide provides a step-by-step walkthrough for migrating the `OctokitAdapter` from REST API to GraphQL API. The migration is designed to be surgical: only one file changes (`OctokitAdapter.ts`), and all existing tests must pass without modification.

**Key Constraints**:

- ✅ Interface unchanged: `IGitHubRepository` stays the same
- ✅ All 30 unit tests pass without modification
- ✅ Backward compatible: Same input/output behavior
- ✅ Performance improved: 15 seconds → <1 second for large repos

## Prerequisites

Before starting the migration, ensure:

1. **Development environment is ready**:

   ```bash
   pnpm install
   pnpm test:domain  # Verify tests run successfully
   pnpm type-check   # Verify TypeScript compilation
   ```

2. **Understand current implementation**:
   - Read `src/infrastructure/github/OctokitAdapter.ts` (current REST implementation)
   - Review `src/infrastructure/github/__tests__/OctokitAdapter.test.ts` (30 unit tests)
   - Understand `IGitHubRepository` interface contract

3. **Reference documentation**:
   - [research.md](./research.md) - GraphQL API research and best practices
   - [data-model.md](./data-model.md) - TypeScript type definitions
   - [contracts/pull-requests.graphql](./contracts/pull-requests.graphql) - Main PR query
   - [contracts/review-comments.graphql](./contracts/review-comments.graphql) - Additional comments query

## Migration Steps

### Step 1: Add GraphQL Type Definitions

Create TypeScript types for GraphQL responses in `OctokitAdapter.ts`:

```typescript
// Add near the top of OctokitAdapter.ts, after imports

/**
 * GitHub GraphQL API Response Types
 */
interface GitHubGraphQLPullRequest {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  createdAt: string;
  mergedAt: string | null;
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
}

interface GitHubGraphQLPullRequestsResponse {
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
    resetAt: string;
  };
}
```

**Why**: Type safety for GraphQL responses, enables IDE autocomplete

### Step 2: Replace `getPullRequests()` Implementation

**Current Implementation**: Uses REST API with `octokit.rest.pulls.list()` and `octokit.rest.pulls.get()`

**New Implementation**: Use GraphQL query

```typescript
async getPullRequests(
  owner: string,
  repo: string,
  sinceDate?: Date
): Promise<Result<PullRequest[]>> {
  const token = await this.getToken();
  if (!token) {
    return Result.failure("No GitHub session available");
  }

  const allPullRequests: PullRequest[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  try {
    while (hasNextPage) {
      // Wait for rate limit before making request
      await this.rateLimiter.waitIfNeeded();

      // Execute GraphQL query
      const response = await this.octokit.graphql<GitHubGraphQLPullRequestsResponse>(
        `
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
        `,
        {
          owner,
          repo,
          first: 100,
          after: cursor,
        }
      );

      // Transform GraphQL response to domain entities
      const prs = response.repository.pullRequests.nodes.map(
        (gqlPR): PullRequest => ({
          number: gqlPR.number,
          title: gqlPR.title,
          author: gqlPR.author?.login ?? "unknown",
          createdAt: new Date(gqlPR.createdAt),
          mergedAt: gqlPR.mergedAt ? new Date(gqlPR.mergedAt) : null,
          state: gqlPR.state === "MERGED" ? "closed" : gqlPR.state.toLowerCase(),
          additions: gqlPR.additions,
          deletions: gqlPR.deletions,
          changedFiles: gqlPR.changedFiles,
          reviewCommentCount: gqlPR.reviews.totalCount,
          repository: { owner, repo },
        })
      );

      // Filter by date if sinceDate provided
      const filteredPRs = sinceDate
        ? prs.filter((pr) => pr.createdAt >= sinceDate)
        : prs;

      allPullRequests.push(...filteredPRs);

      // Early termination: Stop if we've reached PRs older than sinceDate
      if (sinceDate && filteredPRs.length < prs.length) {
        break; // Found PR older than sinceDate, stop pagination
      }

      // Check if more pages exist
      hasNextPage = response.repository.pullRequests.pageInfo.hasNextPage;
      cursor = response.repository.pullRequests.pageInfo.endCursor;

      // Update rate limit info
      this.rateLimiter.updateRateLimit({
        limit: response.rateLimit.limit,
        remaining: response.rateLimit.remaining,
        reset: new Date(response.rateLimit.resetAt),
      });
    }

    return Result.success(allPullRequests);
  } catch (error) {
    return this.handleGraphQLError(error, "fetching pull requests");
  }
}
```

**Key Changes**:

- Replace REST API calls with single GraphQL query
- Maintain cursor-based pagination
- Preserve early termination for `sinceDate` filtering
- Transform GraphQL response structure to domain entities
- Handle null authors (deleted users → "unknown")

### Step 3: Add GraphQL Error Handler

Add a helper method for consistent error handling:

```typescript
private handleGraphQLError(error: unknown, operation: string): Result<never> {
  const err = error as { message?: string; errors?: Array<{ type?: string }> };

  // Check for specific GraphQL error types
  if (err.errors && err.errors.length > 0) {
    const firstError = err.errors[0];

    if (firstError.type === "NOT_FOUND") {
      return Result.failure("Repository not found or access denied");
    }

    if (firstError.type === "FORBIDDEN") {
      return Result.failure("Access denied to repository");
    }

    if (firstError.type === "AUTHENTICATION_FAILURE") {
      return Result.failure("Invalid GitHub token");
    }
  }

  // Generic error fallback
  const message = err.message ?? `Error ${operation}`;
  return Result.failure(message);
}
```

**Why**: Maps GraphQL errors to same error messages as REST implementation

### Step 4: Update `getReviewComments()` (Optional Optimization)

**Current Implementation**: Separate REST API calls for each PR

**New Implementation**: Comments are now included in main PR query

```typescript
async getReviewComments(
  owner: string,
  repo: string,
  pullRequestNumbers: number[]
): Promise<Result<ReviewComment[]>> {
  // Comments are now fetched with PRs in getPullRequests()
  // This method can be simplified or kept for backward compatibility

  const token = await this.getToken();
  if (!token) {
    return Result.failure("No GitHub session available");
  }

  const allComments: ReviewComment[] = [];

  try {
    for (const prNumber of pullRequestNumbers) {
      await this.rateLimiter.waitIfNeeded();

      // Fetch additional comments if PR had 100+ comments
      const response = await this.octokit.graphql<{
        repository: {
          pullRequest: {
            comments: {
              nodes: Array<{
                id: string;
                body: string;
                createdAt: string;
                author: { login: string } | null;
              }>;
            };
          };
        };
      }>(
        `
          query GetReviewComments($owner: String!, $repo: String!, $prNumber: Int!) {
            repository(owner: $owner, name: $repo) {
              pullRequest(number: $prNumber) {
                comments(first: 100) {
                  nodes {
                    id
                    body
                    createdAt
                    author {
                      login
                    }
                  }
                }
              }
            }
          }
        `,
        { owner, repo, prNumber }
      );

      const comments = response.repository.pullRequest.comments.nodes.map(
        (c): ReviewComment => ({
          id: c.id,
          body: c.body,
          author: c.author?.login ?? "unknown",
          createdAt: new Date(c.createdAt),
          pullRequestNumber: prNumber,
        })
      );

      allComments.push(...comments);
    }

    return Result.success(allComments);
  } catch (error) {
    return this.handleGraphQLError(error, "fetching review comments");
  }
}
```

**Note**: This method is now mostly redundant since comments are fetched with PRs. Keep it for interface compatibility.

### Step 5: Update Test Mocks

Modify `__tests__/OctokitAdapter.test.ts` to mock GraphQL responses instead of REST:

**Before (REST mock)**:

```typescript
mockOctokit.rest.pulls.list.mockResolvedValue({
  data: [
    {
      number: 1,
      title: "Test PR",
      user: { login: "testuser" },
      created_at: "2025-01-01T00:00:00Z",
      // ...
    },
  ],
});
```

**After (GraphQL mock)**:

```typescript
mockOctokit.graphql.mockResolvedValue({
  repository: {
    pullRequests: {
      nodes: [
        {
          number: 1,
          title: "Test PR",
          author: { login: "testuser" },
          createdAt: "2025-01-01T00:00:00Z",
          state: "OPEN",
          mergedAt: null,
          additions: 100,
          deletions: 50,
          changedFiles: 3,
          reviews: { totalCount: 2 },
          comments: {
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  },
  rateLimit: {
    limit: 5000,
    cost: 1,
    remaining: 4999,
    resetAt: "2026-01-01T12:00:00Z",
  },
});
```

**Key Changes**:

- Mock `octokit.graphql()` instead of `octokit.rest.pulls.*`
- Match GraphQL response structure (nested `repository.pullRequests.nodes`)
- Include pagination info (`pageInfo`)
- Include rate limit info

### Step 6: Run Tests

Verify all tests pass:

```bash
# Run all tests
pnpm test

# Run only OctokitAdapter tests
pnpm test src/infrastructure/github/__tests__/OctokitAdapter.test.ts

# Run with coverage
pnpm test:coverage
```

**Expected Outcome**: All 30 existing tests pass without modification to test assertions

### Step 7: Manual Verification

Test the migration with a real repository:

```bash
# Start the dev server
pnpm dev

# Navigate to PR Throughput Analysis
# Select a repository with 100+ PRs (e.g., facebook/react)
# Measure load time (should be < 1 second)

# Monitor console for:
# - GraphQL query execution
# - Pagination behavior
# - Error handling
```

**Success Criteria**:

- PR data loads in < 1 second (vs. 15 seconds with REST)
- All PR fields display correctly
- Review comments appear
- No console errors

## Testing Strategy

### Unit Tests (Existing 30 Tests)

**Test Categories**:

1. **validateAccess** (5 tests)
   - Mock GraphQL query to validate repository access
   - Return success for valid repo, errors for 401/403/404

2. **getPullRequests** (8 tests)
   - Mock GraphQL response with PR nodes
   - Test pagination: multiple pages, early termination
   - Test date filtering: `sinceDate` logic
   - Test empty repository: empty `nodes` array

3. **getReviewComments** (7 tests)
   - Mock GraphQL comment response
   - Test multiple PRs, empty comments
   - Test error scenarios

4. **getRateLimitStatus** (3 tests)
   - Mock rate limit response from GraphQL query

5. **getLog** (7 tests)
   - No changes (Git log fetching unchanged)

**Test Modifications Required**:

- Update mock implementations to return GraphQL response structures
- Assertions remain unchanged (same domain entities returned)

### Integration Testing

**Manual Test Cases**:

1. **Large Repository (1000+ PRs)**
   - Repository: `facebook/react`, `microsoft/vscode`
   - Expected: Load time < 1 second
   - Verify: All PRs display, pagination works

2. **Small Repository (< 100 PRs)**
   - Repository: Your own small repo
   - Expected: Single query, no pagination
   - Verify: All PRs display

3. **Empty Repository**
   - Repository: New repo with no PRs
   - Expected: Empty state message
   - Verify: No errors, graceful handling

4. **Permission Errors**
   - Repository: Private repo without access
   - Expected: "Access denied" error message
   - Verify: User-friendly error displayed

## Performance Benchmarks

**Before (REST API)**:

- 100 PRs: ~100 API calls, 15-20 seconds
- Rate limit consumption: 100-300 requests

**After (GraphQL API)**:

- 100 PRs: 1-2 API calls, <1 second
- Rate limit consumption: 100-200 points (~10-20x more efficient)

**Measurement Method**:

```typescript
const startTime = performance.now();
const result = await octokitAdapter.getPullRequests("facebook", "react");
const endTime = performance.now();
console.log(`Fetch time: ${endTime - startTime}ms`);
```

## Troubleshooting

### Issue: Tests Fail After Migration

**Symptoms**: Unit tests fail with "Cannot read property 'pullRequests' of undefined"

**Solution**: Verify GraphQL mock response structure matches expected format:

```typescript
mockOctokit.graphql.mockResolvedValue({
  repository: {  // ← Must have this wrapper
    pullRequests: {
      nodes: [...],
      pageInfo: { hasNextPage: false, endCursor: null }
    }
  },
  rateLimit: { ... }
});
```

### Issue: Rate Limit Errors

**Symptoms**: "Rate limit exceeded" errors during testing

**Solution**: Ensure rate limit is mocked correctly:

```typescript
rateLimit: {
  limit: 5000,
  cost: 1,
  remaining: 4999,
  resetAt: new Date(Date.now() + 3600000).toISOString()
}
```

### Issue: Pagination Not Working

**Symptoms**: Only first 100 PRs load

**Solution**: Verify pagination loop checks `hasNextPage` and updates `cursor`:

```typescript
hasNextPage = response.repository.pullRequests.pageInfo.hasNextPage;
cursor = response.repository.pullRequests.pageInfo.endCursor;
```

### Issue: TypeScript Errors

**Symptoms**: "Type 'unknown' is not assignable to type..."

**Solution**: Add explicit type annotation to `graphql()` call:

```typescript
const response = await this.octokit.graphql<GitHubGraphQLPullRequestsResponse>(
  // ↑ Type parameter here
  `query GetPullRequests(...) { ... }`,
  { owner, repo, first: 100 },
);
```

## Rollback Plan

If migration causes issues in production:

1. **Revert the commit**:

   ```bash
   git revert HEAD
   git push
   ```

2. **Restore REST implementation**:
   - Checkout previous version of `OctokitAdapter.ts`
   - Run tests to verify functionality

3. **Investigation**:
   - Check error logs for GraphQL error details
   - Verify rate limit status
   - Test with different repository sizes

## Next Steps

After successful migration:

1. **Monitor Performance**:
   - Add logging for query execution times
   - Track API rate limit consumption
   - Compare before/after metrics

2. **Optimize Further** (optional):
   - Cache frequently accessed repositories
   - Implement background refresh
   - Add loading indicators for large repositories

3. **Documentation**:
   - Update README with new performance benchmarks
   - Document GraphQL query patterns for future features
   - Share learnings with team

## References

- [GitHub GraphQL API Documentation](https://docs.github.com/en/graphql)
- [Octokit GraphQL.js](https://github.com/octokit/graphql.js)
- [research.md](./research.md) - Detailed API research
- [data-model.md](./data-model.md) - Type definitions
- [contracts/](./contracts/) - GraphQL query examples
