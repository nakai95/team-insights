# Tasks: PR Throughput Analysis

**Input**: Design documents from `/specs/003-pr-throughput-analysis/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: All domain and application layer tests are MANDATORY (as per constitution requirement for 80%+ coverage)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

All paths are relative to repository root: `/Users/nakai/work/private/team-insights/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure - No new setup required for this feature

✅ **SKIPPED**: This feature builds on existing infrastructure. No setup tasks needed.

**Checkpoint**: Setup phase complete - proceed to foundational work

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain layer entities and value objects that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Domain Value Objects & Entities

- [x] T001 [P] Create PRThroughputData value object in src/domain/value-objects/PRThroughputData.ts
- [x] T002 [P] Create PRThroughputData test file in src/domain/value-objects/**tests**/PRThroughputData.test.ts
- [x] T003 [P] Create SizeBucket value object in src/domain/value-objects/SizeBucket.ts
- [x] T004 [P] Create SizeBucket test file in src/domain/value-objects/**tests**/SizeBucket.test.ts
- [x] T005 [P] Create ThroughputInsight value object in src/domain/value-objects/ThroughputInsight.ts
- [x] T006 [P] Create ThroughputInsight test file in src/domain/value-objects/**tests**/ThroughputInsight.test.ts
- [x] T007 Create PRThroughput entity in src/domain/entities/PRThroughput.ts (depends on T001, T003, T005)
- [x] T008 Create PRThroughput test file in src/domain/entities/**tests**/PRThroughput.test.ts (depends on T007)

### Application Layer - Use Cases & DTOs

- [x] T009 Create ThroughputResult DTO in src/application/dto/ThroughputResult.ts (depends on T007)
- [x] T010 Create CalculateThroughputMetrics use case in src/application/use-cases/CalculateThroughputMetrics.ts (depends on T007, T009)
- [x] T011 Create CalculateThroughputMetrics test file in src/application/use-cases/**tests**/CalculateThroughputMetrics.test.ts (depends on T010)

### Infrastructure Layer - API Integration

- [x] T012 Extend PullRequest interface in src/domain/interfaces/IGitHubRepository.ts to add mergedAt, additions, deletions, changedFiles fields
- [x] T013 Update OctokitAdapter.getPullRequests() in src/infrastructure/github/OctokitAdapter.ts to fetch detailed PR statistics via pulls.get() for merged PRs (depends on T012)
- [x] T014 Update OctokitAdapter tests in src/infrastructure/github/**tests**/OctokitAdapter.test.ts to verify new throughput fields (depends on T013)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View PR Lead Time Summary (Priority: P1) 🎯 MVP

**Goal**: Display basic throughput metrics (average, median, total count) so team leads can understand merge velocity at a glance

**Independent Test**: Access dashboard and verify average lead time, median lead time, and total merged PR count are displayed. Handles empty state gracefully.

**Value**: Provides immediate insight into team velocity without requiring any analysis

### Implementation for User Story 1

- [ ] T015 [US1] Extend AnalysisResult DTO in src/application/dto/AnalysisResult.ts to add optional throughput field
- [ ] T016 [US1] Extend AnalyzeRepository use case in src/application/use-cases/AnalyzeRepository.ts to call CalculateThroughputMetrics and populate throughput field (depends on T010, T015)
- [ ] T017 [US1] Create SummaryStats component in src/presentation/components/SummaryStats.tsx to display average, median, and count metrics
- [ ] T018 [US1] Create EmptyState component in src/presentation/components/EmptyState.tsx for no merged PRs scenario
- [ ] T019 [US1] Create PRThroughputSection component in src/presentation/components/PRThroughputSection.tsx with summary stats and empty state handling (depends on T017, T018)
- [ ] T020 [US1] Integrate PRThroughputSection into Dashboard in src/app/[locale]/components/Dashboard.tsx after Review Activity section (depends on T019)

**Checkpoint**: User Story 1 complete - basic metrics visible on dashboard, empty state works

---

## Phase 4: User Story 2 - Analyze PR Size vs Lead Time Relationship (Priority: P2)

**Goal**: Visualize the relationship between PR size and lead time with a scatter plot to identify patterns

**Independent Test**: View scatter plot with PRs plotted by size (x-axis) and lead time (y-axis). Hover over points to see PR details. Verify performance with 1000+ PRs.

**Value**: Enables data-driven decision-making about optimal PR sizes by revealing visual patterns

### Implementation for User Story 2

- [ ] T021 [P] [US2] Create PRSizeVsLeadTimeChart component in src/presentation/components/PRSizeVsLeadTimeChart.tsx using Recharts ScatterChart
- [ ] T022 [P] [US2] Create custom tooltip component for scatter chart showing PR number, size, and lead time
- [ ] T023 [US2] Add React.memo optimization to PRSizeVsLeadTimeChart and disable animations for 500+ data points (depends on T021)
- [ ] T024 [US2] Integrate PRSizeVsLeadTimeChart into PRThroughputSection component in src/presentation/components/PRThroughputSection.tsx (depends on T021, T023)
- [ ] T025 [US2] Add useMemo for scatter data transformation in PRThroughputSection to optimize performance (depends on T024)

**Checkpoint**: User Story 2 complete - scatter plot visible, tooltip works, performs well with large datasets

---

## Phase 5: User Story 3 - Compare Lead Times Across Size Categories (Priority: P3)

**Goal**: Display size bucket analysis (S/M/L/XL) with table and bar chart to compare average lead times across categories

**Independent Test**: View size bucket table showing each bucket's line range, average lead time, PR count, and percentage. View bar chart comparing buckets visually.

**Value**: Provides actionable benchmarks for PR sizing by categorizing data into clear buckets

### Implementation for User Story 3

- [ ] T026 [P] [US3] Create SizeBucketTable component in src/presentation/components/SizeBucketTable.tsx displaying bucket, line range, average lead time, PR count, percentage
- [ ] T027 [P] [US3] Create SizeBucketBarChart component in src/presentation/components/SizeBucketBarChart.tsx using Recharts BarChart
- [ ] T028 [US3] Add logic to highlight optimal bucket in bar chart (if available from insight) in SizeBucketBarChart component (depends on T027)
- [ ] T029 [US3] Create SizeBucketAnalysis wrapper component in src/presentation/components/SizeBucketAnalysis.tsx combining table and bar chart with responsive layout (depends on T026, T027, T028)
- [ ] T030 [US3] Integrate SizeBucketAnalysis into PRThroughputSection component in src/presentation/components/PRThroughputSection.tsx (depends on T029)

**Checkpoint**: User Story 3 complete - size bucket table and bar chart visible, layout responsive

---

## Phase 6: User Story 4 - Receive Optimal PR Size Recommendation (Priority: P4)

**Goal**: Display automated insight message identifying the most efficient PR size range based on analysis

**Independent Test**: View insight message that identifies optimal size bucket or indicates "no clear difference" or "insufficient data" based on the data.

**Value**: Provides clear, actionable guidance for establishing team PR sizing policies

### Implementation for User Story 4

- [ ] T031 [P] [US4] Create InsightMessage component in src/presentation/components/InsightMessage.tsx with conditional styling (green for optimal, blue for no_difference, yellow for insufficient_data)
- [ ] T032 [P] [US4] Add appropriate icons to InsightMessage component based on insight type (success, info, warning)
- [ ] T033 [US4] Integrate InsightMessage into PRThroughputSection component in src/presentation/components/PRThroughputSection.tsx (depends on T031, T032)

**Checkpoint**: User Story 4 complete - insight message displays with appropriate styling and icons

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Testing & Quality

- [ ] T034 [P] Create E2E test for happy path in tests/e2e/pr-throughput-happy-path.spec.ts (verify section visible, scatter plot renders, table displays, insight shows)
- [ ] T035 [P] Create E2E test for empty state in tests/e2e/pr-throughput-empty-state.spec.ts (verify empty state message displays)
- [ ] T036 [P] Create E2E test for performance with 1000+ PRs in tests/e2e/pr-throughput-performance.spec.ts (verify dashboard loads < 3 seconds, chart renders smoothly)
- [ ] T037 Run all domain layer tests and verify 80%+ coverage (pnpm test:domain)
- [ ] T038 Run full test suite and verify all tests pass (pnpm test)

### Code Quality & Documentation

- [ ] T039 [P] Run type check and fix any TypeScript errors (pnpm type-check)
- [ ] T040 [P] Run ESLint and fix any linting issues (pnpm run lint)
- [ ] T041 [P] Add accessibility features: ARIA labels, keyboard navigation, screen reader support to all components
- [ ] T042 Verify mobile responsive layout works for all components
- [ ] T043 [P] Add code comments for complex business logic in domain layer
- [ ] T044 Update CLAUDE.md via agent context script to reflect new feature

### Deployment Verification

- [ ] T045 Run development build and verify feature works locally (pnpm dev)
- [ ] T046 Run production build and verify no build errors (pnpm build)
- [ ] T047 Manual testing checklist: scatter plot data accuracy, tooltip correctness, bucket calculations, insight logic, empty state handling

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: ✅ Skipped - no new setup needed
- **Foundational (Phase 2)**: No dependencies - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational phase (T001-T014) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on Foundational phase (T001-T014) and US1 (T019) - Integrates into existing PRThroughputSection
- **User Story 3 (P3)**: Depends on Foundational phase (T001-T014) and US1 (T019) - Integrates into existing PRThroughputSection
- **User Story 4 (P4)**: Depends on Foundational phase (T001-T014) and US1 (T019) - Integrates into existing PRThroughputSection

### Within Each User Story

- US1: T015 → T016 → (T017, T018) parallel → T019 → T020
- US2: (T021, T022) parallel → T023 → T024 → T025
- US3: (T026, T027) parallel → T028 → T029 → T030
- US4: (T031, T032) parallel → T033

### Parallel Opportunities

**Foundational Phase (After setup):**

- T001, T002, T003, T004, T005, T006 can all run in parallel (different value objects)
- T009, T012 can run in parallel with tests (T002, T004, T006, T008, T011)

**User Story 1:**

- T017 and T018 can run in parallel (different components)

**User Story 2:**

- T021 and T022 can run in parallel (chart and tooltip are separate)

**User Story 3:**

- T026 and T027 can run in parallel (table and bar chart are separate)

**User Story 4:**

- T031 and T032 can run in parallel (component and icons)

**Polish Phase:**

- T034, T035, T036 can run in parallel (different E2E tests)
- T039, T040, T041, T043, T044 can run in parallel (different quality checks)

---

## Parallel Example: Foundational Phase

```bash
# Launch all value object implementations together:
Task: "Create PRThroughputData value object in src/domain/value-objects/PRThroughputData.ts"
Task: "Create SizeBucket value object in src/domain/value-objects/SizeBucket.ts"
Task: "Create ThroughputInsight value object in src/domain/value-objects/ThroughputInsight.ts"

# Launch all test files together:
Task: "Create PRThroughputData test file in src/domain/value-objects/__tests__/PRThroughputData.test.ts"
Task: "Create SizeBucket test file in src/domain/value-objects/__tests__/SizeBucket.test.ts"
Task: "Create ThroughputInsight test file in src/domain/value-objects/__tests__/ThroughputInsight.test.ts"
```

---

## Parallel Example: User Story 3

```bash
# Launch table and bar chart components together:
Task: "Create SizeBucketTable component in src/presentation/components/SizeBucketTable.tsx"
Task: "Create SizeBucketBarChart component in src/presentation/components/SizeBucketBarChart.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001-T014) - CRITICAL
2. Complete Phase 3: User Story 1 (T015-T020)
3. **STOP and VALIDATE**: Test basic metrics display and empty state
4. Deploy/demo if ready - team leads can now see throughput summary

### Incremental Delivery

1. Complete Foundational (T001-T014) → Foundation ready
2. Add User Story 1 (T015-T020) → Test independently → Deploy/Demo (MVP: Basic metrics visible!)
3. Add User Story 2 (T021-T025) → Test independently → Deploy/Demo (Scatter plot analysis added!)
4. Add User Story 3 (T026-T030) → Test independently → Deploy/Demo (Size bucket analysis added!)
5. Add User Story 4 (T031-T033) → Test independently → Deploy/Demo (Automated insights added!)
6. Polish (T034-T047) → Final quality checks → Production deployment

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Foundational phase together (T001-T014)
2. Once Foundational is done:
   - Developer A: User Story 1 (T015-T020) - MVP delivery
   - After US1 complete:
     - Developer A: User Story 2 (T021-T025)
     - Developer B: User Story 3 (T026-T030)
     - Developer C: User Story 4 (T031-T033)
3. Stories integrate into PRThroughputSection independently

---

## Task Completion Summary

### Total Tasks: 47

**By Phase:**

- Setup: 0 (skipped)
- Foundational: 14 (T001-T014)
- User Story 1: 6 (T015-T020)
- User Story 2: 5 (T021-T025)
- User Story 3: 5 (T026-T030)
- User Story 4: 3 (T031-T033)
- Polish: 14 (T034-T047)

**Parallelizable Tasks:** 23 tasks marked [P] can run in parallel

**MVP Scope (Recommended):** Phase 2 (Foundational) + Phase 3 (User Story 1) = 20 tasks

**Full Feature Scope:** All 47 tasks

---

## Independent Test Criteria

### User Story 1 (MVP)

✅ Access dashboard
✅ Verify "PR Throughput Analysis" section appears after "Review Activity"
✅ Verify summary metrics display: average lead time, median lead time, total merged PRs
✅ Test with repository having no merged PRs → Empty state message displays
✅ Test with repository having merged PRs → Metrics display correctly

### User Story 2

✅ Scatter plot renders with correct data points (PR size on X-axis, lead time on Y-axis)
✅ Hover over point → Tooltip shows PR number, size, lead time
✅ Test with 1000+ PRs → Chart renders in < 3 seconds, no performance degradation

### User Story 3

✅ Size bucket table displays with correct columns: Bucket, Line Range, Avg Lead Time, PR Count, Percentage
✅ Bar chart displays with size buckets on X-axis, average lead time on Y-axis
✅ All 4 buckets (S, M, L, XL) always present even if some have 0 PRs

### User Story 4

✅ Insight message displays appropriate text based on data
✅ Optimal case: Green styling, identifies bucket with lowest lead time
✅ No difference case: Blue styling, indicates no clear winner
✅ Insufficient data case: Yellow styling, indicates need for more data (<10 PRs)

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Domain and application layer tests are MANDATORY (constitution requirement)
- E2E tests cover integration scenarios across stories
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All file paths are absolute from repository root
- Follow existing Next.js 15 and domain-driven architecture patterns
- No `any` types allowed (TypeScript strict mode)
- Performance target: Dashboard load < 3 seconds for 1000 PRs

---

## Format Validation

✅ All tasks follow checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
✅ Task IDs sequential: T001 through T047
✅ [P] marker only on parallelizable tasks (23 tasks)
✅ [Story] label present on all user story phase tasks (US1, US2, US3, US4)
✅ No [Story] label on Setup, Foundational, or Polish phases
✅ All task descriptions include exact file paths
✅ Dependencies clearly documented in task descriptions and dependency sections
