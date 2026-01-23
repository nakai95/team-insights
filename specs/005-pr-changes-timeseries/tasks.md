# Tasks: PR Changes Timeseries Analysis

**Input**: Design documents from `/specs/005-pr-changes-timeseries/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Domain layer tests are MANDATORY per constitutional requirements. Application layer tests are RECOMMENDED. Presentation layer tests are OPTIONAL.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure (no new setup needed - reusing existing infrastructure)

- [x] T001 Review existing project structure and verify no changes needed to infrastructure layer
- [x] T002 Verify Recharts 3.5.0 dependency is available in package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain and application logic that MUST be complete before ANY user story UI work can begin

**⚠️ CRITICAL**: No presentation layer work can begin until this phase is complete

### Domain Layer - Value Objects (MANDATORY TESTS)

- [x] T003 [P] Create WeeklyAggregate value object in src/domain/value-objects/WeeklyAggregate.ts
- [x] T004 [P] Create ChangeTrend value object in src/domain/value-objects/ChangeTrend.ts
- [x] T005 [P] Create OutlierWeek value object in src/domain/value-objects/OutlierWeek.ts
- [x] T006 [P] Write unit tests for WeeklyAggregate in src/domain/value-objects/**tests**/WeeklyAggregate.test.ts
- [x] T007 [P] Write unit tests for ChangeTrend in src/domain/value-objects/**tests**/ChangeTrend.test.ts
- [x] T008 [P] Write unit tests for OutlierWeek in src/domain/value-objects/**tests**/OutlierWeek.test.ts

### Application Layer - Use Case (RECOMMENDED TESTS)

- [x] T009 Create TimeseriesResult DTO in src/application/dto/TimeseriesResult.ts
- [x] T010 Extend AnalysisResult DTO to include timeseries field in src/application/dto/AnalysisResult.ts
- [x] T011 Create CalculateChangesTimeseries use case in src/application/use-cases/CalculateChangesTimeseries.ts
- [x] T012 Write unit tests for CalculateChangesTimeseries in src/application/use-cases/**tests**/CalculateChangesTimeseries.test.ts

**Checkpoint**: Foundation ready - domain logic complete and tested, user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Weekly Code Change Trends (Priority: P1) 🎯 MVP

**Goal**: Display weekly timeseries chart showing additions (green), deletions (red), and PR counts as bars to help users understand development velocity and spot refactoring patterns

**Independent Test**: Select a repository with merged PRs, switch to "PR Changes Timeseries" tab, verify weekly aggregated chart renders with stacked areas (green additions, red deletions) and PR count bars, hover over data points to see detailed tooltip

### Tab Architecture - Create Shared Components

- [ ] T013 [P] [US1] Create AnalysisTabs component with URL synchronization in src/presentation/components/AnalysisTabs.tsx
- [ ] T014 [P] [US1] Create OverviewTab component by extracting content from existing Dashboard in src/presentation/components/OverviewTab.tsx
- [ ] T015 [P] [US1] Create ThroughputTab component wrapping PRThroughputSection in src/presentation/components/ThroughputTab.tsx

### Timeseries Tab - Core Visualization

- [ ] T016 [US1] Create ChangesTimeseriesTab component with conditional rendering in src/presentation/components/ChangesTimeseriesTab.tsx
- [ ] T017 [US1] Create EmptyState component for no data scenario in src/presentation/components/ChangesTimeseriesTab/EmptyState.tsx
- [ ] T018 [US1] Create TimeseriesChart component with Recharts ComposedChart in src/presentation/components/ChangesTimeseriesTab/TimeseriesChart.tsx
- [ ] T019 [US1] Add custom tooltip component for TimeseriesChart hover interactions in src/presentation/components/ChangesTimeseriesTab/CustomTooltip.tsx

### Integration for User Story 1

- [ ] T020 [US1] Modify analyzeRepository Server Action to call CalculateChangesTimeseries use case in src/app/actions/analyzeRepository.ts
- [ ] T021 [US1] Update DashboardContent to integrate AnalysisTabs component in src/app/[locale]/dashboard/DashboardContent.tsx
- [ ] T022 [US1] Update Dashboard.tsx by moving content to OverviewTab component in src/app/[locale]/components/Dashboard.tsx

**Checkpoint**: User Story 1 complete - users can view weekly code change trends chart with tab navigation

---

## Phase 4: User Story 2 - Identify Outlier Weeks (Priority: P2)

**Goal**: Automatically detect and visually highlight weeks with abnormally high code changes (2+ standard deviations above mean) to identify major refactoring efforts or large feature merges

**Independent Test**: View a repository where one week has significantly higher changes than average (10,000 lines vs 1,500 line average), verify that week is visually highlighted on chart and listed in insights panel with statistical details (zScore, mean, standard deviation)

### Outlier Detection UI

- [ ] T023 [P] [US2] Add outlier week highlighting to TimeseriesChart component in src/presentation/components/ChangesTimeseriesTab/TimeseriesChart.tsx
- [ ] T024 [P] [US2] Create TimeseriesInsights component displaying outlier weeks list in src/presentation/components/ChangesTimeseriesTab/TimeseriesInsights.tsx
- [ ] T025 [US2] Add outlier week cards with date and metrics to TimeseriesInsights in src/presentation/components/ChangesTimeseriesTab/TimeseriesInsights.tsx

### Integration for User Story 2

- [ ] T026 [US2] Integrate TimeseriesInsights component into ChangesTimeseriesTab in src/presentation/components/ChangesTimeseriesTab.tsx
- [ ] T027 [US2] Add visual markers for outlier weeks on chart with distinct styling in src/presentation/components/ChangesTimeseriesTab/TimeseriesChart.tsx

**Checkpoint**: User Story 2 complete - users can identify outlier weeks through visual highlighting and insights panel

---

## Phase 5: User Story 3 - Track Trend Direction (Priority: P3)

**Goal**: Show directional trend (increasing/decreasing/stable) over the most recent 4 weeks with percentage change to help users understand whether development velocity is accelerating or slowing down

**Independent Test**: View a repository with at least 8 weeks of PR history where recent 4 weeks show increasing trend (last 2 weeks average 25% higher than first 2 weeks), verify insights panel displays "Increasing trend: +25%" with appropriate icon

### Trend Analysis UI

- [ ] T028 [P] [US3] Add trend direction display to TimeseriesInsights component in src/presentation/components/ChangesTimeseriesTab/TimeseriesInsights.tsx
- [ ] T029 [P] [US3] Add trend icon and percentage indicator with color coding in src/presentation/components/ChangesTimeseriesTab/TimeseriesInsights.tsx
- [ ] T030 [US3] Add 4-week moving average line to TimeseriesChart in src/presentation/components/ChangesTimeseriesTab/TimeseriesChart.tsx

### Edge Case Handling for User Story 3

- [ ] T031 [US3] Add insufficient data message when fewer than 4 weeks of history in src/presentation/components/ChangesTimeseriesTab/TimeseriesInsights.tsx

**Checkpoint**: User Story 3 complete - users can track development velocity trends over time

---

## Phase 6: User Story 4 - View Statistical Summary (Priority: P3)

**Goal**: Display aggregate statistics (total PRs, average weekly change volume, average PR size) for quick understanding of repository activity levels

**Independent Test**: View any repository with merged PRs, verify summary panel displays correct total PR count, average weekly changes, and average PR size calculated from the dataset

### Summary Statistics UI

- [ ] T032 [P] [US4] Add statistical summary section to TimeseriesInsights component in src/presentation/components/ChangesTimeseriesTab/TimeseriesInsights.tsx
- [ ] T033 [P] [US4] Display total PRs, average weekly changes, and average PR size metrics in src/presentation/components/ChangesTimeseriesTab/TimeseriesInsights.tsx
- [ ] T034 [US4] Add summary cards with icons and formatting in src/presentation/components/ChangesTimeseriesTab/TimeseriesInsights.tsx

**Checkpoint**: All user stories (US1-US4) complete - feature is fully functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, validation, and documentation

### Styling and Responsiveness

- [ ] T035 [P] Ensure light/dark mode compatibility for all new components using next-themes
- [ ] T036 [P] Add responsive layout for mobile viewing in ChangesTimeseriesTab
- [ ] T037 [P] Polish chart colors and styling to match existing dashboard theme

### Testing and Validation

- [ ] T038 [P] Run pnpm test to verify all domain and application tests pass
- [ ] T039 [P] Run pnpm type-check to verify no TypeScript errors
- [ ] T040 [P] Run pnpm lint to verify no ESLint errors
- [ ] T041 Manual testing: Verify tab navigation with browser back/forward buttons
- [ ] T042 Manual testing: Verify tab selection persists on page refresh
- [ ] T043 Manual testing: Verify direct links to /dashboard?tab=changes work correctly
- [ ] T044 Manual testing: Test with repository having fewer than 4 weeks of data (trend=null, no outliers)
- [ ] T045 Manual testing: Test with repository having no merged PRs (empty state)

### Documentation and Cleanup

- [ ] T046 [P] Update CLAUDE.md with feature implementation details and recent changes
- [ ] T047 [P] Remove any console.log statements and ensure no `any` types used
- [ ] T048 Verify constitutional compliance checklist from plan.md is satisfied
- [ ] T049 Run quickstart.md validation steps to ensure Definition of Done criteria met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately (minimal work, just verification)
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
  - Domain layer tasks (T003-T008) can run in parallel
  - Application layer tasks (T009-T012) depend on domain layer completion
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User Story 1 (Phase 3): Can start after Foundational - No dependencies on other stories
  - User Story 2 (Phase 4): Can start after US1 tab architecture exists - Extends US1 components
  - User Story 3 (Phase 5): Can start after US2 insights component exists - Extends insights panel
  - User Story 4 (Phase 6): Can start after US3 insights enhanced - Adds to insights panel
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: FOUNDATIONAL for all other stories
  - Provides: AnalysisTabs, ChangesTimeseriesTab, TimeseriesChart, EmptyState
  - Other stories extend these components
- **User Story 2 (P2)**: Depends on US1 chart and tab structure
  - Adds: Outlier highlighting, TimeseriesInsights component
- **User Story 3 (P3)**: Depends on US2 insights component
  - Adds: Trend section to insights, moving average line to chart
- **User Story 4 (P3)**: Depends on US3 insights structure
  - Adds: Summary statistics to insights panel

### Within Each Phase

**Phase 2 (Foundational)**:

- Domain value objects (T003-T005) can run in parallel [P]
- Domain tests (T006-T008) can run in parallel [P] after domain objects complete
- Application DTOs (T009-T010) must complete before use case (T011)
- Application use case (T011) must complete before use case tests (T012)

**Phase 3 (User Story 1)**:

- Tab architecture components (T013-T015) can run in parallel [P]
- Timeseries tab components (T016-T019) must complete sequentially
- Integration tasks (T020-T022) must complete after all components ready

**Phase 4-6 (User Stories 2-4)**:

- Most tasks within each story can run in parallel [P] as they modify different files
- Integration tasks must complete after component implementations

**Phase 7 (Polish)**:

- Styling tasks (T035-T037) can run in parallel [P]
- Testing tasks (T038-T045) can run in parallel [P]
- Documentation tasks (T046-T047) can run in parallel [P]

### Parallel Opportunities

**Maximum Parallelism** (if team capacity allows):

1. **After Setup**: All domain value objects (T003-T005) can be built in parallel by 3 developers
2. **After Domain Objects**: All domain tests (T006-T008) can be written in parallel by 3 developers
3. **After Application Layer**: Tab architecture (T013-T015) can be built in parallel by 3 developers
4. **Polish Phase**: All styling (T035-T037) and testing (T038-T045) tasks can run in parallel

**Critical Path** (minimum time to MVP):

```
Setup (T001-T002)
  → Domain Layer (T003-T008)
  → Application Layer (T009-T012)
  → Tab Architecture (T013-T015)
  → Timeseries Tab (T016-T019)
  → Integration (T020-T022)
  → Testing (T038-T045)
```

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Step 1: Create all domain value objects in parallel
Task T003: "Create WeeklyAggregate value object in src/domain/value-objects/WeeklyAggregate.ts"
Task T004: "Create ChangeTrend value object in src/domain/value-objects/ChangeTrend.ts"
Task T005: "Create OutlierWeek value object in src/domain/value-objects/OutlierWeek.ts"

# Step 2: Write all domain tests in parallel (after step 1 completes)
Task T006: "Write unit tests for WeeklyAggregate in src/domain/value-objects/__tests__/WeeklyAggregate.test.ts"
Task T007: "Write unit tests for ChangeTrend in src/domain/value-objects/__tests__/ChangeTrend.test.ts"
Task T008: "Write unit tests for OutlierWeek in src/domain/value-objects/__tests__/OutlierWeek.test.ts"

# Step 3: Create application layer (after step 2 completes)
Task T009: "Create TimeseriesResult DTO in src/application/dto/TimeseriesResult.ts"
Task T010: "Extend AnalysisResult DTO to include timeseries field in src/application/dto/AnalysisResult.ts"
# T009 and T010 complete
Task T011: "Create CalculateChangesTimeseries use case in src/application/use-cases/CalculateChangesTimeseries.ts"
# T011 completes
Task T012: "Write unit tests for CalculateChangesTimeseries in src/application/use-cases/__tests__/CalculateChangesTimeseries.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - Recommended Approach

1. Complete Phase 1: Setup (T001-T002) - Quick verification
2. Complete Phase 2: Foundational (T003-T012) - CRITICAL foundation with tests
3. Complete Phase 3: User Story 1 (T013-T022) - Core visualization
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Switch to PR Changes Timeseries tab
   - Verify chart displays weekly data
   - Verify tab switching works with URL sync
   - Verify empty state for repositories with no PRs
5. Demo/deploy MVP with core timeseries visualization

**MVP Definition**: User Story 1 provides immediate value - users can view historical code change patterns and identify busy weeks visually. This alone is valuable without outlier detection or trend analysis.

### Incremental Delivery (All User Stories)

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! 🎯)
3. Add User Story 2 → Test independently → Deploy/Demo (Outlier detection added)
4. Add User Story 3 → Test independently → Deploy/Demo (Trend analysis added)
5. Add User Story 4 → Test independently → Deploy/Demo (Summary statistics added)
6. Polish phase → Final validation → Production deployment

**Each story adds value without breaking previous stories**

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

**Option A - Parallel User Stories** (if stories can be isolated):

- Developer A: User Story 1 (T013-T022)
- User Story 2-4 wait for US1 completion (they extend US1 components)

**Option B - Parallel Components within US1** (most practical):

- Developer A: Tab architecture (T013-T015)
- Developer B: Timeseries chart (T016-T019)
- Developer C: Integration (T020-T022) after A and B complete

**Option C - Parallel after MVP**:

- All developers: Complete US1 together (MVP)
- Developer A: User Story 2 (T023-T027)
- Developer B: User Story 3 (T028-T031)
- Developer C: User Story 4 (T032-T034)

---

## Task Breakdown Summary

| Phase                 | Tasks     | Parallelizable | Critical Path |
| --------------------- | --------- | -------------- | ------------- |
| Phase 1: Setup        | T001-T002 | Yes (2)        | No            |
| Phase 2: Foundational | T003-T012 | Partial (6)    | **YES**       |
| Phase 3: User Story 1 | T013-T022 | Partial (3)    | **YES**       |
| Phase 4: User Story 2 | T023-T027 | Yes (2)        | No            |
| Phase 5: User Story 3 | T028-T031 | Yes (2)        | No            |
| Phase 6: User Story 4 | T032-T034 | Yes (2)        | No            |
| Phase 7: Polish       | T035-T049 | Yes (12)       | No            |
| **Total**             | **49**    | **29 [P]**     | **22 tasks**  |

**MVP Scope**: Phases 1-3 only = 22 tasks (T001-T022)
**Full Feature**: All phases = 49 tasks

---

## Notes

- **[P] marker**: Task can run in parallel with other [P] tasks (different files, no dependencies)
- **[Story] label**: Maps task to specific user story for traceability
- **Each user story should be independently testable**: Verify at checkpoints
- **Domain tests are MANDATORY**: Constitutional requirement, must achieve 80%+ coverage
- **Application tests are RECOMMENDED**: Helps catch integration issues early
- **Presentation tests are OPTIONAL**: Can rely on E2E tests or manual testing
- **Test file location**: MUST be in `__tests__` directories within same directory as code
- **Enum pattern**: MUST use constant object pattern for string literal types (e.g., TrendDirection.INCREASING)
- **No `any` types**: Use `unknown` instead, TypeScript strict mode enforced
- **Commit frequently**: After each task or logical group of related tasks
- **Stop at checkpoints**: Validate user stories independently before proceeding
- **Constitutional compliance**: Run validation checklist in Phase 7 to ensure all principles met

---

## Success Criteria

- ✅ All 49 tasks completed
- ✅ All domain layer unit tests pass with 80%+ coverage
- ✅ All application layer unit tests pass
- ✅ Chart displays weekly data correctly with stacked areas and bars
- ✅ Outlier weeks visually highlighted and listed in insights
- ✅ Trend direction displayed with icon and percentage
- ✅ Summary statistics accurate and displayed clearly
- ✅ Tab navigation works with URL synchronization
- ✅ Empty state handles repositories with no merged PRs
- ✅ Browser back/forward/refresh preserves tab state
- ✅ No TypeScript errors (pnpm type-check passes)
- ✅ No ESLint errors (pnpm lint passes)
- ✅ All new code follows constitutional principles
- ✅ No `any` types, no `console.log` statements
- ✅ Manual testing checklist complete (T041-T045)
- ✅ CLAUDE.md updated with feature implementation details
