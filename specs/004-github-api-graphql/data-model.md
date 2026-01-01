# Data Model: GitHub GraphQL API Types

**Feature**: GitHub API GraphQL Migration
**Created**: 2026-01-01
**Purpose**: Define TypeScript type structures for GitHub GraphQL API responses

## Overview

This document defines the TypeScript type structures for GraphQL responses from the GitHub API. These types ensure type safety when transforming GraphQL data into domain entities.

**Key Principles**:

- Types mirror GraphQL response structure (nested objects)
- Use TypeScript strict mode (all fields explicitly typed)
- Optional fields marked with `?` where GitHub API may omit values
- Date fields are ISO 8601 strings (transformed to Date objects by adapter)

## Core Types

### Pull Request Response

Represents the complete GraphQL response structure for a pull request query.

```typescript
interface GitHubGraphQLPullRequest {
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
```

**Field Mapping to Domain**:

| GraphQL Field        | Domain Entity Field              | Transformation                         |
| -------------------- | -------------------------------- | -------------------------------------- |
| `number`             | `PullRequest.number`             | Direct mapping                         |
| `title`              | `PullRequest.title`              | Direct mapping                         |
| `state`              | `PullRequest.state`              | Map "MERGED" → "closed" + set mergedAt |
| `createdAt`          | `PullRequest.createdAt`          | Parse ISO 8601 to Date                 |
| `mergedAt`           | `PullRequest.mergedAt`           | Parse ISO 8601 to Date or null         |
| `author.login`       | `PullRequest.author`             | Extract login, handle null             |
| `additions`          | `PullRequest.additions`          | Direct mapping                         |
| `deletions`          | `PullRequest.deletions`          | Direct mapping                         |
| `changedFiles`       | `PullRequest.changedFiles`       | Direct mapping                         |
| `reviews.totalCount` | `PullRequest.reviewCommentCount` | Direct mapping                         |

**Validation Rules**:

- `number` must be positive integer
- `author.login` fallback to "unknown" if null (deleted user)
- `state` "MERGED" requires non-null `mergedAt`
- Numeric fields (additions, deletions, changedFiles) must be non-negative

### Paginated Response Structure

Represents the top-level GraphQL query response with pagination support.

```typescript
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
}
```

**Pagination Fields**:

- `hasNextPage`: Boolean indicating if more results exist
- `endCursor`: Opaque cursor string for next page (null if no next page)
- `nodes`: Array of pull request objects (max 100 per query)

**Pagination Flow**:

1. Initial query: No cursor, fetches first 100 items
2. Check `hasNextPage`: If true, use `endCursor` for next query
3. Repeat until `hasNextPage` is false or date filter met
4. Early termination: Stop when `createdAt` is older than `sinceDate`

### Review Comment Response

Represents individual review comments fetched separately (if needed for batch operations).

```typescript
interface GitHubGraphQLReviewComment {
  pullRequestNumber: number; // Added for association
  id: string;
  body: string;
  createdAt: string; // ISO 8601 date string
  author: {
    login: string;
  } | null;
}
```

**Field Mapping to Domain**:

| GraphQL Field       | Domain Entity Field               | Transformation             |
| ------------------- | --------------------------------- | -------------------------- |
| `id`                | `ReviewComment.id`                | Direct mapping             |
| `body`              | `ReviewComment.body`              | Direct mapping             |
| `createdAt`         | `ReviewComment.createdAt`         | Parse ISO 8601 to Date     |
| `author.login`      | `ReviewComment.author`            | Extract login, handle null |
| `pullRequestNumber` | `ReviewComment.pullRequestNumber` | Direct mapping             |

### Error Response Structure

Represents GraphQL error responses for error handling.

```typescript
interface GitHubGraphQLError {
  message: string;
  type?: string; // e.g., "NOT_FOUND", "FORBIDDEN"
  path?: string[]; // Query path where error occurred
  extensions?: {
    code?: string; // e.g., "AUTHENTICATION_FAILURE"
  };
}

interface GitHubGraphQLErrorResponse {
  errors: GitHubGraphQLError[];
  data?: null; // Data is null when errors occur
}
```

**Error Type Mapping**:

| GraphQL Error Type       | HTTP Equivalent | Result Error Message          |
| ------------------------ | --------------- | ----------------------------- |
| `AUTHENTICATION_FAILURE` | 401             | "Invalid GitHub token"        |
| `FORBIDDEN`              | 403             | "Access denied to repository" |
| `NOT_FOUND`              | 404             | "Repository not found"        |
| Generic error            | 500             | GraphQL error message         |

**Error Detection**:

- Presence of `errors` array indicates failure
- `data` field is null or undefined when errors exist
- Check `errors[0].type` or `errors[0].extensions.code` for specific error types

## Type Transformations

### GraphQL → Domain Entity Transformation

**Pull Request Transformation Logic**:

```typescript
function transformGraphQLPullRequestToDomain(
  gql: GitHubGraphQLPullRequest,
  owner: string,
  repo: string,
): PullRequest {
  return {
    number: gql.number,
    title: gql.title,
    author: gql.author?.login ?? "unknown", // Handle deleted users
    createdAt: new Date(gql.createdAt),
    mergedAt: gql.mergedAt ? new Date(gql.mergedAt) : null,
    state:
      gql.state === "MERGED"
        ? "merged"
        : (gql.state.toLowerCase() as "open" | "closed"),
    additions: gql.additions,
    deletions: gql.deletions,
    changedFiles: gql.changedFiles,
    reviewCommentCount: gql.reviews.totalCount,
    repository: { owner, repo },
  };
}
```

**Key Transformation Rules**:

1. **State Normalization**: GraphQL "MERGED" → domain "closed" (with non-null mergedAt)
2. **Null Handling**: Deleted users → "unknown" author
3. **Date Parsing**: ISO 8601 strings → JavaScript Date objects
4. **Case Conversion**: GraphQL UPPERCASE → domain lowercase for states

### Review Comment Transformation

```typescript
function transformGraphQLReviewCommentToDomain(
  gql: GitHubGraphQLReviewComment,
): ReviewComment {
  return {
    id: gql.id,
    body: gql.body,
    author: gql.author?.login ?? "unknown",
    createdAt: new Date(gql.createdAt),
    pullRequestNumber: gql.pullRequestNumber,
  };
}
```

## Validation Requirements

### Runtime Validation Points

**Critical Validation** (must validate):

- Repository response is non-null
- `pullRequests.nodes` is an array (not null)
- Required fields exist: `number`, `title`, `createdAt`

**Optional Validation** (recommended for robustness):

- Numeric fields are non-negative integers
- Date strings are valid ISO 8601 format
- State values match expected enum

**Validation Strategy**:

```typescript
function validateGraphQLPullRequest(
  gql: unknown,
): gql is GitHubGraphQLPullRequest {
  if (typeof gql !== "object" || gql === null) return false;

  const pr = gql as Record<string, unknown>;

  return (
    typeof pr.number === "number" &&
    typeof pr.title === "string" &&
    typeof pr.createdAt === "string" &&
    (pr.state === "OPEN" || pr.state === "CLOSED" || pr.state === "MERGED")
  );
}
```

## Edge Cases

### Deleted Users

- **GraphQL Response**: `author: null`
- **Domain Mapping**: Set `author` to `"unknown"`
- **Rationale**: Prevents null pointer errors, maintains data integrity

### Unmerged PRs

- **GraphQL Response**: `mergedAt: null`, `state: "OPEN" | "CLOSED"`
- **Domain Mapping**: `mergedAt: null`, `state: "open" | "closed"`
- **Validation**: Ensure `state === "MERGED"` implies `mergedAt !== null`

### Empty Repository

- **GraphQL Response**: `pullRequests.nodes: []`, `hasNextPage: false`
- **Domain Mapping**: Return empty array `[]`
- **Validation**: Empty array is valid, no error thrown

### API Rate Limiting

- **GraphQL Response**: Error with type `RATE_LIMITED`
- **Domain Mapping**: Result.failure with rate limit message
- **Recovery**: Exponential backoff or user notification

### Large Repositories (10,000+ PRs)

- **Pagination**: Continue until `hasNextPage: false` or date filter met
- **Performance**: Early termination when `createdAt < sinceDate`
- **Memory**: Process in chunks, don't accumulate all PRs in memory

## Type Safety Notes

### TypeScript Strict Mode Compliance

- All fields explicitly typed (no implicit `any`)
- Optional fields marked with `?` or `| null`
- Union types for enums (`"OPEN" | "CLOSED" | "MERGED"`)
- No type assertions without runtime validation

### Runtime vs Compile-Time Safety

- **Compile-Time**: TypeScript types prevent incorrect field access
- **Runtime**: Validation functions catch malformed API responses
- **Strategy**: Trust GraphQL schema, validate critical paths only

### Type Guards

Use type guards for narrowing unknown responses:

```typescript
function isGraphQLPullRequest(obj: unknown): obj is GitHubGraphQLPullRequest {
  // Runtime validation logic (see Validation Strategy above)
}
```

## References

- [GitHub GraphQL API Objects: PullRequest](https://docs.github.com/en/graphql/reference/objects#pullrequest)
- [GitHub GraphQL API Objects: Review](https://docs.github.com/en/graphql/reference/objects#review)
- [GitHub GraphQL API Objects: PageInfo](https://docs.github.com/en/graphql/reference/objects#pageinfo)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
