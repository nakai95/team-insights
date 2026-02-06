# Tasks: DORA Metrics - Deployment Frequency

**Input**: Design documents from `/specs/006-dora-deployment-frequency/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Domain tests are MANDATORY per constitution (80%+ coverage). Application tests are RECOMMENDED. E2E test for critical path included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project structure**: `src/`, `tests/` at repository root
- TypeScript 5.3 with Next.js 15 App Router
- Clean architecture layering: domain → application → infrastructure → presentation

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Validate environment and prepare for implementation

- [x] T001 Verify all dependencies are installed (`@octokit/graphql`, `recharts`, `zod`)
- [x] T002 [P] Confirm TypeScript strict mode enabled in `tsconfig.json`
- [x] T003 [P] Verify test configuration in `vitest.config.ts` and `playwright.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain and infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Domain Interfaces

- [x] T004 Extend `IGitHubRepository` interface in `src/domain/interfaces/IGitHubRepository.ts` with `Release`, `Deployment`, `Tag` types and `getReleases()`, `getDeployments()`, `getTags()` method signatures

### Infrastructure - GraphQL Queries

- [x] T005 [P] Create GraphQL query for releases in `src/infrastructure/github/graphql/releases.ts` with `RELEASES_QUERY` and `GitHubGraphQLReleasesResponse` type
- [x] T006 [P] Create GraphQL query for deployments in `src/infrastructure/github/graphql/deployments.ts` with `DEPLOYMENTS_QUERY` and `GitHubGraphQLDeploymentsResponse` type
- [x] T007 [P] Create GraphQL query for tags in `src/infrastructure/github/graphql/tags.ts` with `TAGS_QUERY` and `GitHubGraphQLTagsResponse` type

### Infrastructure - Data Mappers

- [x] T008 [P] Add `mapRelease()` mapper function in `src/infrastructure/github/mappers/graphqlMappers.ts`
- [x] T009 [P] Add `mapDeployment()` mapper function in `src/infrastructure/github/mappers/graphqlMappers.ts`
- [x] T010 [P] Add `mapTag()` mapper function in `src/infrastructure/github/mappers/graphqlMappers.ts`

### Infrastructure - OctokitAdapter Extensions

- [x] T011 Implement `getReleases()` method in `src/infrastructure/github/OctokitAdapter.ts` with pagination and rate limiting
- [x] T012 Implement `getDeployments()` method in `src/infrastructure/github/OctokitAdapter.ts` with pagination and rate limiting
- [x] T013 Implement `getTags()` method in `src/infrastructure/github/OctokitAdapter.ts` with pagination and rate limiting

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Deployment Frequency Dashboard (Priority: P1) 🎯 MVP

**Goal**: Enable team leads to see deployment frequency aggregated by week and month with average statistics

**Independent Test**: Navigate to analysis dashboard → select Deployment Frequency tab → verify deployment counts are displayed for the selected time period with weekly and monthly aggregations

### Domain Layer - Value Objects

- [x] T014 [P] [US1] Create `DeploymentEvent` value object in `src/domain/value-objects/DeploymentEvent.ts` with factory methods (`fromRelease`, `fromDeployment`, `fromTag`), validation, and helper methods (`getWeekKey`, `getMonthKey`)
- [x] T015 [P] [US1] Create `DeploymentFrequency` value object in `src/domain/value-objects/DeploymentFrequency.ts` with aggregation logic (weekly/monthly), average calculations, and `create()` factory method
- [x] T016 [P] [US1] Write unit tests for `DeploymentEvent` in `src/domain/value-objects/__tests__/DeploymentEvent.test.ts` (factory methods, normalization, week/month keys)
- [x] T017 [P] [US1] Write unit tests for `DeploymentFrequency` in `src/domain/value-objects/__tests__/DeploymentFrequency.test.ts` (aggregation, averages, annualization)

### Application Layer - Use Case

- [x] T018 [US1] Create `DeploymentFrequencyResult` DTO in `src/application/dto/DeploymentFrequencyResult.ts` with properties matching contract
- [x] T019 [US1] Implement `CalculateDeploymentFrequency` use case in `src/application/use-cases/CalculateDeploymentFrequency.ts` with parallel fetching, deduplication logic, and aggregation
- [x] T020 [US1] Write unit tests for `CalculateDeploymentFrequency` in `src/application/use-cases/__tests__/CalculateDeploymentFrequency.test.ts` with mocked GitHub repository

### Presentation Layer - Components

- [x] T021 [P] [US1] Create `DeploymentSummaryCards` component in `src/presentation/components/analysis/DeploymentSummaryCards.tsx` displaying total deployments, avg/week, avg/month, period days
- [x] T022 [P] [US1] Create `DeploymentFrequencyChart` component in `src/presentation/components/analysis/DeploymentFrequencyChart.tsx` with Recharts LineChart for weekly data
- [x] T023 [P] [US1] Create `DeploymentBarChart` component in `src/presentation/components/analysis/DeploymentBarChart.tsx` with Recharts BarChart for monthly data
- [x] T024 [US1] Create `DeploymentFrequencyTab` component in `src/presentation/components/analysis/DeploymentFrequencyTab.tsx` integrating summary cards and charts
- [x] T025 [US1] Extend `AnalysisTabs` component in `src/presentation/components/analysis/AnalysisTabs.tsx` to add "Deployment Frequency" tab with URL parameter support

### Integration

- [x] T026 [US1] Add deployment frequency analysis to `AnalyzeRepository` use case in `src/application/use-cases/AnalyzeRepository.ts` (optional flag)
- [x] T027 [US1] Update `analyzeRepository` server action in `src/app/actions/analyzeRepository.ts` to include deployment frequency data

### E2E Testing

- [x] T028 [US1] Create E2E test in `tests/e2e/deployment-frequency.spec.ts` for critical path (navigate to tab, verify data displayed)

**Checkpoint**: At this point, User Story 1 should be fully functional - users can view deployment frequency dashboard with weekly/monthly aggregations

---

## Phase 4: User Story 2 - Compare Against DORA Benchmarks (Priority: P2)

**Goal**: Display DORA performance level classification (Elite/High/Medium/Low) based on deployment frequency

**Independent Test**: View deployment frequency dashboard → verify DORA performance level is clearly displayed with color coding and benchmark range

### Domain Layer - DORA Classification

- [ ] T029 [P] [US2] Create `DORAPerformanceLevel` value object in `src/domain/value-objects/DORAPerformanceLevel.ts` with classification logic (Elite: ≥730/year, High: 52-729/year, Medium: 12-51/year, Low: <12/year), display colors, and improvement suggestions
- [ ] T030 [P] [US2] Write unit tests for `DORAPerformanceLevel` in `src/domain/value-objects/__tests__/DORAPerformanceLevel.test.ts` covering all threshold boundaries

### Application Layer - Integration

- [ ] T031 [US2] Extend `DeploymentFrequency` value object in `src/domain/value-objects/DeploymentFrequency.ts` to add `calculateDORALevel()` method
- [ ] T032 [US2] Update `DeploymentFrequencyResult` DTO in `src/application/dto/DeploymentFrequencyResult.ts` to include `doraLevel` property
- [ ] T033 [US2] Update `CalculateDeploymentFrequency` use case in `src/application/use-cases/CalculateDeploymentFrequency.ts` to calculate and include DORA level in result

### Presentation Layer - DORA Indicator

- [ ] T034 [US2] Create `DORABenchmarkCard` component in `src/presentation/components/analysis/DORABenchmarkCard.tsx` with performance level badge, description, benchmark range, and improvement suggestions
- [ ] T035 [US2] Integrate `DORABenchmarkCard` into `DeploymentFrequencyTab` component in `src/presentation/components/analysis/DeploymentFrequencyTab.tsx`

### Testing

- [ ] T036 [US2] Update E2E test in `tests/e2e/deployment-frequency.spec.ts` to verify DORA level is displayed with correct classification

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can view deployment frequency with DORA benchmark comparison

---

## Phase 5: User Story 3 - Analyze Deployment Trends Over Time (Priority: P3)

**Goal**: Enable visualization of deployment trends over time with weekly line chart showing trend lines

**Independent Test**: View deployment frequency data over 6 months → verify weekly trend chart shows clear upward/downward trends with visual indicators

### Domain Layer - Trend Analysis

- [ ] T037 [P] [US3] Add trend detection methods to `DeploymentFrequency` value object in `src/domain/value-objects/DeploymentFrequency.ts` (calculate moving average, identify trend direction)
- [ ] T038 [P] [US3] Write unit tests for trend detection in `src/domain/value-objects/__tests__/DeploymentFrequency.test.ts` (upward trend, downward trend, stable)

### Presentation Layer - Enhanced Visualizations

- [ ] T039 [US3] Enhance `DeploymentFrequencyChart` component in `src/presentation/components/analysis/DeploymentFrequencyChart.tsx` to add moving average trend line and trend indicators
- [ ] T040 [US3] Add date range filter component to `DeploymentFrequencyTab` in `src/presentation/components/analysis/DeploymentFrequencyTab.tsx` to enable time period selection
- [ ] T041 [US3] Update chart responsiveness in `DeploymentFrequencyChart` and `DeploymentBarChart` for mobile devices

### Testing

- [ ] T042 [US3] Update E2E test in `tests/e2e/deployment-frequency.spec.ts` to verify trend visualization and date range filtering

**Checkpoint**: All user stories should now be independently functional - complete deployment frequency analysis with trends

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

### Error Handling & Edge Cases

- [ ] T043 [P] Add "No deployment data" empty state to `DeploymentFrequencyTab` component with helpful guidance
- [ ] T044 [P] Add loading states to all charts in `DeploymentFrequencyChart` and `DeploymentBarChart`
- [ ] T045 [P] Add error boundaries to `DeploymentFrequencyTab` component for graceful error handling

### Performance Optimization

- [ ] T046 [P] Add memoization to chart components using `React.memo` in `DeploymentFrequencyChart` and `DeploymentBarChart`
- [ ] T047 [P] Verify performance with 500 deployment events (test with large repository like kubernetes/kubernetes)

### Documentation & Code Quality

- [ ] T048 [P] Update `CLAUDE.md` with Deployment Frequency feature documentation and DORA metrics integration
- [ ] T049 [P] Run linter and fix any issues (`pnpm lint:fix`)
- [ ] T050 [P] Run type checker and fix any issues (`pnpm type-check`)
- [ ] T051 Run all tests and ensure passing (`pnpm test && pnpm test:e2e`)

### Infrastructure Tests (RECOMMENDED)

- [ ] T052 [P] Add tests for `OctokitAdapter` new methods in `src/infrastructure/github/__tests__/OctokitAdapter.test.ts` (getReleases, getDeployments, getTags with mocked GraphQL responses)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories ✅
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 but independently testable ✅
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Enhances US1 visualizations but independently testable ✅

### Within Each User Story

1. **Domain Layer First**: Value objects with tests (can be parallel if different files)
2. **Application Layer**: Use cases and DTOs (depends on domain layer)
3. **Presentation Layer**: Components (can be parallel if different files)
4. **Integration**: Wire up to existing features
5. **E2E Tests**: Verify end-to-end flow

### Parallel Opportunities

#### Phase 2 (Foundational):

- T005, T006, T007 (GraphQL queries - different files)
- T008, T009, T010 (Mappers - same file, sequential)
- T011, T012, T013 (OctokitAdapter methods - same file, sequential)

#### Phase 3 (User Story 1):

- T014, T015 (Value objects - different files)
- T016, T017 (Value object tests - different files)
- T021, T022, T023 (UI components - different files)

#### Phase 4 (User Story 2):

- T029, T030 (DORA value object and tests - can run in parallel)

#### Phase 5 (User Story 3):

- T037, T038 (Trend analysis and tests - can run in parallel)

#### Phase 6 (Polish):

- T043, T044, T045 (Error handling - different files)
- T046, T047 (Performance - can run together)
- T048, T049, T050 (Documentation and tooling - different files)

---

## Parallel Example: User Story 1

```bash
# Launch all value objects for User Story 1 together:
Task: "Create DeploymentEvent value object in src/domain/value-objects/DeploymentEvent.ts"
Task: "Create DeploymentFrequency value object in src/domain/value-objects/DeploymentFrequency.ts"

# Launch all value object tests together:
Task: "Write unit tests for DeploymentEvent in src/domain/value-objects/__tests__/DeploymentEvent.test.ts"
Task: "Write unit tests for DeploymentFrequency in src/domain/value-objects/__tests__/DeploymentFrequency.test.ts"

# Launch all UI components together:
Task: "Create DeploymentSummaryCards component in src/presentation/components/analysis/DeploymentSummaryCards.tsx"
Task: "Create DeploymentFrequencyChart component in src/presentation/components/analysis/DeploymentFrequencyChart.tsx"
Task: "Create DeploymentBarChart component in src/presentation/components/analysis/DeploymentBarChart.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T013) - CRITICAL
3. Complete Phase 3: User Story 1 (T014-T028)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

**Estimated Time**: 2 days
**Deliverable**: Working deployment frequency dashboard with weekly/monthly aggregations

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (+ DORA benchmarks)
4. Add User Story 3 → Test independently → Deploy/Demo (+ trend analysis)
5. Each story adds value without breaking previous stories

**Estimated Time**: 3 days total (MVP in 2 days)

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (4-6 hours)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (full dashboard) - 1 day
   - **Developer B**: User Story 2 (DORA benchmarks) - 4 hours
   - **Developer C**: User Story 3 (trend analysis) - 4 hours
3. Stories complete and integrate independently

---

## Success Criteria Verification

| Criterion                         | How to Verify                                                                   | Related Tasks              |
| --------------------------------- | ------------------------------------------------------------------------------- | -------------------------- |
| **SC-001**: Load time <2s         | Use browser DevTools Network tab to measure time from tab click to data display | T027 (integration)         |
| **SC-002**: Support 500 events    | Test with kubernetes/kubernetes repository (large deployment history)           | T047 (performance test)    |
| **SC-003**: DORA level visible    | Check UI without reading documentation - level should be immediately obvious    | T034-T035 (DORA card)      |
| **SC-004**: 95% accuracy          | Manually count releases in a test repository and compare with dashboard         | T019 (use case logic)      |
| **SC-005**: Trends understandable | User testing with non-technical stakeholders viewing trend charts               | T039 (trend visualization) |
| **SC-006**: Handle no data        | Test with repository without releases/tags, verify helpful message displayed    | T043 (empty state)         |

---

## Notes

- **[P]** tasks = different files, no dependencies - can run in parallel
- **[Story]** label maps task to specific user story for traceability
- **Domain tests are MANDATORY** per constitution (80%+ coverage)
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **MVP = User Story 1 only** (T001-T028) - delivers core value in 2 days
- **Total Tasks**: 52 tasks (Setup: 3, Foundational: 10, US1: 15, US2: 8, US3: 6, Polish: 10)
