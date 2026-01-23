# Implementation Plan: PR Changes Timeseries Analysis

**Branch**: `005-pr-changes-timeseries` | **Date**: 2026-01-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-pr-changes-timeseries/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature adds weekly timeseries visualization of PR code changes (additions/deletions/changedFiles) to help teams understand development velocity, identify refactoring efforts, and spot unusual change patterns. The feature integrates as a third tab in the existing dashboard alongside Overview and PR Throughput Analysis, using the existing GraphQL PR data (which already includes additions/deletions/changedFiles fields) to minimize API impact.

## Technical Context

**Language/Version**: TypeScript 5.3
**Primary Dependencies**: Next.js 15 (App Router), React 18.3, Recharts 3.5.0, @octokit/graphql 9.0.3, Zod 4.1.13
**Storage**: Browser localStorage for identity merges; No database (stateless analysis)
**Testing**: Vitest 4.0.14 (unit tests), Playwright 1.57.0 (E2E tests), React Testing Library 16.3.0
**Target Platform**: Web (Next.js server-side + client-side rendering, Vercel deployment)
**Project Type**: Web application (clean architecture: domain/application/infrastructure/presentation layers)
**Performance Goals**: Page load <3 seconds, tab switching <100ms, chart rendering smooth for 52 weeks of data
**Constraints**: Vercel 60-second timeout (Hobby plan), GitHub GraphQL API rate limits, client-side chart rendering performance
**Scale/Scope**: Display up to 1 year (52 weeks) of PR history, handle repositories with 1000+ PRs, 10+ contributors

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Pragmatic Clean Architecture ✅ PASS

- Domain layer: New value objects (`WeeklyAggregate`, `ChangeTrend`, `OutlierWeek`) with no external dependencies
- Application layer: New use case `CalculateChangesTimeseries` depends only on domain
- Infrastructure layer: No new external dependencies (reuses existing GraphQL PR data)
- Presentation layer: New `ChangesTimeseriesTab` component follows React patterns
- **Compliance**: Feature follows established layering with domain logic isolated from UI and API concerns

### II. Practical SOLID Principles ✅ PASS

- Single Responsibility: Each class has one purpose (WeeklyAggregate for aggregation, ChangeTrend for trend analysis)
- Interface Segregation: No bloated interfaces; use case interfaces focused on timeseries calculations only
- Dependency Inversion: Use case depends on domain interfaces, not concrete implementations
- **Compliance**: No SOLID violations; feature follows existing patterns

### III. Test Strategy ✅ PASS

- Domain layer tests (MANDATORY): Unit tests for WeeklyAggregate, ChangeTrend, OutlierWeek value objects (target: 80%+ coverage)
- Application layer tests (RECOMMENDED): Unit tests for CalculateChangesTimeseries use case with mocked dependencies
- Presentation layer tests (OPTIONAL): Defer to E2E tests initially
- Test file location: All tests in `__tests__` directories co-located with implementation
- **Compliance**: Domain tests mandatory and planned; follows `__tests__` directory pattern

### IV. Performance & Scalability ✅ PASS

- Large repository handling: Data already filtered by existing GraphQL queries (reuses PR data)
- Async processing: Analysis runs in Next.js Server Action (existing pattern)
- Progress indicators: Existing dashboard loading states apply
- **Compliance**: No new performance concerns; leverages existing optimizations

### V. Type Safety ✅ PASS

- TypeScript strict mode enabled in tsconfig.json
- Runtime validation: Zod schemas for weekly aggregate data at boundaries
- No `any` types allowed
- **Compliance**: All new types strictly typed

### VI. Security First ✅ PASS

- Token protection: Uses existing server-side token handling (no new token requirements)
- No new temporary directories or cleanup concerns
- Rate limiting: Existing GraphQL rate limiting applies (no additional API calls)
- **Compliance**: No new security concerns; reuses existing secure patterns

### VII. Error Handling ✅ PASS

- Domain layer: Use Result types for expected failures (e.g., insufficient data for trend analysis)
- Application layer: Transform errors to user-friendly messages ("Insufficient data for trend analysis")
- Presentation layer: Display errors via existing toast notifications
- **Compliance**: Follows existing error handling patterns

### VIII. Code Quality & Discipline ✅ PASS

- No `any` types: All new code strictly typed
- No console.log: Use existing logger utility
- Enum pattern: Use constant objects for string literals (e.g., `TrendDirection.INCREASING`)
- Single source of truth: No duplicate type definitions
- **Compliance**: All quality standards met

### Build Configuration ✅ PASS

- specs/005-pr-changes-timeseries/contracts/ excluded from compilation (tsconfig.json already configured)
- No ESLint rule exceptions needed
- **Compliance**: Existing build configuration sufficient

### Summary

**Status**: ✅ ALL GATES PASSED - No constitutional violations

**Justification**: This feature strictly adheres to all constitutional principles. It extends the existing architecture without introducing new dependencies, follows established patterns for domain-driven design, maintains security and type safety standards, and requires no deviations from project conventions.

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
├── domain/                                    # Business logic (no external dependencies)
│   ├── value-objects/
│   │   ├── WeeklyAggregate.ts                 # NEW: Weekly aggregated PR changes
│   │   ├── ChangeTrend.ts                     # NEW: Trend analysis (increasing/decreasing/stable)
│   │   ├── OutlierWeek.ts                     # NEW: Statistical outlier detection
│   │   └── __tests__/
│   │       ├── WeeklyAggregate.test.ts        # NEW: Unit tests (MANDATORY)
│   │       ├── ChangeTrend.test.ts            # NEW: Unit tests (MANDATORY)
│   │       └── OutlierWeek.test.ts            # NEW: Unit tests (MANDATORY)
│   └── entities/
│       └── (existing entities, no changes)
│
├── application/                               # Use cases (depends only on domain)
│   ├── use-cases/
│   │   ├── CalculateChangesTimeseries.ts      # NEW: Aggregate PRs by week, calculate trends
│   │   └── __tests__/
│   │       └── CalculateChangesTimeseries.test.ts  # NEW: Unit tests (RECOMMENDED)
│   └── dto/
│       ├── AnalysisResult.ts                  # MODIFY: Add timeseriesData field
│       └── TimeseriesResult.ts                # NEW: DTO for timeseries data
│
├── infrastructure/                            # External dependencies
│   └── github/
│       └── (existing GraphQL queries, no changes - already includes additions/deletions/changedFiles)
│
├── presentation/                              # UI components
│   └── components/
│       ├── AnalysisTabs.tsx                   # NEW: Tab navigation with URL sync
│       ├── OverviewTab.tsx                    # NEW: Extracted from Dashboard.tsx
│       ├── ThroughputTab.tsx                  # NEW: Wraps existing PRThroughputSection
│       ├── ChangesTimeseriesTab.tsx           # NEW: Timeseries chart and insights
│       │   ├── TimeseriesChart.tsx            # NEW: Recharts visualization
│       │   ├── TimeseriesInsights.tsx         # NEW: Outliers, trends, summary
│       │   └── EmptyState.tsx                 # NEW: No data message
│       └── PRThroughputSection.tsx            # PRESERVE: No changes
│
└── app/[locale]/                              # Next.js App Router
    ├── dashboard/
    │   ├── page.tsx                           # PRESERVE: Route handler
    │   └── DashboardContent.tsx               # MODIFY: Integrate AnalysisTabs
    └── components/
        └── Dashboard.tsx                      # MODIFY: Content moved to OverviewTab
```

**Structure Decision**: This is a Next.js web application following clean architecture. The feature adds new domain value objects for timeseries calculations, a new use case for aggregation logic, and new presentation components for the tab-based UI. Existing GraphQL infrastructure is reused without modification, as PR data already includes the required fields (additions, deletions, changedFiles).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: No violations - This section intentionally left empty.

All constitutional requirements are satisfied without exceptions. The feature follows established patterns and introduces no architectural deviations.

---

## Post-Design Constitution Re-Evaluation

**Date**: 2026-01-23
**Status**: ✅ ALL GATES STILL PASSED

After completing Phase 0 (Research) and Phase 1 (Design & Contracts), the constitutional compliance remains intact:

### Design Artifacts Validated

1. **research.md**: All technical decisions documented with rationale and alternatives considered
   - Weekly aggregation: ISO weeks (Monday start) - industry standard
   - Outlier detection: 2σ threshold - well-understood statistical method
   - Trend analysis: 4-week linear regression - balances recency vs noise
   - Recharts: Reuses existing dependency, no new packages
   - URL sync: Built-in Next.js patterns, no new state management libraries

2. **data-model.md**: Domain entities follow clean architecture principles
   - WeeklyAggregate: Pure value object, no external dependencies
   - ChangeTrend: Pure business logic, testable
   - OutlierWeek: Statistical calculation only, no side effects
   - All validation rules clearly defined

3. **contracts/**: API contracts documented for all layers
   - TimeseriesTypes.ts: Complete DTO definitions with validation constraints
   - ComponentProps.ts: React component interfaces with clear data flow
   - No `any` types, all strictly typed

4. **quickstart.md**: Implementation plan follows test-first approach
   - Domain layer tests MANDATORY (80%+ coverage target)
   - Application layer tests RECOMMENDED
   - Step-by-step with time estimates
   - Definition of Done includes constitutional compliance checks

### No New Risks or Violations Identified

- ✅ **Architecture**: Clean separation of concerns maintained
- ✅ **Dependencies**: No new external packages added
- ✅ **Testing**: Domain tests mandatory, following `__tests__` directory pattern
- ✅ **Performance**: Reuses existing data, no additional API calls
- ✅ **Security**: No new security concerns introduced
- ✅ **Type Safety**: All new types strictly defined
- ✅ **Code Quality**: Follows enum pattern, no duplicate type definitions

### Implementation Risks Assessment

**Low Risk**: This feature has minimal risk of constitutional violations during implementation because:

1. Domain logic is pure functions (easy to test, no side effects)
2. Presentation layer follows existing patterns (Recharts already used)
3. No new infrastructure integrations (reuses GraphQL data)
4. Incremental implementation approach (domain → application → presentation)

**Mitigation Strategy**: Follow quickstart.md step-by-step order to ensure tests are written alongside implementation.

### Final Approval

**Status**: ✅ APPROVED FOR PHASE 2 (Implementation Planning via `/speckit.tasks`)

All design artifacts are complete, constitutional compliance verified, and implementation approach validated. Ready to proceed with task generation and implementation.
