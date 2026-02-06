# Tasks: Progressive Data Loading

**Input**: Design documents from `/specs/007-progressive-loading/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the feature specification. Test tasks are included as optional checkpoints but can be deferred to Phase 7 polish if needed for faster delivery.

**Organization**: Tasks are grouped by user story (US1-US4) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

All paths are relative to repository root:

- `src/domain/` - Business logic (entities, value objects, interfaces)
- `src/application/` - Use cases
- `src/infrastructure/` - External dependencies (IndexedDB, GraphQL, Zustand)
- `src/presentation/` - React components and hooks

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and basic configuration

- [ ] T001 Install dependencies: `pnpm add idb zustand` for IndexedDB wrapper and state management
- [ ] T002 Install dev dependencies: `pnpm add -D @types/fake-indexeddb fake-indexeddb` for testing IndexedDB operations
- [ ] T003 [P] Create domain types directory structure: `src/domain/types/`
- [ ] T004 [P] Create domain value-objects directory structure: `src/domain/value-objects/`
- [ ] T005 [P] Create domain entities directory structure: `src/domain/entities/`
- [ ] T006 [P] Create domain repositories directory structure: `src/domain/repositories/`
- [ ] T007 [P] Create application use-cases directory structure: `src/application/use-cases/`
- [ ] T008 [P] Create infrastructure cache directory structure: `src/infrastructure/cache/`
- [ ] T009 [P] Create infrastructure stores directory structure: `src/infrastructure/stores/`
- [ ] T010 [P] Create presentation hooks directory structure: `src/presentation/hooks/`
- [ ] T011 [P] Create presentation components directory structure: `src/presentation/components/progressive-loading/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain types and shared infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Core Domain Types

- [ ] T012 [P] Create string literal enum types in `src/domain/types/LoadingTypes.ts`: DataType, StreamType, LoadingStatus, LoadingType, CacheStatus, DateRangePreset (using mandatory pattern: `export const X = {...} as const`)
- [ ] T013 [P] Create Result type helper in `src/domain/types/Result.ts` if not already exists (Result<T> for success/failure operations)

### Base Repository Interfaces

- [ ] T014 [P] Create ICacheRepository interface in `src/domain/repositories/ICacheRepository.ts`: get(), set(), delete(), clearRepository(), clearAll(), getAll(), getStats() methods
- [ ] T015 [P] Create IDataLoader interface in `src/domain/repositories/IDataLoader.ts`: fetchPRs(), fetchDeployments(), fetchCommits() methods with AbortSignal support
- [ ] T016 [P] Create ILoadingStateManager interface in `src/domain/repositories/ILoadingStateManager.ts`: getState(), startLoading(), updateProgress(), completeLoading(), failLoading(), isAnyStreamLoading(), subscribe() methods

### Configuration Constants

- [ ] T017 Create cache configuration constants in `src/infrastructure/cache/CacheConfig.ts`: ACTIVE_REPO_TTL, ARCHIVED_REPO_TTL, MIN_RATE_LIMIT_PERCENTAGE, MAX_CACHE_SIZE, MAX_ENTRIES

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Fast Initial Dashboard Load (Priority: P1) 🎯 MVP

**Goal**: Display recent 30-day metrics within 5 seconds when users open the dashboard, providing immediate feedback without waiting for historical data

**Independent Test**: Open dashboard and verify PR metrics, throughput insights, and deployment frequency for last 30 days display within 5 seconds, even with large repository (500+ PRs)

### Domain Layer for US1

- [ ] T018 [P] [US1] Create DateRange value object in `src/domain/value-objects/DateRange.ts`: create(), last7Days(), last30Days(), last90Days(), last6Months(), lastYear() factory methods, durationDays computed property, contains(), overlaps(), split() methods
- [ ] T019 [P] [US1] Create DateRange unit tests in `src/domain/value-objects/__tests__/DateRange.test.ts`: test validation (end after start), test factory methods, test duration calculation, test contains/overlaps logic
- [ ] T020 [P] [US1] Create CacheKey value object in `src/domain/value-objects/CacheKey.ts`: create() factory, parse() method, format validation (regex), equals() comparison, toString() method
- [ ] T021 [P] [US1] Create CacheKey unit tests in `src/domain/value-objects/__tests__/CacheKey.test.ts`: test format validation, test parsing, test equality comparison
- [ ] T022 [US1] Create CachedDataEntry entity in `src/domain/entities/CachedDataEntry.ts`: create() factory, fromIndexedDB() deserializer, isStale() method, touch() for LRU, Zod schema validation for raw data
- [ ] T023 [US1] Create CachedDataEntry unit tests in `src/domain/entities/__tests__/CachedDataEntry.test.ts`: test creation, test staleness detection, test touch updates lastAccessedAt, test Zod validation

### Infrastructure Layer for US1

- [ ] T024 [US1] Create basic IndexedDBAdapter in `src/infrastructure/cache/IndexedDBAdapter.ts`: implements ICacheRepository, init() method with schema (version 1, objectStore 'cacheEntries', indexes on 'cachedAt' and 'repositoryId'), get() with TTL check, set() with serialization, basic error handling
- [ ] T025 [US1] Create IndexedDB tests in `src/infrastructure/cache/__tests__/IndexedDBAdapter.test.ts`: use fake-indexeddb, test init(), test get/set operations, test TTL expiration, test error handling
- [ ] T026 [US1] Extend GraphQLBatchLoader in `src/infrastructure/api/GraphQLBatchLoader.ts`: add fetchPRs() method with date range filtering (since/until parameters), implement pagination, add AbortSignal support, map GraphQL response to PullRequest[]
- [ ] T027 [US1] Extend GraphQLBatchLoader for deployments/commits: add fetchDeployments() and fetchCommits() methods with same date range and AbortSignal patterns

### Application Layer for US1

- [ ] T028 [US1] Create LoadInitialData use case in `src/application/use-cases/LoadInitialData.ts`: constructor with ICacheRepository, IDataLoader dependencies, execute() method: check cache first (last 30 days), if cache miss fetch from API using Promise.all for parallel queries, store results in cache, return Result<InitialData> with prs/deployments/commits
- [ ] T029 [US1] Create LoadInitialData tests in `src/application/use-cases/__tests__/LoadInitialData.test.ts`: mock dependencies, test cache hit path (instant return), test cache miss path (API fetch + cache store), test parallel loading, test error handling, test AbortSignal cancellation

### Presentation Layer for US1

- [ ] T030 [US1] Create LoadingIndicator component in `src/presentation/components/progressive-loading/LoadingIndicator.tsx`: accept loadingState prop, show spinner for LOADING status, show "Loading recent data (last 30 days)..." message for INITIAL type, show error badge for ERROR status
- [ ] T031 [US1] Create useProgressiveLoading hook in `src/presentation/hooks/useProgressiveLoading.ts`: accept repositoryId param, use LoadInitialData use case, useState for initialData, useRef for AbortController, useEffect to load on mount and cleanup on unmount, return { initialData, loadingState, error }
- [ ] T032 [US1] Integrate useProgressiveLoading into existing dashboard page: import hook, replace existing full-load logic with progressive loading, display LoadingIndicator during initial load, pass initialData to existing chart components

**Checkpoint**: User Story 1 complete - dashboard shows 30-day data within 5 seconds

---

## Phase 4: User Story 2 - Background Historical Data Loading (Priority: P2)

**Goal**: Automatically load historical data beyond 30 days in background after initial display, without blocking user interaction

**Independent Test**: Load dashboard, verify 30-day data appears first within 5s, then confirm historical data (31-365 days) progressively appears in charts without user action, with visual indicator showing background loading progress

### Domain Layer for US2

- [ ] T033 [P] [US2] Create LoadingProgress value object in `src/domain/value-objects/LoadingProgress.ts`: create() factory with currentBatch/totalBatches, percentage computed property (currentBatch/totalBatches \* 100), withETA() method to add estimated time remaining
- [ ] T034 [P] [US2] Create LoadingProgress unit tests in `src/domain/value-objects/__tests__/LoadingProgress.test.ts`: test percentage calculation, test validation (currentBatch <= totalBatches), test ETA computation
- [ ] T035 [US2] Create LoadingState entity in `src/domain/entities/LoadingState.ts`: factory methods: idle(), startInitial(), startBackground(), updateProgress(), complete(), fail(), enforce status transitions (idle → loading → complete/error), validate progress updates only when status is LOADING
- [ ] T036 [US2] Create LoadingState unit tests in `src/domain/entities/__tests__/LoadingState.test.ts`: test status transitions, test progress updates, test error state handling, test immutability (factory methods return new instances)

### Infrastructure Layer for US2

- [ ] T037 [US2] Create ZustandLoadingStore in `src/infrastructure/stores/useProgressiveLoadingStore.ts`: create store with devtools middleware, state: Record<StreamType, LoadingState>, actions: startLoading(), updateProgress(), completeLoading(), failLoading(), implement fine-grained selectors to prevent unnecessary re-renders
- [ ] T038 [US2] Create ZustandLoadingManager adapter in `src/infrastructure/stores/ZustandLoadingManager.ts`: implements ILoadingStateManager, wrap Zustand store methods, provide getState(), startLoading(), updateProgress(), completeLoading(), failLoading(), isAnyStreamLoading(), subscribe() implementations
- [ ] T039 [US2] Create DateRangeQueryBuilder utility in `src/infrastructure/api/DateRangeQueryBuilder.ts`: splitIntoChunks() method to divide date range into 90-day batches, buildChunkQueries() to generate GraphQL queries for each chunk

### Application Layer for US2

- [ ] T040 [US2] Create LoadHistoricalData use case in `src/application/use-cases/LoadHistoricalData.ts`: constructor with ICacheRepository, IDataLoader, ILoadingStateManager dependencies, execute() method: split 31-365 days into chunks (31-120, 121-210, 211-365), iterate chunks with for loop, check AbortSignal before each iteration, use Promise.all for parallel queries within each chunk, update progress after each chunk, check rate limit status before continuing, invoke onProgress callback with partial data, mark streams complete when done
- [ ] T041 [US2] Create LoadHistoricalData tests in `src/application/use-cases/__tests__/LoadHistoricalData.test.ts`: mock dependencies, test chunked loading (3 batches), test progress updates, test rate limit awareness (pause when low), test AbortSignal cancellation mid-load, test onProgress callback invocation

### Presentation Layer for US2

- [ ] T042 [US2] Update LoadingIndicator component: add support for BACKGROUND loading type, show subtle "Loading historical data... (X%)" message, add progress bar for background loading, ensure UI doesn't block during background load
- [ ] T043 [US2] Update useProgressiveLoading hook: add useTransition for non-blocking state updates, after LoadInitialData completes invoke LoadHistoricalData, use startTransition to wrap historicalData state updates, subscribe to Zustand loading states for progress tracking, return { initialData, historicalData, loadingStates, isPending, isBackgroundLoading }
- [ ] T044 [US2] Update dashboard integration: merge initialData and historicalData for chart display, show background loading indicator, ensure charts auto-update when new historical batches arrive, verify UI remains responsive (<200ms interactions) during background load

**Checkpoint**: User Story 2 complete - historical data loads automatically in background without blocking UI

---

## Phase 5: User Story 3 - Custom Date Range Selection (Priority: P2)

**Goal**: Allow users to select custom date ranges (last 7/30/90 days, 6 months, 1 year, custom) for analyzing metrics during specific time periods

**Independent Test**: Select different date range presets (last 7/30/90 days, custom) and verify data loads from cache if available or fetches from API if needed, with instant display for cached data

### Domain Layer for US3

- [ ] T045 [P] [US3] Create DateRangeSelection entity in `src/domain/entities/DateRangeSelection.ts`: factory methods: fromPreset() to create from DateRangePreset enum, fromCustomRange() for custom start/end dates, withCacheStatus() to update cache metadata, validate preset and range synchronization, compute cacheStatus based on TTL
- [ ] T046 [P] [US3] Create DateRangeSelection unit tests in `src/domain/entities/__tests__/DateRangeSelection.test.ts`: test preset creation (preset matches range), test custom range creation, test cache status computation, test validation

### Application Layer for US3

- [ ] T047 [US3] Create ChangeDataRange use case in `src/application/use-cases/ChangeDataRange.ts`: constructor with ICacheRepository, IDataLoader dependencies, execute() method: accept DateRangeSelection, check cache for requested range, if cache hit return instantly with data and HIT_FRESH status, if cache miss fetch from API, store in cache, return data with MISS status, handle partial cache hits (some chunks cached, some not)
- [ ] T048 [US3] Create ChangeDataRange tests in `src/application/use-cases/__tests__/ChangeDataRange.test.ts`: mock dependencies, test cache hit path (<500ms), test cache miss path (fetch + store), test partial cache hits, test error handling

### Presentation Layer for US3

- [ ] T049 [US3] Install shadcn/ui calendar component: run `npx shadcn-ui@latest add calendar`
- [ ] T050 [US3] Create DateRangePicker component in `src/presentation/components/progressive-loading/DateRangePicker.tsx`: copy date-range-picker from https://github.com/johnpolackin/date-range-picker-for-shadcn, customize presets (Last 7/30/90 days, 6 months, 1 year, Custom), integrate with next-themes for dark mode support, emit onChange event with DateRangeSelection
- [ ] T051 [US3] Create useDateRangeSelection hook in `src/presentation/hooks/useDateRangeSelection.ts`: useState for selected range, default to last 30 days, handle preset changes, handle custom range changes, invoke ChangeDataRange use case when range changes, return { selectedRange, setRange, isLoading, data }
- [ ] T052 [US3] Integrate DateRangePicker into dashboard: add above chart section, connect to useDateRangeSelection hook, update charts when range changes, preserve selected range in URL query params for shareable links

**Checkpoint**: User Story 3 complete - users can select custom date ranges with instant cached data display

---

## Phase 6: User Story 4 - Client-Side Data Caching (Priority: P3)

**Goal**: Cache previously loaded data locally so subsequent visits and date range changes are instant without re-fetching from GitHub API

**Independent Test**: Load dashboard, close browser, reopen within 24 hours, verify previously loaded data displays instantly without GitHub API calls (confirm via network inspector), check stale indicators for data older than 1 hour

### Infrastructure Layer for US4

- [ ] T053 [US4] Implement LRU eviction in IndexedDBAdapter: add evictIfNeeded() private method, call after set(), fetch all entries sorted by lastAccessedAt, if count > MAX_ENTRIES remove oldest 10%, implement getAll() to fetch all entries for eviction logic
- [ ] T054 [US4] Implement cache size management in IndexedDBAdapter: add getStats() method returning totalEntries/totalSizeBytes/oldestEntry/newestEntry, check storage quota using navigator.storage.estimate(), trigger eviction when approaching 90% of quota
- [ ] T055 [US4] Create InMemoryCacheAdapter fallback in `src/infrastructure/cache/InMemoryCacheAdapter.ts`: implements ICacheRepository, use Map for storage, implement same interface as IndexedDBAdapter, use for Safari private mode or IndexedDB failures
- [ ] T056 [US4] Update IndexedDBAdapter initialization: wrap init() with try-catch, if IndexedDB fails (Safari private mode, quota exceeded) log warning and fall back to InMemoryCacheAdapter, ensure graceful degradation
- [ ] T057 [US4] Implement cache statistics tracking: add getStats() to return cache hit rate, total size, entry count, oldest/newest timestamps, expose via ILoadingStateManager for debugging

### Application Layer for US4

- [ ] T058 [US4] Create GetCachedData use case in `src/application/use-cases/GetCachedData.ts`: constructor with ICacheRepository, execute() method: fetch from cache by CacheKey, check staleness, return Result with data + cache status (HIT_FRESH, HIT_STALE, MISS), touch entry for LRU
- [ ] T059 [US4] Create RefreshData use case in `src/application/use-cases/RefreshData.ts`: constructor with ICacheRepository, IDataLoader dependencies, execute() method: bypass cache, fetch fresh data from API, update cache with new data and reset TTL, return Result with fresh data
- [ ] T060 [US4] Implement stale-while-revalidate pattern in LoadInitialData: if cached data exists but isStale(), return cached data immediately with HIT_STALE status, trigger background revalidation (fetch fresh data without blocking), update cache and notify UI when fresh data arrives
- [ ] T061 [US4] Add rate limit awareness to background revalidation: check GitHub API rate limit status before revalidating, if remaining < MIN_RATE_LIMIT_PERCENTAGE (10%) pause revalidation, resume when rate limit resets, show appropriate status message to user

### Presentation Layer for US4

- [ ] T062 [US4] Create CacheStatusBadge component in `src/presentation/components/progressive-loading/CacheStatusBadge.tsx`: accept cacheStatus and lastUpdated props, show "Fresh" badge for HIT_FRESH, show "Stale (updated Xh ago)" badge for HIT_STALE with warning color, show "Refreshing..." badge for REVALIDATING with spinner
- [ ] T063 [US4] Add manual refresh button to dashboard: show when data is stale (HIT_STALE or older than 2 hours), onClick invoke RefreshData use case, show loading state during refresh, update charts when fresh data arrives
- [ ] T064 [US4] Update useProgressiveLoading hook for stale-while-revalidate: check cache first, if stale serve cached data immediately, trigger background revalidation, subscribe to revalidation completion, update state when fresh data arrives, return { data, cacheStatus, isRevalidating }
- [ ] T065 [US4] Add cache management UI: implement clearRepository() button to clear cache for current repo, implement clearAll() button to clear entire cache (with confirmation), show cache statistics (size, entry count, hit rate) in debug panel

**Checkpoint**: User Story 4 complete - cached data enables instant subsequent visits and reduces API usage by 80%

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Testing, documentation, and improvements affecting multiple user stories

### E2E Testing

- [ ] T066 [P] Create E2E test for initial load in `tests/e2e/progressive-loading/initial-load.spec.ts`: use Playwright, navigate to dashboard, verify 30-day metrics display within 5 seconds, verify loading indicator shows during load, verify charts render correctly
- [ ] T067 [P] Create E2E test for background loading in `tests/e2e/progressive-loading/background-load.spec.ts`: verify initial 30-day data appears first, verify background loading indicator shows, verify historical data progressively appears in charts, verify UI remains responsive during background load
- [ ] T068 [P] Create E2E test for cache retrieval in `tests/e2e/progressive-loading/cache.spec.ts`: load dashboard, close and reopen browser, verify cached data displays instantly (<1s), verify no GitHub API calls via network inspector, verify stale indicator shows for old data

### Documentation

- [ ] T069 [P] Update CLAUDE.md with progressive loading technologies: add IndexedDB/idb entry, add Zustand state management entry, document cache configuration constants
- [ ] T070 [P] Create progressive loading user guide in `docs/progressive-loading.md`: explain cache behavior, document date range selection, show manual refresh option, explain stale data indicators

### Performance Optimization

- [ ] T071 Optimize React.memo usage in chart components: wrap PRSizeDistributionChart, PRChangesChart, DeploymentFrequencyChart with React.memo to prevent unnecessary re-renders during background loading
- [ ] T072 Add performance monitoring: use performance.mark() and performance.measure() in LoadInitialData and LoadHistoricalData use cases, log timing metrics to console in development, track initial load time, background load time, cache retrieval time
- [ ] T073 Optimize IndexedDB batch operations: use transaction() for multiple set() operations, implement bulk get/set methods for loading multiple cache entries, reduce IndexedDB overhead

### Code Quality

- [ ] T074 Run full test suite: `pnpm test` to verify all unit tests pass, ensure domain layer has 80%+ coverage
- [ ] T075 Run type checking: `pnpm type-check` to verify no TypeScript errors
- [ ] T076 Run linting: `pnpm lint` to verify ESLint rules pass
- [ ] T077 Validate quickstart.md: follow implementation guide step-by-step, verify all code examples work, ensure phase structure matches actual implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - MVP delivery target
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion (uses LoadInitialData)
- **User Story 3 (Phase 5)**: Depends on User Story 1 completion (uses same cache infrastructure)
- **User Story 4 (Phase 6)**: Depends on User Stories 1-3 completion (enhances existing caching)
- **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories ✅ INDEPENDENT
- **User Story 2 (P2)**: Builds on US1 (reuses LoadInitialData, extends with background loading) ⚠️ SEQUENTIAL
- **User Story 3 (P2)**: Can start after US1 complete (reuses cache infrastructure) ⚠️ SEQUENTIAL
- **User Story 4 (P3)**: Enhances US1-3 (adds LRU eviction, stale-while-revalidate, manual refresh) ⚠️ SEQUENTIAL

### Within Each User Story

- Domain layer tasks ([P] marked) can run in parallel
- Infrastructure tasks typically sequential (depend on domain)
- Application tasks depend on domain + infrastructure
- Presentation tasks depend on application layer
- Tests can run in parallel with implementation (TDD approach)

### Parallel Opportunities

**Phase 1 Setup**: All directory creation tasks (T003-T011) can run in parallel
**Phase 2 Foundational**: Enum types (T012), Result type (T013), all 3 repository interfaces (T014-T016) can run in parallel
**User Story 1 Domain**: DateRange (T018-T019), CacheKey (T020-T021) can run in parallel
**User Story 2 Domain**: LoadingProgress (T033-T034), LoadingState (T035-T036) can run in parallel
**User Story 3 Domain**: DateRangeSelection and tests (T045-T046) can run in parallel
**Phase 7 E2E Tests**: All 3 E2E tests (T066-T068) can run in parallel
**Phase 7 Documentation**: All doc tasks (T069-T070) can run in parallel

---

## Parallel Example: User Story 1 Domain Layer

```bash
# Launch all domain value objects for User Story 1 together:
Task: "Create DateRange value object in src/domain/value-objects/DateRange.ts"
Task: "Create DateRange unit tests in src/domain/value-objects/__tests__/DateRange.test.ts"
Task: "Create CacheKey value object in src/domain/value-objects/CacheKey.ts"
Task: "Create CacheKey unit tests in src/domain/value-objects/__tests__/CacheKey.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T011)
2. Complete Phase 2: Foundational (T012-T017) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T018-T032)
4. **STOP and VALIDATE**: Test initial 30-day load <5s target
5. Deploy/demo MVP (fast initial dashboard load)

**Estimated Timeline**: 5-7 days for MVP (Phases 1-3)

### Incremental Delivery

1. MVP: Setup + Foundational + US1 → Initial 30-day load <5s ✅
2. US2: Add background historical loading → Full year of data without blocking UI ✅
3. US3: Add custom date range selection → Flexible time period analysis ✅
4. US4: Add advanced caching → 80% API reduction, instant subsequent visits ✅
5. Polish: E2E tests, docs, optimization → Production-ready ✅

**Total Estimated Timeline**: 10-12 days for full feature

### Parallel Team Strategy

With 2-3 developers:

1. **Team completes Setup + Foundational together** (Days 1-2)
2. **Developer A: User Story 1** (Days 3-5) - MVP delivery
3. **Once US1 complete, parallel development:**
   - Developer A: User Story 2 (background loading)
   - Developer B: User Story 3 (date range picker)
4. **Developer A or B: User Story 4** (caching enhancements)
5. **All developers: Polish phase** (E2E tests, docs)

**Parallel Timeline**: 8-10 days with 2-3 developers

---

## Notes

- **[P] markers**: Tasks marked [P] touch different files with no dependencies, safe to run in parallel
- **[Story] labels**: Map each task to specific user story (US1-US4) for traceability and independent testing
- **Tests are optional**: Tests included for quality but can be deferred to Phase 7 if faster delivery needed
- **MVP focus**: User Story 1 (Phase 3) is the minimum viable product - delivers core value proposition
- **Constitutional compliance**: All tasks follow clean architecture (domain → application → infrastructure → presentation), string literal enum pattern, tests in `__tests__/` directories
- **Commit strategy**: Commit after each task or logical group of parallel tasks
- **Validation checkpoints**: Stop after each user story phase to independently test that story
- **Performance targets**: Initial load <5s (US1), cache retrieval <1s (US4), date range change <500ms (US3), background load <30s (US2)

---

## Success Metrics

**User Story 1 (MVP)**:

- ✅ Initial 30-day dashboard load completes within 5 seconds (500 PRs)
- ✅ Loading indicator shows during initial load
- ✅ All charts render correctly with 30-day data

**User Story 2**:

- ✅ Historical data loads in background without blocking UI
- ✅ Background loading completes within 30 seconds (2000 PRs/year)
- ✅ UI remains responsive (<200ms interactions) during background load
- ✅ Charts auto-update when new historical batches arrive

**User Story 3**:

- ✅ Date range selector shows 6 preset options + custom
- ✅ Cached date range changes complete within 500ms
- ✅ Uncached date range changes show loading indicator and fetch from API

**User Story 4**:

- ✅ Subsequent visits display cached data within 1 second
- ✅ Cache hit rate exceeds 70% for repeat users
- ✅ Stale data indicators show for data older than 1 hour
- ✅ Manual refresh updates cache with fresh data
- ✅ GitHub API request count reduces by 80% for repeat users

**Overall Feature**:

- ✅ All E2E tests pass (initial load, background load, cache retrieval)
- ✅ Domain layer test coverage >80%
- ✅ TypeScript strict mode with no errors
- ✅ ESLint passes with no violations
- ✅ Performance targets met for all user stories
