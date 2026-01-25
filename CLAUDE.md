# team-insights Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-23

## Active Technologies

- TypeScript 5.3, Next.js 15 (App Router) + @octokit/graphql 9.0.3
- React 18.3, Recharts 3.5.0
- NextAuth v5 beta.30 (session data in encrypted JWT, no database)
- next-themes 0.4.6 (theme management with SSR safety)
- ESLint 9 with flat config (eslint.config.mjs)

## Project Structure

```text
src/
├── domain/           # Business logic (no external dependencies)
├── application/      # Use cases (depends only on domain)
├── infrastructure/   # External dependencies (Git, GitHub API, filesystem)
├── presentation/     # UI components
└── app/              # Next.js App Router (routes, server components)
```

## Test File Organization

**MANDATORY**: Test files MUST be placed in `__tests__` directories within the same directory as the code being tested.

✅ **CORRECT**:

```
src/domain/value-objects/Email.ts
src/domain/value-objects/__tests__/Email.test.ts
```

❌ **INCORRECT**:

```
src/domain/value-objects/Email.ts
tests/unit/domain/value-objects/Email.test.ts
```

## Commands

```bash
pnpm test                    # Run all tests (vitest run)
pnpm test:unit               # Run tests in tests/unit directory
pnpm test:domain             # Run tests in tests/unit/domain directory (NOTE: does NOT include src/domain/__tests__)
pnpm test:watch              # Run tests in watch mode
pnpm test:coverage           # Run tests with coverage report
pnpm test:e2e                # Run Playwright E2E tests
pnpm test:e2e:ui             # Run Playwright E2E tests with UI
pnpm run lint                # Run ESLint
pnpm type-check              # TypeScript type checking (tsc --noEmit)
```

**Important Notes:**

- Tests in `src/**/__tests__/` directories are run by `pnpm test` (runs all vitest tests)
- To run specific test files: `pnpm test <path-to-test-file>`
- `pnpm test:domain` only covers `tests/unit/domain/`, NOT `src/domain/__tests__/`

## Code Style

- TypeScript strict mode enabled
- No `any` types allowed (use `unknown` instead)
- ESLint 9 flat config in eslint.config.mjs
- Follow Next.js 15 conventions
- Domain-driven design with clean architecture

### String Literal Types - Enum Pattern (MANDATORY)

When defining string literal union types, **ALWAYS** provide a constant object with the same name to avoid hardcoding strings:

✅ **CORRECT** - Constant object with derived type:

```typescript
export const SizeBucket = {
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
} as const;
export type SizeBucket = (typeof SizeBucket)[keyof typeof SizeBucket];

// Usage: SizeBucket.S instead of "S"
const bucket = SizeBucket.fromPRs(SizeBucket.S, prs, total);
```

✅ **CORRECT** - Works for any string literal type:

```typescript
export const InsightType = {
  OPTIMAL: "optimal",
  NO_DIFFERENCE: "no_difference",
  INSUFFICIENT_DATA: "insufficient_data",
} as const;
export type InsightType = (typeof InsightType)[keyof typeof InsightType];

// Usage: InsightType.OPTIMAL instead of "optimal"
if (insight.type === InsightType.OPTIMAL) { ... }
```

❌ **INCORRECT** - Hardcoded strings:

```typescript
const bucket = SizeBucket.fromPRs("S", prs, total); // Don't do this
const insight = ThroughputInsight.create("optimal", msg, "S"); // Don't do this
if (insight.type === "optimal") { ... } // Don't do this
```

**Rationale**:

- Prevents typos (compile-time checking)
- Enables IDE autocomplete
- Makes refactoring safer (rename in one place)
- Self-documenting code
- Cleaner syntax than class static properties

## Build Configuration

**Contract Files Exclusion**:

- `specs/**/contracts/**` are excluded from TypeScript compilation (tsconfig.json)
- `specs/**/contracts/**` are excluded from ESLint (eslint.config.mjs)
- Contract files (.ts/.tsx) in specs/ are documentation only, not executable code

## Recent Changes

- 2026-01-23: Added PR Changes Timeseries Analysis feature (005-pr-changes-timeseries)
  - Weekly visualization of PR code changes (additions/deletions/changedFiles) with Recharts
  - Statistical outlier detection (2 standard deviations threshold) for identifying large refactoring weeks
  - 4-week trend analysis (increasing/decreasing/stable) for development velocity tracking
  - Tab-based UI architecture: AnalysisTabs component with URL synchronization
  - New domain value objects: WeeklyAggregate, ChangeTrend, OutlierWeek
  - Reuses existing GraphQL PR data (no additional API calls)
  - Performance: Tab switching <100ms, supports up to 52 weeks of data
- 2026-01-04: Completed migration from @octokit/rest to @octokit/graphql
  - Replaced all REST API calls with GraphQL queries (validateAccess, getRateLimitStatus, user authentication)
  - Simplified authentication with direct `graphql()` function usage (no Octokit class instantiation)
  - Removed @octokit/rest dependency from package.json
  - Performance: All API operations now use GraphQL for consistency
  - Infrastructure-only change: `OctokitAdapter.ts` and `EnvTokenAdapter.ts` implementation updated
  - No breaking changes: All interfaces and tests remain unchanged
- 2026-01-02: Migrated GitHub API from REST to GraphQL (004-github-api-graphql)
  - Replaced sequential REST API calls with single GraphQL queries
  - Performance improvement: 15 seconds → <1 second for large repositories
  - API efficiency: 90%+ reduction in API requests (100+ REST calls → 1-2 GraphQL queries)
- 2025-12-30: Added light/dark mode toggle with next-themes integration
- 2025-12-25: Added PR Throughput Analysis feature (003-pr-throughput-analysis)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
