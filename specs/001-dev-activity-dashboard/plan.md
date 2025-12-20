# Implementation Plan: Developer Activity Dashboard

**Branch**: `001-dev-activity-dashboard` | **Date**: 2025-11-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-dev-activity-dashboard/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

A web application that visualizes GitHub repository developer activity. Users input a repository URL, GitHub token, and optional analysis period. The system performs server-side git log analysis and GitHub API data fetching to calculate and display metrics including commit counts, code change volume, PR counts, and review comment counts. Features include implementation activity graphs, review activity graphs, contributor rankings, and identity merging for developers with multiple email addresses.

## Technical Context

**Language/Version**: TypeScript with Next.js 14 (App Router)
**Primary Dependencies**:

- UI: Tailwind CSS, Shadcn/UI components, Recharts (visualization)
- Data: @octokit/rest (GitHub API), simple-git (Git operations)
- Validation: Zod (runtime validation)
- Testing: Vitest (unit tests), Playwright (E2E tests)

**Storage**:

- Temporary: Filesystem (cloned repositories - cleaned up after analysis)
- Persistent: Browser localStorage or simple file-based storage for identity merge preferences
- No database required for MVP

**Testing**:

- Unit: Vitest (mandatory for domain layer, 80%+ coverage)
- E2E: Playwright (critical paths only)
- Mocking: Mock GitHub API server for E2E tests

**Target Platform**: Web application (server-side rendering + client-side interactivity)
**Project Type**: Web application (Next.js 14 App Router with server-side processing)

**Performance Goals**:

- Analysis completion within 2 minutes for repositories with <1000 commits
- Progress updates every 5 seconds during analysis
- Dashboard renders top 5 contributors within 10 seconds
- Identity merge operations complete within 5 seconds

**Constraints**:

- HTTPS required for all communications
- GitHub tokens processed server-side only (never exposed to client)
- Vercel deployment: 60-second serverless function timeout limit
- GitHub API rate limiting: 5000 requests/hour for authenticated users
- Temporary directory cleanup mandatory after each analysis
- No background job processing for MVP (user must keep browser open)

**Scale/Scope**:

- Target: Repositories with up to 100 contributors and 5 years of history
- Initial focus: Small to medium teams (10-50 developers)
- Analysis period: Default 6 months, extendable to custom ranges

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Pragmatic Clean Architecture

- ✅ **PASS**: Planning follows clean architecture with domain/application/infrastructure/presentation layers
- ✅ **PASS**: Directory structure aligns with constitution: `src/domain/`, `src/application/`, `src/infrastructure/`, `src/presentation/`, `src/app/`
- ✅ **PASS**: Next.js conventions followed (App Router, Server Components)
- ✅ **PASS**: No forced abstractions against framework patterns

### II. Practical SOLID Principles

- ✅ **PASS**: Single Responsibility enforced (GitLogParser, GitHubAPIClient as separate components)
- ✅ **PASS**: Dependency Inversion at critical boundaries (Git operations, GitHub API interfaces)
- ✅ **PASS**: Interface Segregation planned for focused interfaces

### III. Test Strategy

- ✅ **PASS**: Domain layer testing mandatory with 80%+ coverage target
- ✅ **PASS**: Application layer testing recommended with mocks
- ✅ **PASS**: E2E tests limited to critical paths (happy path + error path)
- ✅ **PASS**: Vitest for unit tests, Playwright for E2E
- ✅ **PASS**: Mock GitHub API server planned for E2E tests

### IV. Performance & Scalability

- ✅ **PASS**: Git log operations use `--since` for time-based filtering (6-month default)
- ✅ **PASS**: No shallow clone (`--depth 1` avoided, history required)
- ✅ **PASS**: GitHub API pagination implemented
- ✅ **PASS**: Progress indicators planned (5-second updates)
- ✅ **PASS**: Server Actions/API Routes for async processing
- ✅ **PASS**: Timeout considerations documented (60-second Vercel limit)
- ✅ **PASS**: Caching deferred to post-MVP

### V. Type Safety

- ✅ **PASS**: TypeScript strict mode configured
- ✅ **PASS**: Zod validation for user inputs (repository URL, GitHub token)
- ✅ **PASS**: Runtime validation planned for GitHub API responses

### VI. Security First

- ✅ **PASS**: GitHub tokens processed server-side only
- ✅ **PASS**: Tokens never exposed to client-side JavaScript
- ✅ **PASS**: Temporary directory cleanup mandatory (try-finally pattern)
- ✅ **PASS**: Rate limiting considered (GitHub API 5000 req/hour)
- ✅ **PASS**: HTTPS required
- ✅ **PASS**: Token masking in logs planned

### VII. Error Handling

- ✅ **PASS**: Result types or exceptions in domain layer (consistency to be established)
- ✅ **PASS**: User-friendly error messages in application layer
- ✅ **PASS**: Toast notifications or error boundaries for presentation layer
- ✅ **PASS**: 27 functional requirements include error handling scenarios

### VIII. Code Quality & Discipline

- ✅ **PASS**: No `any` types (TypeScript strict mode enforced)
- ✅ **PASS**: ESLint + Prettier planned
- ✅ **PASS**: Pre-commit hooks planned (husky with lint + tests)
- ✅ **PASS**: YAGNI principles followed (no premature abstraction)
- ✅ **PASS**: MVP-first approach (80-point delivery prioritized)

**Constitution Check Status**: ✅ **ALL GATES PASSED**

No violations requiring justification. Plan proceeds to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/                     # Pure TypeScript business logic (no external dependencies)
│   ├── entities/              # Core domain entities
│   │   ├── Contributor.ts     # Developer identity and metrics
│   │   ├── RepositoryAnalysis.ts
│   │   ├── ImplementationActivity.ts
│   │   ├── ReviewActivity.ts
│   │   └── IdentityMerge.ts
│   ├── value-objects/         # Immutable value objects
│   │   ├── Email.ts
│   │   ├── RepositoryUrl.ts
│   │   ├── DateRange.ts
│   │   └── Metrics.ts
│   └── interfaces/            # Port interfaces for infrastructure
│       ├── IGitOperations.ts
│       ├── IGitHubAPI.ts
│       └── IStoragePort.ts
│
├── application/               # Use cases and orchestration
│   ├── use-cases/
│   │   ├── AnalyzeRepository.ts
│   │   ├── FetchGitData.ts
│   │   ├── FetchGitHubData.ts
│   │   ├── CalculateMetrics.ts
│   │   └── MergeIdentities.ts
│   └── dto/                   # Data transfer objects
│       ├── AnalysisRequest.ts
│       └── AnalysisResult.ts
│
├── infrastructure/            # External dependencies implementation
│   ├── git/
│   │   ├── SimpleGitAdapter.ts    # simple-git wrapper
│   │   └── GitLogParser.ts        # Parse git log output
│   ├── github/
│   │   ├── OctokitAdapter.ts      # @octokit/rest wrapper
│   │   └── RateLimiter.ts         # GitHub API rate limiting
│   ├── storage/
│   │   └── LocalStorageAdapter.ts # Browser localStorage for merge preferences
│   └── filesystem/
│       └── TempDirectoryManager.ts # Cleanup temporary clones
│
├── presentation/              # UI components (Shadcn/UI + Tailwind)
│   ├── components/
│   │   ├── ui/               # Shadcn/UI base components
│   │   ├── AnalysisForm.tsx  # Input form for URL/token/period
│   │   ├── Dashboard.tsx     # Main dashboard container
│   │   ├── ImplementationActivityChart.tsx  # Recharts visualization
│   │   ├── ReviewActivityChart.tsx          # Recharts visualization
│   │   ├── ContributorRankings.tsx
│   │   ├── IdentityMerger.tsx
│   │   └── ProgressIndicator.tsx
│   └── hooks/
│       ├── useAnalysis.ts
│       └── useIdentityMerge.ts
│
├── app/                       # Next.js 14 App Router
│   ├── page.tsx              # Home page with AnalysisForm
│   ├── dashboard/
│   │   └── page.tsx          # Dashboard page
│   ├── api/                  # API Routes
│   │   ├── analyze/
│   │   │   └── route.ts     # POST /api/analyze (main analysis endpoint)
│   │   └── merge-identities/
│   │       └── route.ts     # POST /api/merge-identities
│   └── actions/              # Server Actions (alternative to API routes)
│       ├── analyzeRepository.ts
│       └── mergeIdentities.ts
│
├── lib/                       # Shared utilities
│   ├── validation/
│   │   └── schemas.ts        # Zod validation schemas
│   ├── errors/
│   │   └── ApplicationError.ts
│   └── utils/
│       ├── logger.ts
│       └── tokenMasker.ts
│
└── types/                     # Shared TypeScript types
    └── index.ts

tests/
├── unit/
│   ├── domain/               # Domain layer tests (MANDATORY, 80%+ coverage)
│   │   ├── entities/
│   │   └── value-objects/
│   ├── application/          # Use case tests (RECOMMENDED)
│   └── infrastructure/       # Infrastructure tests (OPTIONAL, complex parsing only)
├── integration/              # Integration tests (OPTIONAL for MVP)
└── e2e/                      # Playwright E2E tests (critical paths only)
    ├── happy-path.spec.ts    # URL + token → dashboard display
    └── error-handling.spec.ts # Invalid token → error message
```

**Structure Decision**: Web application structure using Next.js 14 App Router with clean architecture principles. The structure follows the constitutional requirement for pragmatic clean architecture with domain/application/infrastructure/presentation layers. Next.js-specific directories (`app/`) are kept at the root level to follow framework conventions, while business logic is cleanly separated in domain/application layers.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. All constitutional principles are satisfied by the current design.
