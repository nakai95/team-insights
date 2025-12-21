# Research: Developer Activity Dashboard

**Feature**: 001-dev-activity-dashboard
**Date**: 2025-11-27
**Purpose**: Phase 0 research to resolve technical decisions and establish best practices

## Overview

This document consolidates research findings for implementing the Developer Activity Dashboard. All technical unknowns from the initial planning phase have been investigated, and architectural decisions have been documented with rationales.

## Key Technical Decisions

### 1. Next.js Server Actions vs API Routes

**Decision**: Use Server Actions as the primary approach, with API Routes as fallback for complex scenarios

**Rationale**:

- Server Actions provide better integration with React Server Components
- Simpler error handling and data flow in Next.js 14 App Router
- Reduced boilerplate compared to API Routes
- Better TypeScript type inference between client and server
- Native streaming support for progress indicators

**Alternatives Considered**:

- Pure API Routes: More familiar pattern but requires more boilerplate
- Mixed approach: Adds unnecessary complexity for MVP

**Implementation Notes**:

- Use Server Actions for: repository analysis, identity merging
- Use API Routes for: webhook endpoints (if needed later), external integrations
- Both approaches support the 60-second Vercel timeout constraint

### 2. Git Repository Handling Strategy

**Decision**: Clone to temporary directory with `--since` filtering, clean up with try-finally

**Rationale**:

- Full clone required (not shallow) because we need commit history for analysis
- Temporary directory isolation prevents conflicts between concurrent analyses
- `--since` flag with 6-month default keeps clone size manageable
- Try-finally ensures cleanup even on errors

**Alternatives Considered**:

- Shallow clone (`--depth`): Insufficient for historical analysis
- In-memory processing: Not feasible for large repositories
- Persistent clones: Disk space issues, stale data problems

**Implementation Pattern**:

```typescript
const tempDir = await createTempDirectory();
try {
  const git = simpleGit();
  await git.clone(repoUrl, tempDir, ["--since", since.toISOString()]);
  // Process git log
  const logs = await git.log(["--since", since.toISOString()]);
  // Parse and analyze
} finally {
  await cleanupTempDirectory(tempDir);
}
```

### 3. GitHub API Rate Limiting Strategy

**Decision**: Implement rate limiter with token bucket algorithm + graceful degradation

**Rationale**:

- GitHub allows 5000 requests/hour for authenticated users
- Token bucket prevents burst exhaustion
- Graceful degradation: fetch only PR data if near limit, skip review comments
- User feedback on rate limit status improves transparency

**Alternatives Considered**:

- No rate limiting: Risk of failed requests mid-analysis
- Redis-based distributed limiter: Overkill for MVP, revisit for multi-instance deployment
- Exponential backoff only: Reactive rather than proactive

**Implementation Strategy**:

1. Track remaining rate limit via `X-RateLimit-Remaining` header
2. If < 500 remaining, warn user before starting analysis
3. If < 100 remaining during analysis, skip non-essential data (review comments)
4. Cache rate limit status for 5 minutes to reduce meta-API calls

### 4. Progress Indicator Implementation

**Decision**: Server-Sent Events (SSE) via ReadableStream in Server Actions

**Rationale**:

- SSE provides real-time progress updates without polling
- ReadableStream support in Next.js 14 Server Actions
- 5-second update requirement easily met
- No additional infrastructure needed (no WebSocket server)

**Alternatives Considered**:

- Polling: Higher latency, more requests, worse UX
- WebSockets: Overkill for one-way progress updates, requires additional server
- Long polling: Legacy approach, worse than SSE

**Implementation Pattern**:

```typescript
async function* analyzeWithProgress(repo: string, token: string) {
  yield { stage: "cloning", progress: 0 };
  // Clone repository
  yield { stage: "parsing", progress: 25 };
  // Parse git log
  yield { stage: "fetching", progress: 50 };
  // Fetch GitHub API data
  yield { stage: "calculating", progress: 75 };
  // Calculate metrics
  yield { stage: "complete", progress: 100, data: results };
}
```

### 5. Identity Merge Persistence Strategy

**Decision**: Browser localStorage with repository-specific keys

**Rationale**:

- No backend database required for MVP
- User-specific merge preferences (no cross-user data)
- Fast access, no network latency
- Scoped to repository URL (different repos have independent merge settings)

**Alternatives Considered**:

- Server-side database: Adds complexity, requires user accounts
- Cookies: Size limitations, sent with every request (wasteful)
- IndexedDB: Overkill for simple key-value storage

**Storage Schema**:

```typescript
interface IdentityMergePreferences {
  repoUrl: string;
  merges: Array<{
    primaryEmail: string;
    mergedEmails: string[];
    displayName: string;
  }>;
  lastUpdated: string;
}

// Key format: `team-insights:merge:${hashRepoUrl(repoUrl)}`
```

### 6. Error Handling Pattern

**Decision**: Result type pattern in domain/application layers, exceptions for infrastructure

**Rationale**:

- Result types make error cases explicit in business logic
- Exceptions appropriate for infrastructure failures (network, filesystem)
- Consistent with functional programming best practices
- Better TypeScript type inference for error cases

**Alternatives Considered**:

- Pure exceptions: Hidden error paths, harder to track
- Pure Result types everywhere: Verbose for infrastructure code

**Pattern**:

```typescript
// Domain/Application: Result type
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

function parseRepositoryUrl(url: string): Result<RepositoryUrl> {
  // Validation logic
}

// Infrastructure: Exceptions
async function cloneRepository(url: string): Promise<string> {
  try {
    return await git.clone(url, tempDir);
  } catch (error) {
    throw new GitCloneError("Failed to clone repository", { cause: error });
  }
}
```

### 7. Visualization Library Choice

**Decision**: Recharts for charts, custom components for rankings

**Rationale**:

- Recharts: React-native, composable, supports time-series data
- Good balance between flexibility and ease of use
- TypeScript support
- Responsive by default
- No canvas-based rendering (better for accessibility)

**Alternatives Considered**:

- Chart.js: More imperative API, less React-friendly
- D3.js: Too low-level, steeper learning curve
- Victory: Similar to Recharts but less popular, fewer examples

**Chart Types Planned**:

- Implementation activity: Stacked area chart (commits + line changes over time)
- Review activity: Line chart (PR count + review comments over time)
- Rankings: Custom table with sortable columns and visual indicators

### 8. Zod Validation Strategy

**Decision**: Centralized schemas in `lib/validation/schemas.ts`, validate at boundaries

**Rationale**:

- Single source of truth for validation rules
- Reuse schemas across Server Actions, API Routes, and client forms
- Type inference from schemas ensures consistency
- Boundary validation catches issues early

**Schema Locations**:

- User input: Repository URL, GitHub token, date range
- GitHub API responses: Pull request data, review data (partial validation)
- Domain entities: Email format, metric value ranges

**Example Schema**:

```typescript
// lib/validation/schemas.ts
export const AnalysisRequestSchema = z.object({
  repositoryUrl: z
    .string()
    .url()
    .regex(/^https:\/\/github\.com\/[\w-]+\/[\w-]+$/),
  githubToken: z.string().min(20).max(100), // GitHub tokens are typically 40-80 chars
  dateRange: z
    .object({
      start: z.coerce.date(),
      end: z.coerce.date(),
    })
    .optional(),
});

export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;
```

## Architecture Patterns

### Clean Architecture Adaptation for Next.js

**Pattern**: Hexagonal architecture with pragmatic Next.js integration

**Layers**:

1. **Domain**: Pure business logic, zero framework dependencies
2. **Application**: Use case orchestration, depends only on domain
3. **Infrastructure**: Adapters for external services (Git, GitHub API, filesystem)
4. **Presentation**: React components (client-side)
5. **App**: Next.js routes, Server Components, Server Actions

**Key Principles**:

- Domain entities are framework-agnostic
- Interfaces defined in domain, implemented in infrastructure
- Server Actions call use cases directly (pragmatic shortcut for MVP)
- No repository pattern needed (direct use case calls from Server Actions)

### Testing Strategy Refinement

**Unit Testing (Vitest)**:

- Domain layer: Test entities, value objects, business rules (80%+ coverage)
- Application layer: Test use cases with mocked dependencies
- Infrastructure layer: Test only complex parsing (GitLogParser)

**E2E Testing (Playwright)**:

- Happy path: Input form → Server Action → Dashboard display
- Error path: Invalid token → Error toast display
- Use MSW (Mock Service Worker) for GitHub API mocking

**Test Organization**:

```
tests/
├── unit/
│   ├── domain/
│   │   ├── entities/Contributor.test.ts
│   │   └── value-objects/RepositoryUrl.test.ts
│   └── application/
│       └── use-cases/AnalyzeRepository.test.ts
└── e2e/
    ├── happy-path.spec.ts
    └── error-handling.spec.ts
```

## Best Practices by Domain

### Git Operations

**Best Practices**:

- Always use absolute paths for temp directories
- Set `--since` to limit history scope
- Parse `git log` with `--numstat` for line change metrics
- Handle binary files gracefully (ignore in line counts)
- Set timeout for clone operations (120 seconds)

**Error Scenarios**:

- Invalid repository URL → Validate before clone attempt
- Authentication failure → Clear error message about token permissions
- Network timeout → Retry once, then fail with guidance

### GitHub API Usage

**Best Practices**:

- Authenticate every request (avoid anonymous rate limits)
- Use pagination for all list endpoints (100 items per page)
- Fetch pull requests via `/repos/:owner/:repo/pulls` endpoint
- Fetch review comments via `/repos/:owner/:repo/pulls/:number/comments`
- Cache rate limit status to avoid excessive header checks

**Endpoint Optimization**:

- Fetch PRs and reviews in parallel after git log completion
- Use `since` parameter on PR endpoint to match git log range
- Skip closed PRs if only analyzing recent activity

### Security Hardening

**Token Protection**:

- Never log tokens (use masking: `ghp_****...****xyz`)
- Never send tokens to client (Server Actions only)
- Validate token format before use
- Clear token from memory after analysis (set to null)

**Input Sanitization**:

- Validate repository URL against GitHub domain
- Reject URLs with unusual characters (SQL injection attempts)
- Limit date range to prevent abuse (max 10 years)

**Filesystem Safety**:

- Use OS temp directory with unique prefixes
- Limit temp directory size (max 1GB per analysis)
- Always clean up on success AND failure

## Performance Optimization

### Git Log Parsing

**Optimization Strategy**:

- Stream processing for large logs (avoid loading entire history into memory)
- Parse commits in batches of 1000
- Use `--format` to get structured output (JSON-like)
- Skip merge commits if only analyzing direct contributions

**Expected Performance**:

- 1000 commits: ~5 seconds
- 10,000 commits: ~30 seconds
- 100,000 commits: ~3 minutes (near Vercel timeout)

### GitHub API Batching

**Optimization Strategy**:

- Fetch up to 100 PRs per request (max pagination)
- Parallel requests for independent data (PRs, reviews)
- Abort analysis if >500 PRs detected (warn user about scope)

**Rate Limit Budget**:

- Repository metadata: 1 request
- Pull requests: N/100 requests (N = number of PRs)
- Review comments: M requests (M = number of PRs with reviews)
- Estimated: ~50 requests for typical 100-PR repository

## Dependencies and Versions

### Production Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@octokit/rest": "^20.0.2",
    "simple-git": "^3.20.0",
    "zod": "^3.22.4",
    "recharts": "^2.10.3",
    "tailwindcss": "^3.3.5",
    "@radix-ui/react-*": "latest" // Shadcn/UI peer dependencies
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "@playwright/test": "^1.40.0",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0",
    "husky": "^8.0.3",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0"
  }
}
```

## Open Questions and Future Research

### Post-MVP Considerations

1. **Background Job Processing**: If Vercel timeouts become problematic
   - Consider: Vercel Edge Functions, dedicated job queue (BullMQ + Redis)
   - Trigger: >20% of analyses failing due to timeout

2. **Caching Strategy**: If repeated analyses on same repository are common
   - Consider: Redis cache for git log data, 24-hour TTL
   - Trigger: >30% of analyses are re-analyses of same repo within 24 hours

3. **Multi-Repository Comparison**: If users want to compare activity across repos
   - Consider: Session-based storage, export to CSV
   - Trigger: User feedback requesting comparison feature

4. **Real-Time Collaboration**: If multiple users analyze same repository
   - Consider: WebSocket for live updates, shared analysis sessions
   - Trigger: Team accounts with >5 simultaneous users

## Summary

All technical unknowns have been resolved. The architecture balances constitutional principles (clean architecture, security, performance) with pragmatic MVP delivery. Key decisions favor simplicity and Next.js 14 best practices while maintaining testability and maintainability.

**Risk Assessment**: LOW

- All technologies have proven track records
- No experimental features required
- Clear fallback strategies for known failure modes
- Constitutional compliance verified

**Ready for Phase 1**: ✅ Proceed to data model and contract definition.
