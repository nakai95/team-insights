# Implementation Plan: Progressive Data Loading

**Branch**: `007-progressive-loading` | **Date**: 2026-02-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-progressive-loading/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Transform Team Insights from full-load architecture to progressive loading with initial 30-day display within 5 seconds, followed by automatic background historical data loading. Uses Next.js 15 Server Components for initial fetch, Client Components with useTransition for background loading, React Suspense for skeleton UI, and IndexedDB for client-side caching. Eliminates global state management (Zustand removed) by storing date range in URL params and using component-level state with useState/useTransition. Each metric component independently manages its own background loading without blocking other components.

## Technical Context

**Language/Version**: TypeScript 5.3 with strict mode enabled
**Primary Dependencies**: Next.js 15 (App Router), React 18.3, @octokit/graphql 9.0.3, Recharts 3.5.0, next-themes 0.4.6
**Storage**: IndexedDB (client-side caching with LRU eviction), no server-side database
**Testing**: Vitest 2.1.8 (unit tests with coverage), Playwright 1.49.1 (E2E tests for critical paths)
**Target Platform**: Web (Next.js App Router with Server/Client Component boundary, Vercel deployment)
**Project Type**: Web application (Next.js 15 App Router with clean architecture)
**Performance Goals**: Initial 30-day display <5s (up to 500 PRs), cached loads <1s, background historical loading <30s (up to 2000 PRs), UI interactions <200ms during background loading
**Constraints**: GitHub API rate limits (5000 req/hr authenticated), IndexedDB storage limits (varies by browser, typically 50-100MB), Vercel 60-second timeout for Server Components, useTransition must not block user interactions
**Scale/Scope**: Repositories with up to 2000 PRs over 1 year, 500 PRs in 30-day window, support for 3 metric types (PRs, deployments, commits), 6 date range presets + custom range

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Pragmatic Clean Architecture ✅ PASS

- **Directory Structure**: Feature will follow existing clean architecture
  - `src/domain/`: New value objects (CachedDataEntry, DateRangeSelection)
  - `src/application/`: New use cases for cache management and background loading
  - `src/infrastructure/`: IndexedDB adapter implementing cache interfaces
  - `src/presentation/`: Loading indicators, date range selector UI components
  - `src/app/`: Server Components for initial fetch, Client Components for background loading
- **Dependency Rules**: Domain remains pure (no external dependencies), application depends only on domain, infrastructure implements domain interfaces
- **Next.js Conventions**: Server/Client Component boundary follows Next.js 15 best practices (Server for initial data, Client for interactivity)

### II. Practical SOLID Principles ✅ PASS

- **SRP**: Separate responsibilities - cache storage (IndexedDB adapter), cache coordination (use case), UI loading states (presentation components)
- **ISP**: Focused interfaces - ICacheRepository (get/set/evict), IBackgroundLoader (fetchHistorical), IDateRangeSelector (onChange)
- **DIP**: Cache abstraction allows easy mocking for tests, can swap IndexedDB for in-memory fallback

### III. Test Strategy ✅ PASS

- **Domain Tests (MANDATORY)**: 80%+ coverage for CachedDataEntry, DateRangeSelection value objects, cache eviction logic
- **Test File Organization**: All tests in `__tests__` directories within same directory as code
- **Application Tests (RECOMMENDED)**: Use case tests for background loading orchestration, cache miss/hit scenarios
- **E2E Tests (CRITICAL PATHS)**:
  1. Happy path: Initial 30-day load + background historical loading
  2. Cache hit path: Instant display from IndexedDB
  3. Error path: API rate limit → graceful degradation
  4. Edge case: IndexedDB unavailable → fallback to in-memory cache

### IV. Performance & Scalability ✅ PASS

- **Large Repository Handling**: GitHub GraphQL queries limited to 30-day window initially, paginated batch fetching for historical data
- **Async Processing**: useTransition for non-blocking background loading, React Suspense for initial skeleton UI
- **Caching Strategy**: IndexedDB with LRU eviction, 1-hour staleness threshold with automatic background refresh
- **Progress Indicators**: Structural skeleton UI (Suspense fallback), "Loading more data..." text (useTransition isPending)

### V. Type Safety ✅ PASS

- **TypeScript Strict Mode**: Already enabled (`strict: true`, `noUncheckedIndexedAccess: true`)
- **Runtime Validation**: Zod schemas for IndexedDB data validation, cache entry deserialization
- **No `any` Types**: Use `unknown` for IndexedDB deserialization, proper type guards

### VI. Security First ✅ PASS (No New Concerns)

- **Token Protection**: Already handled by existing NextAuth infrastructure (server-side only)
- **No New Security Surface**: IndexedDB contains only public GitHub data (PR metrics, deployments), no sensitive tokens

### VII. Error Handling ✅ PASS

- **Domain Layer**: Result types for cache operations (CacheResult<T>), DateRangeValidation result
- **Application Layer**: Transform technical errors into user-friendly messages
  - "GitHub API rate limit exceeded. Loading will resume in X minutes."
  - "Browser storage unavailable. Using temporary memory cache."
  - "Network interrupted. Retrying in background..."
- **Presentation Layer**: Toast notifications for errors, inline "Loading failed - Retry" buttons

### VIII. Code Quality & Discipline ✅ PASS

- **Enum Pattern for String Literals**: DateRangePreset = { LAST_7_DAYS: "last_7_days", ... } as const
- **Single Source of Truth**: No duplicate type definitions across cache, use case, and UI layers
- **Test File Organization**: `src/domain/value-objects/__tests__/CachedDataEntry.test.ts`
- **Build Configuration**: Existing `specs/**/contracts/**` exclusion applies

### Gate Summary

**Status**: ✅ ALL GATES PASS - No constitutional violations
**Complexity Justification**: Not required - feature aligns with all constitutional principles
**Proceed to Phase 0**: YES

## Project Structure

### Documentation (this feature)

```text
specs/007-progressive-loading/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── cache-api.ts     # IndexedDB cache interface contracts
│   └── loading-api.ts   # Background loading interface contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/                                  # Business logic (no external dependencies)
│   ├── entities/
│   │   └── __tests__/
│   ├── interfaces/
│   │   ├── ICacheRepository.ts             # NEW: Cache storage abstraction
│   │   └── IBackgroundLoader.ts            # NEW: Background loading abstraction
│   ├── services/
│   │   ├── __tests__/
│   │   └── CacheEvictionService.ts         # NEW: LRU eviction logic
│   └── value-objects/
│       ├── __tests__/
│       │   ├── CachedDataEntry.test.ts     # NEW: Cache entry tests
│       │   └── DateRangeSelection.test.ts  # NEW: Date range tests
│       ├── CachedDataEntry.ts              # NEW: Cached data with metadata
│       └── DateRangeSelection.ts           # NEW: Date range selection value object
│
├── application/                            # Use cases (depends only on domain)
│   ├── dto/
│   │   ├── CachedDataDTO.ts                # NEW: Data transfer object for cache
│   │   └── LoadingStateDTO.ts              # NEW: Loading state DTO
│   ├── mappers/
│   │   └── CacheMapper.ts                  # NEW: Domain ↔ DTO mapping
│   └── use-cases/
│       ├── __tests__/
│       │   ├── LoadInitialData.test.ts     # NEW: Initial load tests
│       │   └── LoadHistoricalData.test.ts  # NEW: Background load tests
│       ├── LoadInitialData.ts              # NEW: Server Component initial fetch
│       └── LoadHistoricalData.ts           # NEW: Client Component background fetch
│
├── infrastructure/                         # External dependencies
│   ├── github/
│   │   ├── __tests__/
│   │   ├── graphql/
│   │   │   ├── queries/
│   │   │   │   └── getRangedPullRequests.ts  # NEW: Date-filtered GraphQL query
│   │   │   └── mappers/
│   │   └── GitHubGraphQLAdapter.ts         # MODIFIED: Add date range filtering
│   └── storage/
│       ├── __tests__/
│       │   ├── IndexedDBAdapter.test.ts    # NEW: IndexedDB adapter tests
│       │   └── InMemoryCacheAdapter.test.ts # NEW: Fallback cache tests
│       ├── IndexedDBAdapter.ts             # NEW: IndexedDB implementation
│       └── InMemoryCacheAdapter.ts         # NEW: Fallback in-memory cache
│
├── presentation/                           # UI components
│   ├── components/
│   │   ├── analysis/
│   │   │   ├── PRAnalysisClient.tsx        # MODIFIED: Add background loading
│   │   │   ├── DeploymentFrequencyClient.tsx # MODIFIED: Add background loading
│   │   │   └── SkeletonChart.tsx           # NEW: Structural skeleton UI
│   │   ├── shared/
│   │   │   ├── DateRangeSelector.tsx       # NEW: Date range picker UI
│   │   │   ├── LoadingIndicator.tsx        # NEW: "Loading more data..." indicator
│   │   │   └── StaleDataBanner.tsx         # NEW: Staleness indicator
│   │   └── layout/
│   │       └── DashboardSkeleton.tsx       # NEW: Full dashboard skeleton
│   └── hooks/
│       ├── __tests__/
│       │   ├── useBackgroundLoader.test.ts # NEW: Background loader hook tests
│       │   └── useCache.test.ts            # NEW: Cache hook tests
│       ├── useBackgroundLoader.ts          # NEW: useTransition + background fetch
│       └── useCache.ts                     # NEW: IndexedDB cache hook
│
└── app/                                    # Next.js App Router
    ├── [locale]/
    │   └── dashboard/
    │       ├── page.tsx                    # MODIFIED: Server Component with date params
    │       └── loading.tsx                 # NEW: Suspense fallback skeleton
    └── api/
        └── cache/
            └── invalidate/
                └── route.ts                # NEW: Manual cache invalidation endpoint

tests/
└── e2e/
    ├── progressive-loading.spec.ts         # NEW: E2E tests for progressive loading
    └── cache-behavior.spec.ts              # NEW: E2E tests for cache hit/miss
```

**Structure Decision**: Web application using Next.js 15 App Router with clean architecture. Server Components handle initial 30-day data fetch (passing props to Client Components), Client Components manage background historical data loading with useTransition. No global state management library (date range in URL params, component state with useState/useTransition). IndexedDB adapter in infrastructure layer implements domain cache interface, enabling easy testing and fallback to in-memory cache.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional violations identified. All design decisions align with established principles.
