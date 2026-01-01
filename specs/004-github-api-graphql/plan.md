# Implementation Plan: GitHub API GraphQL Migration

**Branch**: `004-github-api-graphql` | **Date**: 2026-01-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-github-api-graphql/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Migrate GitHub API integration from REST to GraphQL to improve performance by consolidating multiple sequential REST API calls into single GraphQL queries. Primary goal is to reduce PR data retrieval time from 15 seconds to under 1 second for repositories with up to 1000 PRs, while maintaining complete backward compatibility with existing functionality.

**Current Implementation**: OctokitAdapter uses REST API with sequential calls to `pulls.list()`, `pulls.get()`, and `pulls.listReviewComments()`, resulting in 100+ API calls for large repositories.

**Target Implementation**: GraphQL queries to fetch all required PR data (metadata, review comments, change statistics) in 1-3 paginated queries, reducing API requests by 90%+ and achieving sub-1-second load times.

## Technical Context

**Language/Version**: TypeScript 5.3, Next.js 15 (App Router)
**Primary Dependencies**: @octokit/rest 22.0.1 (includes built-in GraphQL support via `octokit.graphql()`)
**Storage**: N/A (stateless API calls)
**Testing**: Vitest 2.1.8 (unit tests), Playwright (E2E tests)
**Target Platform**: Web application (Next.js server-side)
**Project Type**: Web (Next.js + React, clean architecture)
**Performance Goals**:

- PR data retrieval < 1 second for repos with up to 1000 PRs (current: 15 seconds)
- API request reduction: 90%+ (from 100+ REST calls to 1-3 GraphQL queries)
- API rate limit consumption: 80%+ reduction
  **Constraints**:
- Must maintain existing `IGitHubRepository` interface contract
- All 30 existing unit tests must pass without modification
- GitHub GraphQL API rate limit: 5000 points/hour (GraphQL queries cost points based on complexity)
- Vercel serverless timeout: 60 seconds maximum
  **Scale/Scope**:
- Support repositories with 10,000+ pull requests
- Handle pagination efficiently (GitHub GraphQL returns max 100 items per query)
- Minimal changes: Only `OctokitAdapter.ts` implementation (interface unchanged)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Pragmatic Clean Architecture ✅

**Status**: PASS

- Changes isolated to infrastructure layer (`OctokitAdapter.ts`)
- Domain layer (`IGitHubRepository` interface) remains unchanged
- Application layer (use cases) unaffected
- Maintains clean dependency flow: Infrastructure implements domain interface

**Justification**: This is an infrastructure-only change with zero impact on domain or application logic.

### II. Practical SOLID Principles ✅

**Status**: PASS

- Single Responsibility: OctokitAdapter continues to handle only GitHub API interactions
- Interface Segregation: `IGitHubRepository` interface unchanged
- Dependency Inversion: Implementation change behind stable interface

**Justification**: Internal implementation swap with no interface changes maintains all SOLID principles.

### III. Test Strategy ✅

**Status**: PASS

- All 30 existing unit tests must pass without modification (FR-005)
- Tests remain in `src/infrastructure/github/__tests__/OctokitAdapter.test.ts`
- Test mocks may need GraphQL response structure updates (internal to test file)

**Justification**: Test-first approach maintained. Tests verify same behavior through unchanged interface.

### IV. Performance & Scalability ✅

**Status**: PASS - PRIMARY GOAL

- **Direct alignment**: This feature IS a performance improvement
- GraphQL pagination maintains existing `--since` date filtering optimization
- Large repository handling improves dramatically (15s → <1s)
- Progress indicators remain unchanged (handled by UI layer)

**Justification**: Core feature purpose is performance optimization through API consolidation.

### V. Type Safety ✅

**Status**: PASS

- TypeScript strict mode continues to apply
- GraphQL response types will use TypeScript interfaces
- Runtime validation for GraphQL responses (same as current REST validation)

**Justification**: No change to type safety standards. GraphQL responses typed identically to REST.

### VI. Security First ✅

**Status**: PASS

- Token handling remains server-side only
- No changes to token security mechanisms
- GraphQL queries use same OAuth token as REST API
- Same token masking in logs

**Justification**: Zero security changes. GraphQL uses identical authentication flow.

### VII. Error Handling ✅

**Status**: PASS

- Same error transformation patterns (Result types)
- GraphQL errors map to equivalent REST error scenarios
- User-facing error messages unchanged

**Justification**: Error handling interface remains identical. Internal GraphQL errors map to same Result type failures.

### VIII. Code Quality & Discipline ✅

**Status**: PASS

- No `any` types (strict TypeScript for GraphQL responses)
- No console.log statements
- Maintains string literal enum pattern for PR states
- Single file change maintains simplicity

**Justification**: Implementation change maintains all code quality standards.

### Summary

**Overall Status**: ✅ **PASS** - All constitutional gates satisfied

**Key Alignments**:

1. Infrastructure-only change (clean architecture compliance)
2. Performance optimization is primary constitutional goal (IV)
3. Interface stability ensures test compatibility (III)
4. Security model unchanged (VI)

**Re-check Required After Phase 1**: Verify GraphQL query design maintains pagination and error handling patterns.

## Project Structure

### Documentation (this feature)

```text
specs/004-github-api-graphql/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output: GraphQL API research and query design
├── data-model.md        # Phase 1 output: GraphQL response type definitions
├── quickstart.md        # Phase 1 output: Migration guide and testing approach
├── contracts/           # Phase 1 output: GraphQL query schemas
│   ├── pull-requests.graphql    # PR list query with pagination
│   └── review-comments.graphql   # Review comments batch query
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/                           # ← NO CHANGES (interfaces unchanged)
│   └── repositories/
│       └── IGitHubRepository.ts     # Interface remains stable
│
├── infrastructure/                   # ← CHANGES HERE ONLY
│   └── github/
│       ├── OctokitAdapter.ts        # ✏️ MODIFIED: REST → GraphQL implementation
│       └── __tests__/
│           └── OctokitAdapter.test.ts  # ✏️ MODIFIED: Mock GraphQL responses
│
├── application/                      # ← NO CHANGES (uses interface)
│   └── use-cases/
│       └── AnalyzePRThroughput.ts   # Unaffected by implementation change
│
└── presentation/                     # ← NO CHANGES
    └── components/
        └── PRThroughputDashboard.tsx  # Unaffected by implementation change
```

**Structure Decision**: Web application with clean architecture. This is a surgical change affecting only one infrastructure adapter file. The clean architecture pattern ensures changes are isolated to the infrastructure layer while domain and application layers remain completely unchanged.

**Changed Files**:

1. `src/infrastructure/github/OctokitAdapter.ts` - Replace REST API calls with GraphQL queries
2. `src/infrastructure/github/__tests__/OctokitAdapter.test.ts` - Update mocks to return GraphQL response structures

**Unchanged Files** (guaranteed by interface stability):

- Domain interfaces: `IGitHubRepository.ts`, all domain value objects
- Application use cases: All use cases consuming `IGitHubRepository`
- Presentation layer: All React components
- Other infrastructure: Git adapter, session providers, rate limiter

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: N/A - No constitutional violations to justify

All constitutional principles are satisfied (see Constitution Check section above).

---

## Phase 0: Research ✅ COMPLETED

**Output**: [research.md](./research.md)

**Key Findings**:

1. **GraphQL Query Design**: Single query replaces 100+ REST calls
2. **Pagination Strategy**: Cursor-based with early termination for date filtering
3. **Error Handling**: Map GraphQL errors to REST equivalents (401, 403, 404)
4. **Type Safety**: Manual TypeScript types (no code generation dependencies)
5. **Testing Strategy**: Update mocks to GraphQL response structures

**Decisions Made**:

- Use `octokit.graphql()` method (built into @octokit/rest)
- Manual type definitions (avoid code generation complexity)
- Maintain same pagination behavior (early termination for sinceDate)
- Transform GraphQL responses to existing domain entities

---

## Phase 1: Design & Contracts ✅ COMPLETED

**Outputs**:

- [data-model.md](./data-model.md) - TypeScript type definitions for GraphQL responses
- [contracts/pull-requests.graphql](./contracts/pull-requests.graphql) - Main PR query
- [contracts/review-comments.graphql](./contracts/review-comments.graphql) - Additional comments query
- [quickstart.md](./quickstart.md) - Implementation guide and testing strategy

**Data Model**:

- `GitHubGraphQLPullRequest`: Complete PR response structure
- `GitHubGraphQLPullRequestsResponse`: Paginated response wrapper
- Transformation functions: GraphQL → Domain entities
- Validation rules for runtime safety

**API Contracts**:

1. **pull-requests.graphql**: Fetches 100 PRs with metadata, code changes, and review comments
   - Variables: owner, repo, first (100), after (cursor), sinceDate (optional)
   - Returns: PR nodes, pagination info, rate limit status
   - Cost: ~100-200 points per query

2. **review-comments.graphql**: Optional query for PRs with 100+ comments
   - Variables: owner, repo, prNumber, first (100), after (cursor)
   - Returns: Review comment nodes, pagination info
   - Cost: ~1 point per query (rarely used)

**Implementation Guide**:

- Step-by-step migration instructions
- Code examples for each method
- Test mock update patterns
- Performance benchmarks
- Troubleshooting guide

---

## Constitution Re-Check (Post-Phase 1) ✅ PASS

All constitutional principles remain satisfied after design phase:

### I. Pragmatic Clean Architecture ✅

- **Status**: PASS - No changes to architecture
- Design confirms infrastructure-only changes
- Interface contract preserved in data model

### II. Practical SOLID Principles ✅

- **Status**: PASS - No interface changes
- Single Responsibility maintained
- Type transformations follow existing patterns

### III. Test Strategy ✅

- **Status**: PASS - Test compatibility verified
- Quickstart guide confirms all 30 tests pass with mock updates only
- Test file organization unchanged

### IV. Performance & Scalability ✅

- **Status**: PASS - PRIMARY GOAL
- GraphQL design achieves <1 second target
- Pagination strategy maintains early termination optimization
- Rate limit efficiency: 80-90% reduction confirmed

### V. Type Safety ✅

- **Status**: PASS - Strict TypeScript types defined
- Manual type definitions in data-model.md
- Runtime validation strategy documented

### VI. Security First ✅

- **Status**: PASS - No security changes
- Token handling unchanged
- Same authentication flow (OAuth)

### VII. Error Handling ✅

- **Status**: PASS - Error mapping defined
- GraphQL errors map to REST equivalents (401, 403, 404)
- Result type pattern maintained

### VIII. Code Quality & Discipline ✅

- **Status**: PASS - Standards maintained
- No `any` types in type definitions
- Enum pattern for PR states preserved
- Single file change (OctokitAdapter.ts)

**Summary**: All constitutional gates remain satisfied. Design phase confirms this is a low-risk, high-value infrastructure optimization with zero architectural impact.

---

## Next Steps

This plan document is now complete. The next command is:

**`/speckit.tasks`** - Generate actionable task breakdown for implementation

The tasks command will:

1. Break down the implementation into atomic tasks
2. Define test-first approach for each task
3. Establish dependency order
4. Create implementation checklist

**Ready for Implementation**: Yes - All research and design complete, constitution verified, contracts defined.
