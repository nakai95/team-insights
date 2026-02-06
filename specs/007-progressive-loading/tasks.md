# Tasks: Progressive Data Loading

**Feature**: 007-progressive-loading
**Input**: Design documents from `/specs/007-progressive-loading/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This feature does NOT require test-first development. Tests will be added incrementally as needed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [ ] T001 Install idb dependency for IndexedDB wrapper: `pnpm add idb`
- [ ] T002 [P] Install fake-indexeddb for testing: `pnpm add -D @types/fake-indexeddb fake-indexeddb`
- [ ] T003 [P] Verify specs/007-progressive-loading/contracts/\*\* exclusion in tsconfig.json
- [ ] T004 [P] Verify specs/007-progressive-loading/contracts/\*\* exclusion in eslint.config.mjs

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain entities, value objects, and infrastructure interfaces that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Domain Layer - Value Objects

- [ ] T005 [P] Create DataType enum using string literal pattern in src/domain/types/DataType.ts
- [ ] T006 [P] Create CacheStatus enum in src/domain/types/CacheStatus.ts
- [ ] T007 [P] Create DateRangePreset enum in src/domain/types/DateRangePreset.ts
- [ ] T008 [P] Create DateRange value object with factory methods (last7Days, last30Days, etc.) in src/domain/value-objects/DateRange.ts
- [ ] T009 [P] Create CacheKey value object with parsing and validation in src/domain/value-objects/CacheKey.ts

### Domain Layer - Entities

- [ ] T010 Create CachedDataEntry entity with staleness detection and touch() method in src/domain/entities/CachedDataEntry.ts
- [ ] T011 [P] Create DateRangeSelection entity with cache status tracking in src/domain/entities/DateRangeSelection.ts

### Domain Layer - Interfaces

- [ ] T012 [P] Create ICacheRepository interface in src/domain/interfaces/ICacheRepository.ts
- [ ] T013 [P] Create IDataLoader interface with date range filtering in src/domain/interfaces/IDataLoader.ts

### Domain Layer - Services

- [ ] T014 Create CacheEvictionService for LRU eviction logic in src/domain/services/CacheEvictionService.ts

### Infrastructure Layer - Cache Adapters

- [ ] T015 Create IndexedDBAdapter implementing ICacheRepository with idb library in src/infrastructure/storage/IndexedDBAdapter.ts
- [ ] T016 [P] Create InMemoryCacheAdapter fallback implementation in src/infrastructure/storage/InMemoryCacheAdapter.ts
- [ ] T017 Create cache initialization function with fallback detection in src/infrastructure/storage/initializeCache.ts

### Infrastructure Layer - GitHub API

- [ ] T018 Extend GitHubGraphQLAdapter with date range filtering for fetchPRs in src/infrastructure/github/GitHubGraphQLAdapter.ts
- [ ] T019 [P] Add date range filtering for fetchDeployments in src/infrastructure/github/GitHubGraphQLAdapter.ts
- [ ] T020 [P] Add date range filtering for fetchCommits (if needed) in src/infrastructure/github/GitHubGraphQLAdapter.ts
- [ ] T021 Add AbortSignal support to all fetch methods in src/infrastructure/github/GitHubGraphQLAdapter.ts

### Application Layer - DTOs

- [ ] T022 [P] Create CachedDataDTO in src/application/dto/CachedDataDTO.ts
- [ ] T023 [P] Create LoadingStateDTO in src/application/dto/LoadingStateDTO.ts

### Application Layer - Mappers

- [ ] T024 Create CacheMapper for domain ↔ DTO conversions in src/application/mappers/CacheMapper.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Fast Initial Dashboard Load (Priority: P1) 🎯 MVP

**Goal**: Display recent 30-day metrics within 5 seconds with Server Components and cache-aware loading

**Independent Test**: Open dashboard and verify PR metrics, deployments, and commits for last 30 days display within 5 seconds, with skeleton UI shown immediately

### Application Layer - Use Cases

- [ ] T025 [US1] Create LoadInitialData use case with cache check and parallel API fetching in src/application/use-cases/LoadInitialData.ts

### Infrastructure Layer - GraphQL Queries

- [ ] T026 [P] [US1] Create GraphQL query for date-filtered PRs in src/infrastructure/github/graphql/queries/getRangedPullRequests.ts
- [ ] T027 [P] [US1] Create GraphQL query for date-filtered deployments in src/infrastructure/github/graphql/queries/getRangedDeployments.ts

### Application Layer - Server Integration

- [ ] T028 [US1] Modify dashboard page.tsx to become Server Component that fetches 30-day data in app/[locale]/dashboard/page.tsx
- [ ] T029 [US1] Add URL query param parsing for date range in app/[locale]/dashboard/page.tsx

### Presentation Layer - Skeleton UI

- [ ] T030 [P] [US1] Create DashboardSkeleton component for Suspense fallback in src/presentation/components/layout/DashboardSkeleton.tsx
- [ ] T031 [P] [US1] Create SkeletonChart component for individual chart placeholders in src/presentation/components/shared/SkeletonChart.tsx
- [ ] T032 [US1] Create loading.tsx with DashboardSkeleton for Suspense boundary in app/[locale]/dashboard/loading.tsx

### Presentation Layer - Client Components

- [ ] T033 [US1] Refactor PRAnalysisClient to accept initialData prop from Server Component in src/presentation/components/analysis/PRAnalysisClient.tsx
- [ ] T034 [P] [US1] Refactor DeploymentFrequencyClient to accept initialData prop in src/presentation/components/analysis/DeploymentFrequencyClient.tsx

**Checkpoint**: At this point, User Story 1 should display 30-day data within 5 seconds with skeleton UI

---

## Phase 4: User Story 2 - Background Historical Data Loading (Priority: P2)

**Goal**: Automatically load historical data (31-365 days) in background without blocking UI, using useTransition for non-blocking updates

**Independent Test**: Load dashboard, verify 30-day data appears first, then confirm historical data progressively appears with "Loading more data..." indicator, and UI remains interactive throughout

### Application Layer - Use Cases

- [ ] T035 [US2] Create LoadHistoricalData use case with chunked batching (90-day chunks) in src/application/use-cases/LoadHistoricalData.ts
- [ ] T036 [US2] Add rate limit awareness checks in LoadHistoricalData to pause when budget low in src/application/use-cases/LoadHistoricalData.ts

### Presentation Layer - Hooks

- [ ] T037 [US2] Create useBackgroundLoader hook with useTransition for non-blocking state updates in src/presentation/hooks/useBackgroundLoader.ts
- [ ] T038 [US2] Add AbortController cleanup on unmount in useBackgroundLoader hook in src/presentation/hooks/useBackgroundLoader.ts

### Presentation Layer - Loading Indicators

- [ ] T039 [P] [US2] Create LoadingIndicator component for "Loading more data..." text during background load in src/presentation/components/shared/LoadingIndicator.tsx

### Presentation Layer - Client Component Integration

- [ ] T040 [US2] Integrate useBackgroundLoader into PRAnalysisClient component in src/presentation/components/analysis/PRAnalysisClient.tsx
- [ ] T041 [P] [US2] Integrate useBackgroundLoader into DeploymentFrequencyClient component in src/presentation/components/analysis/DeploymentFrequencyClient.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - initial load is fast, background loading happens without blocking

---

## Phase 5: User Story 3 - Custom Date Range Selection (Priority: P2)

**Goal**: Allow users to select custom date ranges with presets and custom calendar, updating URL params for shareability

**Independent Test**: Click date range selector, choose different presets (7/30/90 days), verify data updates and URL changes to reflect selection

### Infrastructure Layer - shadcn/ui Components

- [ ] T042 [US3] Install shadcn/ui calendar component: `npx shadcn-ui@latest add calendar`

### Presentation Layer - Date Range UI

- [ ] T043 [US3] Create DateRangeSelector component with presets (Last 7/30/90 days, 6 months, 1 year, custom) in src/presentation/components/shared/DateRangeSelector.tsx
- [ ] T044 [US3] Integrate react-day-picker for custom date selection in DateRangeSelector component in src/presentation/components/shared/DateRangeSelector.tsx
- [ ] T045 [US3] Add dark mode support with next-themes integration in DateRangeSelector component in src/presentation/components/shared/DateRangeSelector.tsx

### Presentation Layer - URL Integration

- [ ] T046 [US3] Add handleDateChange function that updates URL params using Next.js router in PRAnalysisClient component in src/presentation/components/analysis/PRAnalysisClient.tsx
- [ ] T047 [US3] Add DateRangeSelector to dashboard layout in app/[locale]/dashboard/page.tsx

### Application Layer - Date Range Handling

- [ ] T048 [US3] Create parseDateRange utility for URL param validation in Server Component in src/application/utils/parseDateRange.ts
- [ ] T049 [US3] Modify LoadInitialData to support custom date ranges beyond 30 days in src/application/use-cases/LoadInitialData.ts

**Checkpoint**: All three user stories should now work independently - initial fast load, background loading, and custom date selection

---

## Phase 6: User Story 4 - Client-Side Data Caching (Priority: P3)

**Goal**: Implement stale-while-revalidate caching with automatic background refresh, manual refresh, and LRU eviction for instant subsequent visits

**Independent Test**: Load dashboard, close browser, reopen within 1 hour, verify data displays instantly from cache without API calls (check network tab)

### Application Layer - Cache Integration

- [ ] T050 [US4] Modify LoadInitialData to implement stale-while-revalidate pattern in src/application/use-cases/LoadInitialData.ts
- [ ] T051 [US4] Add automatic background refresh when stale data detected in src/application/use-cases/LoadInitialData.ts

### Presentation Layer - Cache Status UI

- [ ] T052 [P] [US4] Create StaleDataBanner component to indicate when cached data is stale in src/presentation/components/shared/StaleDataBanner.tsx
- [ ] T053 [P] [US4] Create RefreshButton component for manual cache invalidation in src/presentation/components/shared/RefreshButton.tsx

### Presentation Layer - Cache Hooks

- [ ] T054 [US4] Create useCache hook for cache operations and status tracking in src/presentation/hooks/useCache.ts
- [ ] T055 [US4] Integrate StaleDataBanner and RefreshButton into dashboard layout in app/[locale]/dashboard/page.tsx

### Application Layer - Cache Management

- [ ] T056 [US4] Implement LRU eviction in CacheEvictionService when storage exceeds 80% (40MB of 50MB) in src/domain/services/CacheEvictionService.ts
- [ ] T057 [US4] Add cache statistics tracking (totalEntries, totalSizeBytes, oldestEntry) in IndexedDBAdapter in src/infrastructure/storage/IndexedDBAdapter.ts

### API Layer - Manual Invalidation

- [ ] T058 [P] [US4] Create API route for manual cache invalidation in app/api/cache/invalidate/route.ts

**Checkpoint**: All four user stories complete - fast initial load, background loading, custom ranges, and persistent caching with staleness handling

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Performance optimizations, error handling, and final integration improvements

### Error Handling

- [ ] T059 [P] Add error boundary for cache initialization failures with fallback to in-memory cache in src/presentation/components/shared/CacheErrorBoundary.tsx
- [ ] T060 [P] Add toast notifications for rate limit errors during background loading in src/presentation/components/shared/RateLimitToast.tsx
- [ ] T061 [P] Add error handling for network interruptions with automatic retry in LoadHistoricalData use case in src/application/use-cases/LoadHistoricalData.ts

### Performance Optimization

- [ ] T062 [P] Add React.memo to chart components to prevent re-renders during background loading in src/presentation/components/analysis/PRSizeDistributionChart.tsx
- [ ] T063 [P] Add React.memo to DeploymentBarChart component in src/presentation/components/analysis/DeploymentBarChart.tsx
- [ ] T064 Optimize cache key generation to avoid unnecessary string concatenation in CacheKey value object in src/domain/value-objects/CacheKey.ts

### Documentation

- [ ] T065 [P] Update CLAUDE.md with progressive loading patterns and URL param conventions in CLAUDE.md
- [ ] T066 [P] Add JSDoc comments to all public interfaces in src/domain/interfaces/

### Configuration

- [ ] T067 Create CacheConfig constants file with TTL and size limits in src/domain/config/CacheConfig.ts
- [ ] T068 [P] Create LoadingConfig constants file with chunk size and timeout settings in src/domain/config/LoadingConfig.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P2 → P3)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Phase 3**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2) - Phase 4**: Can start after Foundational (Phase 2) - Enhances US1 but independently testable
- **User Story 3 (P2) - Phase 5**: Can start after Foundational (Phase 2) - Uses US1's infrastructure but independently testable
- **User Story 4 (P3) - Phase 6**: Can start after Foundational (Phase 2) - Enhances all previous stories but independently testable

### Within Each User Story

- Application use cases before presentation hooks
- Hooks before component integration
- Core implementation before UI integration
- Story complete before moving to next priority

### Parallel Opportunities

**Foundational Phase**:

```bash
# Value objects can be implemented in parallel:
T005 (DataType) + T006 (CacheStatus) + T007 (DateRangePreset) + T008 (DateRange) + T009 (CacheKey)

# Entities in parallel after value objects:
T010 (CachedDataEntry) + T011 (DateRangeSelection)

# Interfaces in parallel:
T012 (ICacheRepository) + T013 (IDataLoader)

# Cache adapters in parallel:
T015 (IndexedDBAdapter) + T016 (InMemoryCacheAdapter)

# GitHub API methods in parallel:
T019 (fetchDeployments) + T020 (fetchCommits)

# DTOs in parallel:
T022 (CachedDataDTO) + T023 (LoadingStateDTO)
```

**User Story 1**:

```bash
# GraphQL queries in parallel:
T026 (getRangedPullRequests) + T027 (getRangedDeployments)

# Skeleton components in parallel:
T030 (DashboardSkeleton) + T031 (SkeletonChart)

# Client component refactoring in parallel:
T033 (PRAnalysisClient) + T034 (DeploymentFrequencyClient)
```

**User Story 2**:

```bash
# Loading indicator can be built while use case is being implemented:
T039 (LoadingIndicator) can run parallel with T035-T036

# Client integration in parallel:
T040 (PRAnalysisClient) + T041 (DeploymentFrequencyClient)
```

**User Story 4**:

```bash
# UI components in parallel:
T052 (StaleDataBanner) + T053 (RefreshButton) + T058 (API route)
```

**Polish Phase**:

```bash
# Error handling components in parallel:
T059 (CacheErrorBoundary) + T060 (RateLimitToast) + T061 (retry logic)

# Performance optimizations in parallel:
T062 (PRSizeDistributionChart) + T063 (DeploymentBarChart)

# Documentation in parallel:
T065 (CLAUDE.md) + T066 (JSDoc comments)

# Config files in parallel:
T067 (CacheConfig) + T068 (LoadingConfig)
```

---

## Parallel Example: User Story 1

```bash
# Launch GraphQL queries together:
Task: "Create GraphQL query for date-filtered PRs in src/infrastructure/github/graphql/queries/getRangedPullRequests.ts"
Task: "Create GraphQL query for date-filtered deployments in src/infrastructure/github/graphql/queries/getRangedDeployments.ts"

# Launch skeleton components together:
Task: "Create DashboardSkeleton component in src/presentation/components/layout/DashboardSkeleton.tsx"
Task: "Create SkeletonChart component in src/presentation/components/shared/SkeletonChart.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install dependencies)
2. Complete Phase 2: Foundational (domain + infrastructure layers) - **CRITICAL**
3. Complete Phase 3: User Story 1 (initial 30-day load with cache)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Open dashboard → see skeleton → data loads in <5s
   - Check cache → verify data stored in IndexedDB
   - Reopen dashboard → verify instant load from cache
5. Deploy/demo if ready

**MVP Scope**: ~68 tasks (T001-T034 + essential config tasks)
**Estimated Delivery**: 7-10 days

### Incremental Delivery

1. **Foundation** (Phases 1-2): Setup + all domain/infrastructure layers → Foundation ready
2. **MVP** (Phase 3): User Story 1 → Test independently → Deploy/Demo (fast 30-day load!)
3. **Enhancement 1** (Phase 4): User Story 2 → Test independently → Deploy/Demo (add background loading)
4. **Enhancement 2** (Phase 5): User Story 3 → Test independently → Deploy/Demo (add date range selection)
5. **Optimization** (Phase 6): User Story 4 → Test independently → Deploy/Demo (advanced caching)
6. **Polish** (Phase 7): Cross-cutting improvements → Final validation → Production ready

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. **Week 1**: Team completes Setup + Foundational together (Phases 1-2)
2. **Week 2** (once Foundational is done):
   - Developer A: User Story 1 (Phase 3)
   - Developer B: User Story 2 (Phase 4) - starts with use case planning
   - Developer C: User Story 3 (Phase 5) - starts with UI component design
3. **Week 3**:
   - Developer A: User Story 4 (Phase 6)
   - Developer B: Polish error handling (Phase 7)
   - Developer C: Polish performance optimization (Phase 7)

Stories complete and integrate independently.

---

## Key Architectural Decisions

### No Global State Management

- **Decision**: Use URL params (date range) + component-level useState/useTransition
- **Rationale**: Eliminates Zustand dependency, enables shareable URLs, simpler architecture
- **Implementation**: Server Components read URL params, pass to Client Components as props

### Server/Client Component Boundary

- **Decision**: Server Components for initial 30-day fetch, Client Components for background loading
- **Rationale**: Optimal for Next.js 15 App Router, enables fast first paint with streaming
- **Implementation**:
  - `page.tsx`: Server Component fetches initial data
  - `PRAnalysisClient.tsx`: Client Component receives props, manages background loading with useTransition

### Independent Component Loading

- **Decision**: Each metric component (PRs, deployments) independently manages its own background loading
- **Rationale**: No coordination overhead, components can load at different speeds, simpler state management
- **Implementation**: Each client component has its own useTransition hook for background data

### Hybrid Waterfall Loading

- **Decision**: Parallel initial load (30 days) + chunked background load (90-day batches)
- **Rationale**: Meets 5-second target, prevents rate limit exhaustion, progressive enhancement
- **Implementation**:
  - Phase 1: `Promise.all([fetchPRs, fetchDeployments, fetchCommits])` for 30 days
  - Phase 2: Loop through 90-day chunks with rate limit checks

### Cache-First with Stale-While-Revalidate

- **Decision**: Serve cached data immediately, refresh in background if stale
- **Rationale**: Best UX (instant display), reduced API usage, graceful degradation
- **Implementation**: IndexedDB primary, in-memory fallback for Safari private mode

---

## Performance Targets

| Metric                          | Target | Validation Method                                    |
| ------------------------------- | ------ | ---------------------------------------------------- |
| Initial 30-day load             | <5s    | Network tab timing + `performance.mark()`            |
| Cached data load                | <1s    | IndexedDB get time measurement                       |
| Date range change (cached)      | <500ms | React DevTools Profiler                              |
| Background historical load      | <30s   | Progress tracking in LoadHistoricalData use case     |
| UI interaction during loading   | <200ms | React DevTools Profiler + useTransition verification |
| Skeleton UI display             | <500ms | Suspense fallback render time                        |
| Cache hit rate (repeat visits)  | >70%   | Cache statistics tracking                            |
| API request reduction (caching) | >80%   | Network tab comparison (fresh vs cached)             |

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **[Story] label** = maps task to specific user story for traceability
- Each user story should be **independently completable and testable**
- **No test tasks included** - tests not requested in feature specification
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Avoid**: vague tasks, same file conflicts, cross-story dependencies that break independence
- **Total tasks**: 68 tasks
  - Setup: 4 tasks
  - Foundational: 20 tasks (blocks all stories)
  - US1 (MVP): 10 tasks
  - US2: 7 tasks
  - US3: 8 tasks
  - US4: 9 tasks
  - Polish: 10 tasks

---

## Summary

**Total Tasks**: 68 tasks across 7 phases
**MVP Scope**: Phases 1-3 (34 tasks) = User Story 1 only
**Task Distribution by User Story**:

- User Story 1 (P1): 10 tasks (T025-T034) - Fast initial 30-day load
- User Story 2 (P2): 7 tasks (T035-T041) - Background historical loading
- User Story 3 (P2): 8 tasks (T042-T049) - Custom date range selection
- User Story 4 (P3): 9 tasks (T050-T058) - Advanced caching with stale-while-revalidate

**Parallel Opportunities Identified**:

- Foundational phase: 15 parallel tasks possible
- User Story 1: 5 parallel tasks possible
- User Story 2: 2 parallel tasks possible
- User Story 4: 3 parallel tasks possible
- Polish phase: 8 parallel tasks possible

**Suggested MVP Scope**: Complete Phases 1-3 only (User Story 1)

- Delivers core value: fast initial load with caching
- 34 tasks total for MVP
- Remaining 34 tasks add progressive enhancements

**Format Validation**: ✅ ALL tasks follow checklist format with checkboxes, IDs, labels, and file paths
