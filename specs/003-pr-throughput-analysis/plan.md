# Implementation Plan: PR Throughput Analysis

**Branch**: `003-pr-throughput-analysis` | **Date**: 2025-12-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-pr-throughput-analysis/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement PR Throughput Analysis feature to visualize the relationship between PR size and merge lead time. This enables development teams to identify optimal PR sizing practices based on actual data. The feature extends the existing GitHub analysis dashboard with scatter plots, size bucket analysis, and automated insights recommending the most efficient PR size range.

## Technical Context

**Language/Version**: TypeScript 5.3 / Next.js 15 (App Router)
**Primary Dependencies**: React 18.3, Recharts 3.5.0, @octokit/rest 22.0.1, next-auth 5.0.0-beta.30
**Storage**: N/A (session data in encrypted JWT, no database)
**Testing**: Vitest 4.0.14 (unit tests), Playwright 1.57.0 (E2E tests)
**Target Platform**: Web (Next.js serverless deployment)
**Project Type**: Web application (Next.js with domain-driven structure)
**Performance Goals**: Dashboard load <3 seconds for repositories with up to 1000 merged PRs
**Constraints**: GitHub API rate limiting (5000 requests/hour authenticated), Vercel 60-second timeout on Hobby plan
**Scale/Scope**: Display and analyze 1000+ merged PRs without client-side performance degradation

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Pragmatic Clean Architecture

- ✅ **PASS**: New domain entities (PRThroughputData, SizeBucket, ThroughputInsight) will be added to `src/domain/`
- ✅ **PASS**: Calculation logic will be in application layer (`CalculateThroughputMetrics` use case)
- ✅ **PASS**: GitHub API enhancements will extend existing `OctokitAdapter` in infrastructure layer
- ✅ **PASS**: UI components will be added to presentation layer
- ✅ **PASS**: Follows existing Next.js patterns, no framework conflicts

### II. Practical SOLID Principles

- ✅ **PASS**: Single Responsibility - separate use cases for data fetching vs throughput calculation
- ✅ **PASS**: Interface Segregation - extending `PullRequest` interface minimally with only required fields
- ✅ **PASS**: Dependency Inversion - throughput calculation depends only on domain interfaces

### III. Test Strategy

- ✅ **PASS**: Domain layer tests MANDATORY for throughput calculation logic (targeting 80%+ coverage)
- ✅ **PASS**: Application layer tests RECOMMENDED for use case orchestration
- ✅ **PASS**: E2E test for happy path (scatter plot rendering) to be added

### IV. Performance & Scalability

- ✅ **PASS**: GitHub API pagination already implemented in OctokitAdapter
- ✅ **PASS**: Rate limiting already handled by RateLimiter
- ⚠️ **ATTENTION**: Need to verify performance with 1000+ PRs on client-side rendering
- ✅ **PASS**: All analysis runs server-side via existing AnalyzeRepository use case

### V. Type Safety

- ✅ **PASS**: TypeScript strict mode enabled in tsconfig.json
- ✅ **PASS**: Will use Zod for validating PR size bucket definitions
- ✅ **PASS**: All new domain types will be strictly typed

### VI. Security First

- ✅ **PASS**: No new token handling required (uses existing session infrastructure)
- ✅ **PASS**: No sensitive data in throughput analysis
- ✅ **PASS**: Existing rate limiting applies

### VII. Error Handling

- ✅ **PASS**: Will use Result types for throughput calculations
- ✅ **PASS**: User-friendly messages for edge cases (no merged PRs, insufficient data)
- ✅ **PASS**: Graceful degradation when data is missing

### VIII. Code Quality & Discipline

- ✅ **PASS**: No `any` types
- ✅ **PASS**: ESLint + Prettier configured
- ✅ **PASS**: Tests required before merging
- ✅ **PASS**: No premature abstraction - implementing only what's needed for P1-P3 user stories

### GATE STATUS: ✅ PASS - No constitutional violations. Proceed to Phase 0.

---

## POST-DESIGN CONSTITUTION RE-CHECK

_Conducted after Phase 1 design completion (research.md, data-model.md, contracts/, quickstart.md)_

### I. Pragmatic Clean Architecture

- ✅ **CONFIRMED**: Domain entities created (PRThroughput, PRThroughputData, SizeBucket, ThroughputInsight)
- ✅ **CONFIRMED**: Application use case (CalculateThroughputMetrics) depends only on domain
- ✅ **CONFIRMED**: Infrastructure changes minimal (extend OctokitAdapter.getPullRequests())
- ✅ **CONFIRMED**: Presentation components follow existing patterns
- ✅ **CONFIRMED**: No framework conflicts, follows Next.js conventions

### II. Practical SOLID Principles

- ✅ **CONFIRMED**: Single Responsibility maintained
  - PRThroughputData: Single PR data
  - SizeBucket: Bucket aggregates
  - ThroughputInsight: Insight generation
  - CalculateThroughputMetrics: Orchestration
- ✅ **CONFIRMED**: Interface Segregation maintained (PullRequest extended minimally)
- ✅ **CONFIRMED**: Dependency Inversion maintained (use case depends on domain interfaces)

### III. Test Strategy

- ✅ **CONFIRMED**: Domain layer tests planned (80%+ coverage target)
  - PRThroughputData.test.ts
  - SizeBucket.test.ts
  - ThroughputInsight.test.ts
  - PRThroughput.test.ts
- ✅ **CONFIRMED**: Application layer tests planned
  - CalculateThroughputMetrics.test.ts
- ✅ **CONFIRMED**: E2E tests planned
  - Happy path: scatter plot rendering
  - Empty state: no merged PRs

### IV. Performance & Scalability

- ✅ **CONFIRMED**: GitHub API pagination already handled
- ✅ **CONFIRMED**: Rate limiting already handled
- ✅ **CONFIRMED**: Client-side optimizations planned
  - React.memo for chart components
  - useMemo for data transformations
  - Disable animations for 500+ points
- ✅ **CONFIRMED**: Performance target: <3 seconds for 1000 PRs

### V. Type Safety

- ✅ **CONFIRMED**: All domain types strictly typed
- ✅ **CONFIRMED**: No `any` types in design
- ✅ **CONFIRMED**: TypeScript strict mode enabled

### VI. Security First

- ✅ **CONFIRMED**: No new token handling required
- ✅ **CONFIRMED**: No sensitive data in throughput analysis
- ✅ **CONFIRMED**: Existing security measures sufficient

### VII. Error Handling

- ✅ **CONFIRMED**: Result types used throughout
- ✅ **CONFIRMED**: User-friendly messages for edge cases
  - "No merged PRs available for throughput analysis"
  - "Insufficient data: More merged PRs needed"
  - "No clear difference based on PR size"

### VIII. Code Quality & Discipline

- ✅ **CONFIRMED**: No `any` types in contracts
- ✅ **CONFIRMED**: No premature abstraction
- ✅ **CONFIRMED**: Tests required before implementation
- ✅ **CONFIRMED**: YAGNI principle followed (implementing P1-P3 only)

### FINAL GATE STATUS: ✅ PASS - Design maintains constitutional compliance. Approved for implementation.

---

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
├── domain/
│   ├── entities/
│   │   ├── PRThroughput.ts                    # NEW: PR throughput aggregate entity
│   │   └── __tests__/
│   │       └── PRThroughput.test.ts           # NEW: Test throughput entity
│   ├── value-objects/
│   │   ├── PRThroughputData.ts                # NEW: Single PR throughput data
│   │   ├── SizeBucket.ts                      # NEW: Size bucket analysis
│   │   ├── ThroughputInsight.ts               # NEW: Automated insight
│   │   └── __tests__/
│   │       ├── PRThroughputData.test.ts       # NEW: Test lead time calculation
│   │       ├── SizeBucket.test.ts             # NEW: Test size categorization
│   │       └── ThroughputInsight.test.ts      # NEW: Test insight generation
│   └── interfaces/
│       └── IGitHubRepository.ts                # EXTEND: Add merged_at, additions, deletions to PullRequest
│
├── application/
│   ├── use-cases/
│   │   ├── AnalyzeRepository.ts               # EXTEND: Include throughput calculation
│   │   ├── CalculateThroughputMetrics.ts      # NEW: Calculate throughput metrics
│   │   └── __tests__/
│   │       └── CalculateThroughputMetrics.test.ts  # NEW: Test metrics calculation
│   └── dto/
│       ├── AnalysisResult.ts                  # EXTEND: Add throughput field
│       └── ThroughputResult.ts                # NEW: Throughput analysis result DTO
│
├── infrastructure/
│   └── github/
│       ├── OctokitAdapter.ts                  # EXTEND: Fetch merged_at, additions, deletions
│       └── __tests__/
│           └── OctokitAdapter.test.ts         # EXTEND: Add tests for throughput fields
│
├── presentation/
│   └── components/
│       ├── PRThroughputSection.tsx            # NEW: Main throughput section
│       ├── PRSizeVsLeadTimeChart.tsx          # NEW: Scatter plot
│       ├── SizeBucketTable.tsx                # NEW: Size bucket table
│       └── SizeBucketBarChart.tsx             # NEW: Bar chart
│
└── app/
    └── [locale]/
        └── components/
            └── Dashboard.tsx                   # EXTEND: Add PRThroughputSection
```

**Structure Decision**: Following existing domain-driven structure. New throughput-specific value objects in domain layer, calculation logic in application layer, API enhancements in infrastructure layer, and UI components in presentation layer. This maintains clear separation of concerns and follows the Pragmatic Clean Architecture principle from the constitution.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional violations detected. This section is intentionally left empty.
