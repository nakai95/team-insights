# team-insights Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-06

## Active Technologies

- TypeScript 5.3 with strict mode enabled + Next.js 15 (App Router), React 18.3, @octokit/graphql 9.0.3, Recharts 3.5.0, next-themes 0.4.6 (007-progressive-loading)
- IndexedDB (client-side caching with LRU eviction), no server-side database (007-progressive-loading)

- IndexedDB for client-side caching (repository data, PRs, deployments, commits with date ranges and timestamps) (007-progressive-loading)

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

## Progressive Loading Patterns

### Server/Client Component Boundary

- **Server Components**: Handle initial data fetching (30-day window) in `page.tsx`
- **Client Components**: Manage background loading, user interactions, and state updates
- **Data Flow**: Server Component → props → Client Component → background loading with useTransition

**Example Structure**:

```typescript
// app/[locale]/dashboard/page.tsx (Server Component)
export default async function DashboardPage({ searchParams }) {
  const dateRange = parseDateRange(searchParams);
  const initialData = await loadInitialData(repositoryId, dateRange);

  return <DashboardWithInitialData initialData={initialData} />;
}

// DashboardWithInitialData.tsx (Client Component)
"use client";
export function DashboardWithInitialData({ initialData }) {
  const [isPending, startTransition] = useTransition();
  // Background loading logic with startTransition
}
```

### URL Parameters for Date Ranges

**Convention**: Use URL query parameters to store date range selections for shareability

**Supported Parameters**:

- `start` - ISO date string (e.g., `2026-01-07`)
- `end` - ISO date string (e.g., `2026-02-06`)
- `preset` - Preset identifier (e.g., `last_7_days`, `last_30_days`, `last_90_days`)

**Example URLs**:

```
/dashboard?preset=last_30_days
/dashboard?start=2025-12-01&end=2026-01-31
/dashboard?preset=last_90_days
```

**Implementation Pattern**:

```typescript
// Server Component: Parse URL params
const dateRange = parseDateRange(searchParams);

// Client Component: Update URL on date change
const handleDateChange = (newRange: DateRange) => {
  const params = new URLSearchParams();
  params.set("start", newRange.start.toISOString().split("T")[0]);
  params.set("end", newRange.end.toISOString().split("T")[0]);
  router.push(`/dashboard?${params.toString()}`);
};
```

### Cache-Aware Data Loading

**Pattern**: Stale-while-revalidate with background refresh

1. **Check cache first**: Always attempt to serve from IndexedDB cache
2. **Serve stale data immediately**: Display cached data even if stale (>1 hour old)
3. **Background refresh**: Trigger background fetch if data is stale
4. **Update UI non-blocking**: Use `startTransition` to avoid blocking interactions

**Example**:

```typescript
const cachedData = await cache.get(cacheKey);

if (cachedData) {
  // Serve cached data immediately
  setData(cachedData.data);

  if (cachedData.isStale()) {
    // Background refresh (non-blocking)
    startTransition(async () => {
      const fresh = await fetchFromAPI();
      await cache.set(fresh);
      setData(fresh);
    });
  }
}
```

### Background Loading with useTransition

**Pattern**: Progressive data loading without blocking UI

```typescript
const [isPending, startTransition] = useTransition();

useEffect(() => {
  const abortController = new AbortController();

  startTransition(async () => {
    const result = await loadHistoricalData(
      repositoryId,
      historicalRange,
      abortController.signal,
      (progress) => {
        // Update progress indicator
        setLoadingProgress(progress);
      },
    );

    if (result.ok) {
      setHistoricalData(result.value);
    }
  });

  return () => abortController.abort();
}, [repositoryId]);
```

### Performance Optimization Patterns

**React.memo for Charts**: Prevent re-renders during background loading

```typescript
export const MyChart = React.memo(function MyChart({ data }) {
  // Chart implementation
});
```

**Pre-compiled Regex**: Use static properties for repeated regex operations

```typescript
class CacheKey {
  private static readonly KEY_REGEX = /^repo:([\w-]+\/[\w-]+):/;

  getRepositoryId(): string {
    return this._value.match(CacheKey.KEY_REGEX)?.[1] ?? "";
  }
}
```

**Efficient String Building**: Cache intermediate results

```typescript
// ✅ Efficient
const startISO = dateRange.start.toISOString();
const endISO = dateRange.end.toISOString();
const key = `repo:${repositoryId}:type:${dataType}:range:${startISO}:${endISO}`;

// ❌ Inefficient (repeated toISOString calls)
const key = `repo:${repositoryId}:type:${dataType}:range:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
```

## Build Configuration

**Contract Files Exclusion**:

- `specs/**/contracts/**` are excluded from TypeScript compilation (tsconfig.json)
- `specs/**/contracts/**` are excluded from ESLint (eslint.config.mjs)
- Contract files (.ts/.tsx) in specs/ are documentation only, not executable code

## Recent Changes

- 007-progressive-loading: Added TypeScript 5.3 with strict mode enabled + Next.js 15 (App Router), React 18.3, @octokit/graphql 9.0.3, Recharts 3.5.0, next-themes 0.4.6

- 007-progressive-loading: Added TypeScript 5.3, Next.js 15 (App Router)

- 2026-02-06: Added DORA Metrics - Deployment Frequency feature (006-dora-deployment-frequency)
  - First DORA metric implementation: Deployment Frequency dashboard with weekly/monthly aggregations
  - Retrieves deployment events from GitHub Releases, Deployments, and Tags via GraphQL API
  - DORA performance level classification (Elite/High/Medium/Low) based on industry benchmarks
  - Trend analysis with 4-week moving average and direction indicators (increasing/decreasing/stable)
  - New domain value objects: DeploymentEvent, DeploymentFrequency, DORAPerformanceLevel
  - New application use case: CalculateDeploymentFrequency with deduplication logic
  - Extended IGitHubRepository interface with getReleases(), getDeployments(), getTags() methods
  - New GraphQL queries and mappers for deployment data sources
  - Tab-based UI integration: DeploymentFrequencyTab, DeploymentFrequencyChart, DeploymentBarChart
  - Performance: Supports 500+ deployment events, <2s load time for large repositories
  - Error handling: Empty states, loading indicators, error boundaries, React.memo optimization
  - E2E tests for critical user paths in deployment frequency analysis

  - Weekly visualization of PR code changes (additions/deletions/changedFiles) with Recharts
  - Statistical outlier detection (2 standard deviations threshold) for identifying large refactoring weeks
  - 4-week trend analysis (increasing/decreasing/stable) for development velocity tracking
  - Tab-based UI architecture: AnalysisTabs component with URL synchronization
  - New domain value objects: WeeklyAggregate, ChangeTrend, OutlierWeek
  - Reuses existing GraphQL PR data (no additional API calls)
  - Performance: Tab switching <100ms, supports up to 52 weeks of data
  - Replaced all REST API calls with GraphQL queries (validateAccess, getRateLimitStatus, user authentication)
  - Simplified authentication with direct `graphql()` function usage (no Octokit class instantiation)
  - Removed @octokit/rest dependency from package.json
  - Performance: All API operations now use GraphQL for consistency
  - Infrastructure-only change: `OctokitAdapter.ts` and `EnvTokenAdapter.ts` implementation updated
  - No breaking changes: All interfaces and tests remain unchanged
  - Replaced sequential REST API calls with single GraphQL queries
  - Performance improvement: 15 seconds → <1 second for large repositories
  - API efficiency: 90%+ reduction in API requests (100+ REST calls → 1-2 GraphQL queries)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
