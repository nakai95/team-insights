# API Contracts: Developer Activity Dashboard

**Feature**: 001-dev-activity-dashboard
**Date**: 2025-11-27
**Purpose**: Define Server Action and API Route contracts

## Overview

This document defines all API contracts for the Developer Activity Dashboard. The application uses Next.js 14 Server Actions as the primary approach with API Routes as fallback. All endpoints follow RESTful conventions where applicable.

## Authentication

**Token Handling**:

- GitHub tokens are provided per-request (no persistent authentication)
- Tokens are validated on the server-side before processing
- Tokens are never stored or logged

**Security Headers**:

- All responses include `X-Content-Type-Options: nosniff`
- HTTPS enforced for all communications

---

## Server Actions

### 1. analyzeRepository

**Purpose**: Analyze a GitHub repository and return activity metrics

**Function Signature**:

```typescript
async function analyzeRepository(
  request: AnalysisRequest,
): Promise<Result<AnalysisResult, AnalysisError>>;
```

**Request Type**:

```typescript
interface AnalysisRequest {
  repositoryUrl: string; // GitHub HTTPS URL
  githubToken: string; // Personal access token
  dateRange?: {
    start: string; // ISO 8601 date string
    end: string; // ISO 8601 date string
  };
}
```

**Response Type (Success)**:

```typescript
interface AnalysisResult {
  analysis: {
    id: string;
    repositoryUrl: string;
    analyzedAt: string; // ISO 8601 timestamp
    dateRange: {
      start: string;
      end: string;
    };
    status: "completed";
  };
  contributors: ContributorDto[];
  summary: {
    totalContributors: number;
    totalCommits: number;
    totalPullRequests: number;
    totalReviewComments: number;
    analysisTimeMs: number;
  };
}
```

**Error Codes**:

```typescript
export const AnalysisErrorCode = {
  INVALID_URL: "INVALID_URL",
  INVALID_TOKEN: "INVALID_TOKEN",
  REPO_NOT_FOUND: "REPO_NOT_FOUND",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  CLONE_FAILED: "CLONE_FAILED",
  ANALYSIS_TIMEOUT: "ANALYSIS_TIMEOUT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
export type AnalysisErrorCode =
  (typeof AnalysisErrorCode)[keyof typeof AnalysisErrorCode];
```

**Response Type (Error)**:

```typescript
interface AnalysisError {
  code: AnalysisErrorCode;
  message: string;
  details?: unknown;
}
```

**Validation Rules**:

- `repositoryUrl`: Must match `https://github.com/{owner}/{repo}` format
- `githubToken`: Must be 20-100 characters, alphanumeric + underscores
- `dateRange.start`: Must be before `dateRange.end`
- `dateRange.end`: Cannot be in the future
- Date range: Maximum 10 years

**Business Logic**:

1. Validate input using Zod schema
2. Validate GitHub token permissions (read access to repo)
3. Clone repository to temporary directory
4. Parse git log with `--since` filter
5. Fetch PR data from GitHub API
6. Fetch review data from GitHub API
7. Calculate metrics per contributor
8. Clean up temporary directory
9. Return aggregated results

**Performance**:

- Expected: < 2 minutes for typical repositories (<1000 commits)
- Timeout: 60 seconds (Vercel limit)
- Progress updates: Via Server-Sent Events every 5 seconds

**Error Handling**:

- Invalid input → Return validation error with field details
- GitHub API errors → Map to user-friendly messages
- Timeout → Suggest reducing date range
- Rate limit → Display remaining quota and wait time

---

### 2. mergeIdentities

**Purpose**: Merge multiple contributor identities into one

**Function Signature**:

```typescript
async function mergeIdentities(
  request: MergeRequest,
): Promise<Result<MergeResult, MergeError>>;
```

**Request Type**:

```typescript
interface MergeRequest {
  repositoryUrl: string;
  primaryContributorId: string;
  mergedContributorIds: string[];
}
```

**Response Type (Success)**:

```typescript
interface MergeResult {
  merge: {
    id: string;
    primaryContributorId: string;
    mergedContributorIds: string[];
    createdAt: string;
  };
  mergedContributor: ContributorDto;
}
```

**Error Codes**:

```typescript
export const MergeErrorCode = {
  CONTRIBUTOR_NOT_FOUND: "CONTRIBUTOR_NOT_FOUND",
  DUPLICATE_MERGE: "DUPLICATE_MERGE",
  INVALID_MERGE: "INVALID_MERGE",
  STORAGE_ERROR: "STORAGE_ERROR",
} as const;
export type MergeErrorCode =
  (typeof MergeErrorCode)[keyof typeof MergeErrorCode];
```

**Response Type (Error)**:

```typescript
interface MergeError {
  code: MergeErrorCode;
  message: string;
  details?: unknown;
}
```

**Validation Rules**:

- `repositoryUrl`: Must be valid GitHub URL
- `primaryContributorId`: Must exist in current analysis
- `mergedContributorIds`: Must be non-empty array of existing contributor IDs
- No duplicates between primary and merged IDs

**Business Logic**:

1. Validate request
2. Retrieve contributor data from current analysis (in-memory or passed from client)
3. Merge metrics (sum all activities)
4. Combine email lists
5. Save merge preference to localStorage (client-side after return)
6. Return updated contributor

**Performance**:

- Expected: < 1 second (simple aggregation)
- No external API calls required

---

## API Routes (Fallback)

### POST /api/analyze

**Purpose**: Alternative endpoint for repository analysis (if Server Actions not suitable)

**Request**:

```http
POST /api/analyze
Content-Type: application/json

{
  "repositoryUrl": "https://github.com/owner/repo",
  "githubToken": "ghp_...",
  "dateRange": {
    "start": "2024-05-27T00:00:00Z",
    "end": "2024-11-27T23:59:59Z"
  }
}
```

**Response (Success - 200 OK)**:

```json
{
  "analysis": {
    "id": "uuid",
    "repositoryUrl": "https://github.com/owner/repo",
    "analyzedAt": "2025-11-27T10:30:00Z",
    "dateRange": {
      "start": "2024-05-27T00:00:00Z",
      "end": "2024-11-27T23:59:59Z"
    },
    "status": "completed"
  },
  "contributors": [...],
  "summary": {
    "totalContributors": 15,
    "totalCommits": 487,
    "totalPullRequests": 92,
    "totalReviewComments": 234,
    "analysisTimeMs": 45000
  }
}
```

**Response (Error - 4xx/5xx)**:

```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "The provided GitHub token does not have access to this repository",
    "details": {
      "requiredPermissions": ["repo"],
      "actualPermissions": []
    }
  }
}
```

**Status Codes**:

- `200`: Success
- `400`: Invalid request (validation error)
- `401`: Invalid or expired GitHub token
- `403`: Insufficient permissions
- `404`: Repository not found
- `429`: Rate limit exceeded
- `500`: Internal server error
- `504`: Analysis timeout

---

### POST /api/merge-identities

**Purpose**: Alternative endpoint for identity merging

**Request**:

```http
POST /api/merge-identities
Content-Type: application/json

{
  "repositoryUrl": "https://github.com/owner/repo",
  "primaryContributorId": "contributor-1",
  "mergedContributorIds": ["contributor-2", "contributor-3"]
}
```

**Response (Success - 200 OK)**:

```json
{
  "merge": {
    "id": "merge-uuid",
    "primaryContributorId": "contributor-1",
    "mergedContributorIds": ["contributor-2", "contributor-3"],
    "createdAt": "2025-11-27T10:35:00Z"
  },
  "mergedContributor": {
    "id": "contributor-1",
    "primaryEmail": "dev@example.com",
    "mergedEmails": ["dev@org1.com", "dev@org2.com"],
    "displayName": "Developer Name",
    "implementationActivity": {
      "commitCount": 150,
      "linesAdded": 5000,
      "linesDeleted": 2000,
      "linesModified": 3000,
      "filesChanged": 120
    },
    "reviewActivity": {
      "pullRequestCount": 30,
      "reviewCommentCount": 85,
      "pullRequestsReviewed": 45
    }
  }
}
```

**Response (Error - 4xx)**:

```json
{
  "error": {
    "code": "CONTRIBUTOR_NOT_FOUND",
    "message": "One or more contributor IDs not found",
    "details": {
      "notFound": ["contributor-3"]
    }
  }
}
```

---

## Data Transfer Objects (DTOs)

### ContributorDto

```typescript
interface ContributorDto {
  id: string;
  primaryEmail: string;
  mergedEmails: string[];
  displayName: string;
  implementationActivity: ImplementationActivityDto;
  reviewActivity: ReviewActivityDto;
  activityTimeline?: ActivitySnapshotDto[]; // Optional for summary views
}
```

### ImplementationActivityDto

```typescript
interface ImplementationActivityDto {
  commitCount: number;
  linesAdded: number;
  linesDeleted: number;
  linesModified: number;
  filesChanged: number;
  // Derived fields (calculated server-side)
  totalLineChanges: number;
  netLineChanges: number;
  activityScore: number;
}
```

### ReviewActivityDto

```typescript
interface ReviewActivityDto {
  pullRequestCount: number;
  reviewCommentCount: number;
  pullRequestsReviewed: number;
  // Derived fields
  reviewScore: number;
  averageCommentsPerReview: number;
}
```

### ActivitySnapshotDto

```typescript
interface ActivitySnapshotDto {
  date: string; // ISO 8601
  period: Period;
  implementationActivity: ImplementationActivityDto;
  reviewActivity: ReviewActivityDto;
}

export const Period = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
} as const;
export type Period = (typeof Period)[keyof typeof Period];
```

---

## Progress Updates (Server-Sent Events)

### GET /api/analyze/progress/:analysisId

**Purpose**: Stream analysis progress updates

**Progress Stages**:

```typescript
export const ProgressStage = {
  VALIDATING: "validating",
  CLONING: "cloning",
  PARSING: "parsing",
  FETCHING: "fetching",
  CALCULATING: "calculating",
  FINALIZING: "finalizing",
  COMPLETE: "complete",
  FAILED: "failed",
} as const;
export type ProgressStage = (typeof ProgressStage)[keyof typeof ProgressStage];
```

**Response** (Server-Sent Events):

```
event: progress
data: {"stage": "cloning", "progress": 0, "message": "Cloning repository..."}

event: progress
data: {"stage": "parsing", "progress": 25, "message": "Parsing git log..."}

event: progress
data: {"stage": "fetching", "progress": 50, "message": "Fetching GitHub data..."}

event: progress
data: {"stage": "calculating", "progress": 75, "message": "Calculating metrics..."}

event: complete
data: {"stage": "complete", "progress": 100, "analysisId": "uuid"}

event: error
data: {"stage": "failed", "error": {"code": "CLONE_FAILED", "message": "..."}}
```

**Progress Stage Percentages**:

- `validating`: 0%
- `cloning`: 10%
- `parsing`: 25-50%
- `fetching`: 50-75%
- `calculating`: 75-90%
- `finalizing`: 90-100%
- `complete`: 100%
- `failed`: Error occurred

---

## Error Response Format

**Standard Error Response**:

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
  };
}
```

**Error Code Categories**:

**Validation Errors (400)**:

```typescript
export const ValidationErrorCode = {
  INVALID_URL: "INVALID_URL",
  INVALID_TOKEN: "INVALID_TOKEN",
  INVALID_DATE_RANGE: "INVALID_DATE_RANGE",
  MISSING_FIELD: "MISSING_FIELD",
} as const;
export type ValidationErrorCode =
  (typeof ValidationErrorCode)[keyof typeof ValidationErrorCode];
```

**Authentication Errors (401)**:

```typescript
export const AuthenticationErrorCode = {
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_REVOKED: "TOKEN_REVOKED",
} as const;
export type AuthenticationErrorCode =
  (typeof AuthenticationErrorCode)[keyof typeof AuthenticationErrorCode];
```

**Authorization Errors (403)**:

```typescript
export const AuthorizationErrorCode = {
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  REPO_PRIVATE: "REPO_PRIVATE",
} as const;
export type AuthorizationErrorCode =
  (typeof AuthorizationErrorCode)[keyof typeof AuthorizationErrorCode];
```

**Not Found Errors (404)**:

```typescript
export const NotFoundErrorCode = {
  REPO_NOT_FOUND: "REPO_NOT_FOUND",
  CONTRIBUTOR_NOT_FOUND: "CONTRIBUTOR_NOT_FOUND",
} as const;
export type NotFoundErrorCode =
  (typeof NotFoundErrorCode)[keyof typeof NotFoundErrorCode];
```

**Rate Limiting Errors (429)**:

```typescript
export const RateLimitErrorCode = {
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  ANALYSIS_QUOTA_EXCEEDED: "ANALYSIS_QUOTA_EXCEEDED",
} as const;
export type RateLimitErrorCode =
  (typeof RateLimitErrorCode)[keyof typeof RateLimitErrorCode];
```

**Server Errors (500)**:

```typescript
export const ServerErrorCode = {
  CLONE_FAILED: "CLONE_FAILED",
  ANALYSIS_TIMEOUT: "ANALYSIS_TIMEOUT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
export type ServerErrorCode =
  (typeof ServerErrorCode)[keyof typeof ServerErrorCode];
```

---

## Validation Schemas (Zod)

### AnalysisRequestSchema

```typescript
import { z } from "zod";

export const AnalysisRequestSchema = z.object({
  repositoryUrl: z
    .string()
    .url()
    .regex(
      /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/,
      "Must be a valid GitHub repository URL",
    ),
  githubToken: z
    .string()
    .min(20, "Token is too short")
    .max(100, "Token is too long")
    .regex(/^[a-zA-Z0-9_]+$/, "Token contains invalid characters"),
  dateRange: z
    .object({
      start: z.coerce.date(),
      end: z.coerce.date(),
    })
    .optional()
    .refine(
      (range) => !range || range.start < range.end,
      "Start date must be before end date",
    )
    .refine(
      (range) => !range || range.end <= new Date(),
      "End date cannot be in the future",
    ),
});

export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;
```

### MergeRequestSchema

```typescript
export const MergeRequestSchema = z.object({
  repositoryUrl: z
    .string()
    .url()
    .regex(/^https:\/\/github\.com\/[\w-]+\/[\w-]+$/),
  primaryContributorId: z.string().uuid(),
  mergedContributorIds: z
    .array(z.string().uuid())
    .min(1, "Must merge at least one contributor")
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Duplicate contributor IDs not allowed",
    ),
});

export type MergeRequest = z.infer<typeof MergeRequestSchema>;
```

---

## Rate Limiting

**Client-Side Rate Limiting** (prevent abuse):

- Max 10 analyses per hour per client IP
- Max 50 identity merges per hour per client IP

**Implementation**:

- In-memory rate limiter for MVP
- Redis-based for production (future)

**Rate Limit Headers**:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1732790400
```

---

## CORS Configuration

**Allowed Origins**:

- Same origin only (Next.js app)
- No cross-origin requests for MVP

**Future**: If exposing API to external clients, configure CORS properly.

---

## Summary

**Server Actions** (Primary):

- `analyzeRepository`: Main analysis endpoint
- `mergeIdentities`: Identity merging endpoint

**API Routes** (Fallback):

- `POST /api/analyze`: HTTP alternative for analysis
- `POST /api/merge-identities`: HTTP alternative for merging
- `GET /api/analyze/progress/:id`: SSE progress updates

**Type Definitions Pattern**:

- All enum-like types use `as const` pattern
- Example: `AnalysisErrorCode`, `Period`, `ProgressStage`
- Consistent with project's TypeScript conventions

**Security**:

- All GitHub tokens handled server-side
- Zod validation at all boundaries
- Rate limiting to prevent abuse
- HTTPS required

**Performance**:

- 2-minute target for typical analysis
- 60-second hard timeout (Vercel)
- Progress updates every 5 seconds
- Identity merges complete in < 1 second

**Constitutional Compliance**:

- ✅ Tokens never exposed to client
- ✅ Input validation with Zod
- ✅ User-friendly error messages
- ✅ Result type pattern for error handling
