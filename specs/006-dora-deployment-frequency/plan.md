# Implementation Plan: DORA Metrics - Deployment Frequency

**Branch**: `006-dora-deployment-frequency` | **Date**: 2026-02-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-dora-deployment-frequency/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement the first DORA metric (Deployment Frequency) by retrieving deployment events from GitHub (Releases, Deployments, Tags), aggregating them into weekly/monthly frequencies, classifying performance against industry benchmarks (Elite/High/Medium/Low), and visualizing the data in a new dashboard tab with trend charts and summary statistics.

## Technical Context

**Language/Version**: TypeScript 5.3 with Next.js 15 (App Router)
**Primary Dependencies**: @octokit/graphql 9.0.3, Recharts 3.5.0, React 18.3, Zod 4.1.13
**Storage**: N/A (stateless analysis, no persistence required)
**Testing**: Vitest 4.0.14 (unit tests), Playwright 1.57.0 (E2E tests)
**Target Platform**: Web (Next.js server-side rendering + client components)
**Project Type**: Web application (Next.js full-stack)
**Performance Goals**:

- Deployment data fetch <2 seconds for repositories with 500 events
- Chart rendering <100ms on tab switch
- Support up to 52 weeks of historical data without degradation

**Constraints**:

- GitHub GraphQL API rate limits (5000 points/hour)
- Vercel serverless timeout 60s (Hobby plan)
- Must work with repositories using different deployment workflows

**Scale/Scope**:

- Support 1-500 deployment events per repository
- Aggregate data by ISO 8601 weeks and calendar months
- Display trends over 1-12 month periods

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Pragmatic Clean Architecture

- ✅ **PASS**: Feature follows existing clean architecture pattern
  - Domain: New value objects (DeploymentEvent, DeploymentFrequency, DORAPerformanceLevel)
  - Application: New use case (CalculateDeploymentFrequency)
  - Infrastructure: New GraphQL queries (releases.ts, deployments.ts)
  - Presentation: New tab component (DeploymentFrequencyTab)
- ✅ **PASS**: Domain layer has no external dependencies
- ✅ **PASS**: Application layer depends only on domain interfaces
- ✅ **PASS**: Infrastructure implements domain interfaces (IGitHubRepository extension)

### III. Test Strategy

- ✅ **PASS**: Domain value objects will have mandatory unit tests in `__tests__` directories
  - `src/domain/value-objects/__tests__/DeploymentEvent.test.ts`
  - `src/domain/value-objects/__tests__/DeploymentFrequency.test.ts`
  - `src/domain/value-objects/__tests__/DORAPerformanceLevel.test.ts`
- ✅ **PASS**: Application use case will have unit tests with mocked dependencies
  - `src/application/use-cases/__tests__/CalculateDeploymentFrequency.test.ts`
- ✅ **PASS**: E2E test for critical path: Navigate to Deployment Frequency tab → See data

### IV. Performance & Scalability

- ✅ **PASS**: GraphQL queries implement pagination for large result sets
- ✅ **PASS**: Date range filtering applied (respects existing sinceDate parameter)
- ✅ **PASS**: Rate limiter already exists (RateLimiter.ts) and will be reused
- ⚠️ **WATCH**: May need progress indicator for large repositories (defer to implementation)

### V. Type Safety

- ✅ **PASS**: TypeScript strict mode enabled in project
- ✅ **PASS**: Zod validation already used for API responses (will extend for new GraphQL responses)
- ✅ **PASS**: No `any` types permitted (constitution rule)

### VI. Security First

- ✅ **PASS**: GitHub tokens handled server-side only (existing pattern maintained)
- ✅ **PASS**: No sensitive data in client-side state
- ✅ **PASS**: Rate limiting already implemented

### VII. Error Handling

- ✅ **PASS**: Result types already used throughout codebase (will maintain pattern)
- ✅ **PASS**: User-friendly error messages in presentation layer

### VIII. Code Quality & Discipline

- ✅ **PASS**: String literal enum pattern will be used for DORA levels
  ```typescript
  export const DORALevel = {
    ELITE: "elite",
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
  } as const;
  export type DORALevel = (typeof DORALevel)[keyof typeof DORALevel];
  ```
- ✅ **PASS**: No duplicate type definitions (single source of truth)
- ✅ **PASS**: ESLint + Prettier + Husky pre-commit hooks already configured

**Gate Result (Initial Check)**: ✅ **ALL GATES PASSED** - Proceed to Phase 0 research

**Gate Result (Post-Design Re-check)**: ✅ **ALL GATES PASSED** - Design maintains constitutional compliance

_Re-checked after Phase 1 design completion (2026-02-06). All architectural decisions, data models, and contracts align with constitution principles. No violations introduced during design phase._

## Project Structure

### Documentation (this feature)

```text
specs/006-dora-deployment-frequency/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── releases.graphql    # GitHub Releases query schema
│   ├── deployments.graphql # GitHub Deployments query schema
│   └── deployment-frequency-api.yml  # Internal data flow contract
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── entities/
│   │   └── (existing entities remain unchanged)
│   ├── value-objects/
│   │   ├── DeploymentEvent.ts          # NEW: Single deployment event
│   │   ├── DeploymentFrequency.ts       # NEW: Weekly/monthly aggregation
│   │   ├── DORAPerformanceLevel.ts      # NEW: Elite/High/Medium/Low classification
│   │   └── __tests__/
│   │       ├── DeploymentEvent.test.ts
│   │       ├── DeploymentFrequency.test.ts
│   │       └── DORAPerformanceLevel.test.ts
│   └── interfaces/
│       └── IGitHubRepository.ts         # EXTENDED: Add getReleases(), getDeployments()
│
├── application/
│   ├── use-cases/
│   │   ├── CalculateDeploymentFrequency.ts  # NEW: Orchestrates deployment analysis
│   │   ├── AnalyzeRepository.ts             # EXTENDED: Add optional deployment analysis
│   │   └── __tests__/
│   │       └── CalculateDeploymentFrequency.test.ts
│   └── dto/
│       └── DeploymentFrequencyResult.ts     # NEW: DTO for deployment frequency data
│
├── infrastructure/
│   └── github/
│       ├── OctokitAdapter.ts                # EXTENDED: Implement getReleases(), getDeployments()
│       ├── graphql/
│       │   ├── releases.ts                  # NEW: GraphQL query for releases
│       │   └── deployments.ts               # NEW: GraphQL query for deployments
│       ├── mappers/
│       │   └── graphqlMappers.ts            # EXTENDED: Add mapRelease(), mapDeployment()
│       └── __tests__/
│           └── OctokitAdapter.test.ts       # EXTENDED: Add tests for new methods
│
└── presentation/
    └── components/
        ├── analysis/
        │   ├── AnalysisTabs.tsx             # EXTENDED: Add "Deployment Frequency" tab
        │   ├── DeploymentFrequencyTab.tsx   # NEW: Main deployment frequency view
        │   ├── DeploymentFrequencyChart.tsx # NEW: Weekly trend line chart
        │   ├── DeploymentBarChart.tsx       # NEW: Monthly bar chart
        │   ├── DORABenchmarkCard.tsx        # NEW: Performance level indicator
        │   └── DeploymentSummaryCards.tsx   # NEW: Total/avg deployments display
        └── (existing components)

tests/
└── e2e/
    └── deployment-frequency.spec.ts         # NEW: E2E test for critical path
```

**Structure Decision**: Following existing Next.js App Router structure with clean architecture layering (domain → application → infrastructure → presentation). New domain value objects for deployment concepts, new use case for calculation logic, extended infrastructure for GitHub API calls, and new presentation components for the dashboard tab.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

_No violations detected. All constitutional requirements are met._
