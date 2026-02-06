# Implementation Plan: Progressive Data Loading

**Branch**: `007-progressive-loading` | **Date**: 2026-02-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-progressive-loading/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Transform Team Insights from full-data loading to progressive loading architecture. Initial view displays recent 30-day metrics within 5 seconds, while historical data loads in background. Client-side caching (IndexedDB) enables instant subsequent visits and date range changes. GitHub GraphQL pagination fetches data in batches to optimize API usage and perceived performance.

## Technical Context

**Language/Version**: TypeScript 5.3, Next.js 15 (App Router)
**Primary Dependencies**: @octokit/graphql 9.0.3, React 18.3, Recharts 3.5.0, next-themes 0.4.6, IndexedDB wrapper (NEEDS CLARIFICATION: idb vs Dexie.js vs native)
**Storage**: IndexedDB for client-side caching (repository data, PRs, deployments, commits with date ranges and timestamps)
**Testing**: Vitest (unit tests for domain/application), Playwright (E2E tests for critical loading paths)
**Target Platform**: Web (Next.js App Router, server components + client components for interactive features)
**Project Type**: Web application (existing Next.js structure in src/)
**Performance Goals**: Initial 30-day load <5s (500 PRs), cached data display <1s, date range change <500ms, background historical load <30s (2000 PRs/year)
**Constraints**: Must handle concurrent background loading for multiple metrics (PRs, deployments, commits) without race conditions, UI must remain responsive (<200ms interactions) during background loading, cache hit rate >70% for repeat users
**Scale/Scope**: Large GitHub repositories (500+ PRs in 30 days, 2000+ PRs over 1 year), multiple concurrent data streams (PRs + deployments + commits)

**Additional Clarifications Needed**:

- Date range picker component strategy (NEEDS CLARIFICATION: custom component vs library like react-datepicker)
- Loading state management approach (NEEDS CLARIFICATION: React Context vs Zustand vs useReducer)
- Cache invalidation strategy details (NEEDS CLARIFICATION: time-based vs manual vs hybrid)
- GraphQL query batching strategy (NEEDS CLARIFICATION: parallel queries vs sequential with cancellation)
- Background worker implementation (NEEDS CLARIFICATION: Web Workers vs async/await in main thread)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Pragmatic Clean Architecture ✅

**Compliance**: PASS

- Domain layer: `CachedDataEntry`, `LoadingState`, `DateRangeSelection` value objects
- Application layer: `LoadInitialData`, `LoadHistoricalData`, `GetCachedData` use cases
- Infrastructure layer: `IndexedDBAdapter`, `GraphQLBatchLoader` implementations
- Presentation layer: Date range picker, loading indicators, chart updates
- Follows existing Next.js App Router structure in `src/`

### II. Practical SOLID Principles ✅

**Compliance**: PASS

- **Single Responsibility**: Cache adapter only handles storage, loader only handles API calls, use cases orchestrate workflows
- **Interface Segregation**: `ICacheRepository` (get/set/evict), `IDataLoader` (fetchByDateRange), `ILoadingStateManager` (track progress)
- **Dependency Inversion**: Domain defines interfaces, infrastructure implements them

### III. Test Strategy ✅

**Compliance**: PASS

- Domain tests (MANDATORY): Value objects, date range calculations, cache key generation
- Application tests (RECOMMENDED): Use cases with mocked dependencies
- E2E tests (CRITICAL PATHS): Initial 30-day load, background loading, cache retrieval
- Test files in `__tests__/` directories per constitution

### IV. Performance & Scalability ⚠️

**Compliance**: PASS (with justification required)

- ✅ Large repository handling: GraphQL pagination with date-based filtering
- ✅ Async processing: Background loading without UI blocking
- ⚠️ **DEVIATION**: Constitution states caching is "DEFERRED", but this feature REQUIRES IndexedDB caching as core functionality

**Justification**: Progressive loading cannot function without caching. The feature spec explicitly requires:

1. Initial 30-day load followed by background historical load (requires cache to merge data)
2. Instant subsequent visits (<1s) - impossible without persistent cache
3. Date range changes <500ms - requires cached data availability
4. Cache hit rate >70% - explicit success criterion

Without caching, this feature degrades to current full-load behavior. Caching must be implemented now, not deferred.

### V. Type Safety ✅

**Compliance**: PASS

- TypeScript strict mode enabled
- Zod schemas for cache validation (detect corrupted IndexedDB data)
- Runtime validation at boundaries (cache reads/writes)

### VI. Security First ✅

**Compliance**: PASS

- No changes to token handling (remains server-side in NextAuth)
- No temporary file storage (IndexedDB is browser-managed)
- No new security surface area introduced

### VII. Error Handling ✅

**Compliance**: PASS

- Result types for cache operations (Success/Failure with error details)
- User-friendly messages: "Loading recent data...", "Cache unavailable, using in-memory storage"
- Graceful degradation: Falls back to in-memory cache if IndexedDB fails

### VIII. Code Quality & Discipline ✅

**Compliance**: PASS

- No `any` types (use `unknown` for IndexedDB raw data)
- String literal enum pattern for `LoadingStateType`, `CacheStatusType`, `DateRangePresetType`
- Single source of truth: Define types once in domain layer, import elsewhere
- ESLint + Prettier configured
- Pre-commit hooks run tests

### Gate Evaluation

**RESULT**: ✅ PASS (with justified deviation)

All constitutional principles satisfied. The caching deviation is justified because:

1. Progressive loading is architecturally impossible without caching
2. User requirements explicitly demand instant subsequent loads and offline capability
3. This feature validates caching as valuable (previously deferred due to uncertainty)
4. Implementation follows all other architectural principles (clean layers, SOLID, testing)

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
│   │   ├── CachedDataEntry.ts          # Cache entry with metadata
│   │   ├── LoadingState.ts             # Loading progress tracking
│   │   └── DateRangeSelection.ts       # User's selected date range
│   ├── value-objects/
│   │   ├── CacheKey.ts                 # Repository + type + date range identifier
│   │   ├── DateRange.ts                # Start/end date with validation
│   │   └── LoadingProgress.ts          # Percentage, status, ETA
│   └── repositories/
│       ├── ICacheRepository.ts         # Interface for cache operations
│       └── IDataLoader.ts              # Interface for data fetching
│
├── application/
│   ├── use-cases/
│   │   ├── LoadInitialData.ts          # Load recent 30-day data
│   │   ├── LoadHistoricalData.ts       # Background load beyond 30 days
│   │   ├── GetCachedData.ts            # Retrieve from cache if available
│   │   ├── RefreshData.ts              # Manual refresh bypassing cache
│   │   └── ChangeDataRange.ts          # Handle user date range selection
│   └── services/
│       └── LoadingStateManager.ts      # Coordinate loading states
│
├── infrastructure/
│   ├── cache/
│   │   ├── IndexedDBAdapter.ts         # IndexedDB implementation
│   │   ├── InMemoryCacheAdapter.ts     # Fallback for IndexedDB failures
│   │   └── CacheEvictionStrategy.ts    # LRU eviction logic
│   └── api/
│       ├── GraphQLBatchLoader.ts       # Paginated GraphQL fetching
│       └── DateRangeQueryBuilder.ts    # Build date-filtered queries
│
└── presentation/
    ├── components/
    │   ├── DateRangePicker.tsx         # Date range selector UI
    │   ├── LoadingIndicator.tsx        # Initial/background/custom loading states
    │   └── CacheStatusBadge.tsx        # Stale data indicator
    └── hooks/
        ├── useProgressiveLoading.ts    # Main hook orchestrating loading
        ├── useCachedData.ts            # Cache retrieval hook
        └── useBackgroundLoader.ts      # Background loading hook
```

**Structure Decision**: Using existing Next.js Web application structure. This feature extends the current architecture with progressive loading capabilities. All new code follows the pragmatic clean architecture pattern already established in the codebase (domain/application/infrastructure/presentation layers).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                           | Why Needed                                                                                                                                              | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implementing caching (was deferred) | Progressive loading requires persistent cache to merge initial + background data, enable instant subsequent visits, and support fast date range changes | In-memory only: Data lost on page refresh, negating user story benefits. Full reload on each visit: Defeats purpose of progressive loading (would remain at current 15s+ load time). Session storage: Insufficient capacity for large repositories (5-10MB limit vs IndexedDB's 50MB+ capacity) |

---

## Post-Design Constitution Re-Evaluation

**Date**: 2026-02-06
**Status**: ✅ PASS (All principles maintained)

After completing Phase 1 design (data model, contracts, quickstart), all constitutional principles remain satisfied:

### Design Validation

**I. Pragmatic Clean Architecture** ✅

- Domain layer: Pure TypeScript value objects and entities (CacheKey, DateRange, LoadingProgress, CachedDataEntry, LoadingState)
- Application layer: Use cases (LoadInitialData, LoadHistoricalData, GetCachedData) orchestrate workflows
- Infrastructure layer: Adapters (IndexedDBAdapter, GraphQLBatchLoader, ZustandLoadingStore) implement domain interfaces
- Presentation layer: React hooks (useProgressiveLoading) and components (DateRangePicker, LoadingIndicator)
- **No violations**: Design follows existing `src/domain/`, `src/application/`, `src/infrastructure/`, `src/presentation/` structure

**II. Practical SOLID Principles** ✅

- **Single Responsibility**: Each entity/value object has one concern (CacheKey = identification, DateRange = temporal validity)
- **Interface Segregation**: Three focused interfaces (ICacheRepository, IDataLoader, ILoadingStateManager) instead of one monolithic interface
- **Dependency Inversion**: Domain defines interfaces, infrastructure implements them (IndexedDBAdapter implements ICacheRepository)

**III. Test Strategy** ✅

- Domain tests MANDATORY: All value objects (CacheKey, DateRange, LoadingProgress) and entities (CachedDataEntry, LoadingState) have `__tests__/` directories specified
- Application tests RECOMMENDED: Use cases will use mocked dependencies
- E2E tests for critical paths: Initial load, background loading, cache retrieval defined in quickstart.md
- **Follows constitution requirement**: Tests in `__tests__/` directories alongside implementation files

**IV. Performance & Scalability** ✅

- Large repository handling: GraphQL pagination with date-based filtering (documented in research.md)
- Async processing: Background loading with React 18 `startTransition` (non-blocking UI)
- Caching deviation STILL JUSTIFIED: Design confirms caching is architecturally required for progressive loading

**V. Type Safety** ✅

- TypeScript strict mode: All contracts use strict types (readonly properties, discriminated unions)
- Runtime validation: Zod schemas defined in data-model.md for CachedDataEntry validation
- No `any` types: Contracts use `unknown` for serialized data with Zod validation

**VI. Security First** ✅

- Token handling: No changes (remains server-side in NextAuth)
- No temporary directories: IndexedDB is browser-managed
- No new security surface: Client-side caching doesn't expose GitHub tokens

**VII. Error Handling** ✅

- Result types: All use cases return `Result<T>` for failure handling
- User-friendly messages: LoadingIndicator component shows contextual error messages
- Graceful degradation: Cache failures fall back to API fetching (documented in quickstart.md)

**VIII. Code Quality & Discipline** ✅

- String literal enum pattern: All enums follow mandatory pattern (DataType, StreamType, LoadingStatus, LoadingType, CacheStatus, DateRangePreset)
- Single source of truth: Types defined once in domain layer, imported elsewhere
- No `any` types: Contracts use `unknown` for dynamic data with validation
- ESLint + Prettier: Existing configuration applies

### New Dependencies Validation

**Added**: `idb` (1.19 KB), `zustand` (1 KB)
**Total Bundle Impact**: ~2.2 KB gzipped
**Justification**: Both dependencies are minimal, well-maintained, and solve specific problems:

- `idb`: Simplifies IndexedDB API (20x smaller than Dexie.js alternative)
- `zustand`: Provides fine-grained reactivity for concurrent loading states (smaller than TanStack Query alternative)

### Conclusion

**GATE STATUS**: ✅ PASS

All constitutional principles satisfied after Phase 1 design. The caching deviation remains justified and is confirmed as architecturally necessary. No new violations introduced. Implementation may proceed to Phase 2 (Tasks generation via `/speckit.tasks`).

**Next Command**: `/speckit.tasks` to generate tasks.md from plan.md and data-model.md
