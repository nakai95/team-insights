---
description: "Task list for Developer Activity Dashboard implementation"
---

# Tasks: Developer Activity Dashboard

**Input**: Design documents from `/specs/001-dev-activity-dashboard/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are MANDATORY for domain layer (80%+ coverage). Tests shown below follow constitutional requirements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `src/` at repository root (Next.js 14 App Router)
- Tests in `tests/` directory
- Domain layer: `src/domain/`, Application: `src/application/`, Infrastructure: `src/infrastructure/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Next.js 14 project with TypeScript in current directory using pnpm
- [x] T002 Install core dependencies (@octokit/rest, simple-git, zod, recharts, shadcn/ui)
- [x] T003 [P] Configure TypeScript strict mode in tsconfig.json
- [x] T004 [P] Configure Vitest for unit testing with coverage settings
- [x] T005 [P] Configure Playwright for E2E testing
- [x] T006 [P] Configure Husky pre-commit hooks with lint and test
- [x] T007 [P] Initialize Shadcn/UI and add base components (button, input, card, toast, table, select)
- [x] T008 Create directory structure per plan.md (domain, application, infrastructure, presentation, app, lib, tests)
- [x] T009 [P] Create Result type utility in src/lib/result.ts
- [x] T010 [P] Create ApplicationError class in src/lib/errors/ApplicationError.ts
- [x] T011 [P] Create environment configuration files (.env.example, .env.local)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Domain Layer Foundation

- [x] T012 [P] Create AnalysisStatus type definition in src/domain/types.ts
- [x] T013 [P] Create Period type definition in src/domain/types.ts
- [x] T014 [P] Create RankingCriteria type definition in src/domain/types.ts

### Domain Value Objects

- [x] T015 [P] Create Email value object in src/domain/value-objects/Email.ts
- [x] T016 [P] Write unit tests for Email in src/domain/value-objects/**tests**/Email.test.ts (11 tests passing)
- [x] T017 [P] Create RepositoryUrl value object in src/domain/value-objects/RepositoryUrl.ts
- [x] T018 [P] Write unit tests for RepositoryUrl in src/domain/value-objects/**tests**/RepositoryUrl.test.ts (15 tests passing)
- [x] T019 [P] Create DateRange value object in src/domain/value-objects/DateRange.ts
- [x] T020 [P] Write unit tests for DateRange in src/domain/value-objects/**tests**/DateRange.test.ts (14 tests passing)
- [x] T021 [P] Create ImplementationActivity value object in src/domain/value-objects/ImplementationActivity.ts
- [x] T022 [P] Write unit tests for ImplementationActivity in src/domain/value-objects/**tests**/ImplementationActivity.test.ts (19 tests passing)
- [x] T023 [P] Create ReviewActivity value object in src/domain/value-objects/ReviewActivity.ts
- [x] T024 [P] Write unit tests for ReviewActivity in src/domain/value-objects/**tests**/ReviewActivity.test.ts (14 tests passing)

### Domain Interfaces

- [x] T025 [P] Define IGitOperations interface in src/domain/interfaces/IGitOperations.ts
- [x] T026 [P] Define IGitHubAPI interface in src/domain/interfaces/IGitHubAPI.ts
- [x] T027 [P] Define IStoragePort interface in src/domain/interfaces/IStoragePort.ts

### Validation Schemas

- [x] T028 [P] Create Zod validation schemas in src/lib/validation/schemas.ts
- [x] T029 [P] Write unit tests for validation schemas in src/lib/validation/**tests**/schemas.test.ts (20 tests passing)

### Utilities

- [x] T030 [P] Create logger utility in src/lib/utils/logger.ts
- [x] T031 [P] Create token masker utility in src/lib/utils/tokenMasker.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Basic Activity Visualization (Priority: P1) 🎯 MVP

**Goal**: Users can input repository URL and GitHub token to view a dashboard with commit counts, code changes, and contributor activity over 6-month default period

**Independent Test**: Enter repository URL and token → verify dashboard displays commit counts, code change metrics, and contributor list

### Domain Entities for US1

- [x] T032 [P] [US1] Create RepositoryAnalysis entity in src/domain/entities/RepositoryAnalysis.ts
- [x] T033 [P] [US1] Write unit tests for RepositoryAnalysis in src/domain/entities/**tests**/RepositoryAnalysis.test.ts (11 tests passing)
- [x] T034 [P] [US1] Create Contributor entity in src/domain/entities/Contributor.ts
- [x] T035 [P] [US1] Write unit tests for Contributor in src/domain/entities/**tests**/Contributor.test.ts (10 tests passing)
- [x] T036 [P] [US1] Create ActivitySnapshot value object in src/domain/value-objects/ActivitySnapshot.ts
- [x] T037 [P] [US1] Write unit tests for ActivitySnapshot in src/domain/value-objects/**tests**/ActivitySnapshot.test.ts (5 tests passing)

### Domain Services for US1

- [x] T038 [US1] Create ActivityAggregationService in src/domain/services/ActivityAggregationService.ts
- [x] T039 [US1] Write unit tests for ActivityAggregationService in src/domain/services/**tests**/ActivityAggregationService.test.ts (15 tests passing)

### Application Layer DTOs

- [x] T040 [P] [US1] Create AnalysisRequest DTO in src/application/dto/AnalysisRequest.ts
- [x] T041 [P] [US1] Create AnalysisResult DTO in src/application/dto/AnalysisResult.ts
- [x] T042 [P] [US1] Create ContributorDto in src/application/dto/ContributorDto.ts

### Infrastructure - Git Operations

- [x] T043 [US1] Implement SimpleGitAdapter in src/infrastructure/git/SimpleGitAdapter.ts
- [x] T044 [US1] Implement GitLogParser in src/infrastructure/git/GitLogParser.ts
- [x] T045 [US1] Write tests for GitLogParser in src/infrastructure/git/**tests**/GitLogParser.test.ts (12 tests passing)
- [x] T046 [US1] Implement TempDirectoryManager in src/infrastructure/filesystem/TempDirectoryManager.ts

### Infrastructure - GitHub API

- [x] T047 [US1] Implement OctokitAdapter in src/infrastructure/github/OctokitAdapter.ts
- [x] T048 [US1] Implement RateLimiter in src/infrastructure/github/RateLimiter.ts

### Application Use Cases for US1

- [x] T049 [US1] Implement FetchGitData use case in src/application/use-cases/FetchGitData.ts
- [ ] T050 [US1] Write unit tests for FetchGitData in tests/unit/application/use-cases/FetchGitData.test.ts (Skipped - Application tests optional)
- [x] T051 [US1] Implement CalculateMetrics use case in src/application/use-cases/CalculateMetrics.ts
- [ ] T052 [US1] Write unit tests for CalculateMetrics in tests/unit/application/use-cases/CalculateMetrics.test.ts (Skipped - Application tests optional)
- [x] T053 [US1] Implement AnalyzeRepository use case in src/application/use-cases/AnalyzeRepository.ts
- [ ] T054 [US1] Write unit tests for AnalyzeRepository in tests/unit/application/use-cases/AnalyzeRepository.test.ts (Skipped - Application tests optional)

### Server Actions for US1

- [x] T055 [US1] Implement analyzeRepository Server Action in src/app/actions/analyzeRepository.ts

### Presentation Components for US1

- [x] T056 [P] [US1] Create AnalysisForm component (implemented in src/app/components/AnalysisForm.tsx)
- [x] T057 [P] [US1] Create Dashboard component (implemented in src/app/components/Dashboard.tsx)
- [x] T058 [P] [US1] Create ImplementationActivityChart component (implemented in src/app/components/ImplementationActivityChart.tsx)
- [x] T059 [P] [US1] Create ContributorList component (implemented in src/app/components/ContributorList.tsx)
- [x] T060 [P] [US1] Create ProgressIndicator component (implemented in src/app/components/ProgressIndicator.tsx)

### React Hooks for US1

- [x] T061 [US1] Create useAnalysis hook (implemented in src/app/hooks/useAnalysis.ts)

### Next.js Pages for US1

- [x] T062 [US1] Create home page with AnalysisForm in src/app/page.tsx
- [x] T063 [US1] Create dashboard page (implemented in src/app/dashboard/page.tsx with Suspense)

### E2E Tests for US1

- [x] T064 [US1] Create E2E happy path test in tests/e2e/happy-path.spec.ts
- [x] T065 [US1] Create E2E error handling test in tests/e2e/error-handling.spec.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and independently testable. Users can analyze repositories and view basic commit/code change metrics.

---

## Phase 4: User Story 2 - Pull Request and Review Activity (Priority: P2)

**Goal**: Users can see PR creation counts and review comment activity displayed separately from commit metrics

**Independent Test**: View dashboard → verify PR counts and review comment counts are displayed separately, allowing identification of review participation patterns

### Infrastructure - GitHub API Extensions for US2

- [x] T066 [US2] Extend OctokitAdapter to fetch PR data (already implemented in src/infrastructure/github/OctokitAdapter.ts)
- [x] T067 [US2] Extend OctokitAdapter to fetch review comment data (already implemented in src/infrastructure/github/OctokitAdapter.ts)

### Application Use Cases for US2

- [x] T068 [US2] Implement FetchGitHubData use case (already implemented in src/application/use-cases/FetchGitData.ts)
- [ ] T069 [US2] Write unit tests for FetchGitHubData (Skipped - Application tests optional)
- [x] T070 [US2] Extend AnalyzeRepository use case to include GitHub data (already implemented)
- [ ] T071 [US2] Update unit tests for extended AnalyzeRepository (Skipped - Application tests optional)

### Presentation Components for US2

- [x] T072 [P] [US2] Review activity display (implemented in Dashboard component - Review Activity card)
- [x] T073 [P] [US2] Contributor rankings (implemented in ContributorList component with sortable display)
- [x] T074 [US2] Update Dashboard component to display review activity section (completed - includes Review Activity card and review metrics)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can see both implementation and review activities.

---

## Phase 5: User Story 3 - Developer Identity Merging (Priority: P3)

**Goal**: Users can manually merge duplicate developer identities to see combined metrics

**Independent Test**: Identify duplicate entries → merge them → verify merged identity shows combined metrics

### Domain Entities for US3

- [x] T075 [P] [US3] Create IdentityMerge entity in src/domain/entities/IdentityMerge.ts
- [x] T076 [P] [US3] Write unit tests for IdentityMerge in tests/unit/domain/entities/IdentityMerge.test.ts

### Domain Services for US3

- [x] T077 [US3] Create ContributorService in src/domain/services/ContributorService.ts
- [x] T078 [US3] Write unit tests for ContributorService in tests/unit/domain/services/ContributorService.test.ts

### Infrastructure - Storage for US3

- [x] T079 [US3] Implement LocalStorageAdapter in src/infrastructure/storage/LocalStorageAdapter.ts

### Application Use Cases for US3

- [x] T080 [US3] Implement MergeIdentities use case in src/application/use-cases/MergeIdentities.ts
- [x] T081 [US3] Write unit tests for MergeIdentities in tests/unit/application/use-cases/MergeIdentities.test.ts

### Server Actions for US3

- [x] T082 [US3] Implement mergeIdentities Server Action in src/app/actions/mergeIdentities.ts

### Presentation Components for US3

- [x] T083 [P] [US3] Create IdentityMerger component in src/presentation/components/IdentityMerger.tsx
- [x] T084 [US3] Create useIdentityMerge hook in src/presentation/hooks/useIdentityMerge.ts
- [x] T085 [US3] Update Dashboard component to include identity merger UI

**Checkpoint**: All user stories 1, 2, and 3 should now work independently. Users can merge duplicate identities.

---

## Phase 6: User Story 4 - Custom Analysis Period (Priority: P4)

**Goal**: Users can specify custom date ranges for analysis instead of default 6 months

**Independent Test**: Enter repository URL with custom date range → verify dashboard shows only activity within that period

### Domain Extensions for US4

- [x] T086 [US4] Update DateRange value object to support validation for large ranges (added isLargeRange() and getLargeRangeWarning() methods)
- [x] T087 [US4] Update unit tests for DateRange with new validation (added tests for large range detection and warning messages)

### Presentation Components for US4

- [x] T088 [US4] Update AnalysisForm to include advanced options with date range picker (already existed, enhanced with validation)
- [x] T089 [US4] Add date range validation and feedback for very large ranges (added real-time validation with Alert components)

### Application Extensions for US4

- [x] T090 [US4] Update AnalyzeRepository use case to handle custom date ranges (already implemented in createDateRange method)
- [x] T091 [US4] Update unit tests for AnalyzeRepository with custom ranges (created comprehensive test suite)

**Checkpoint**: All user stories (1-4) should now be independently functional. Users have full feature access.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T092 [P] Add error boundary component in src/presentation/components/ErrorBoundary.tsx
- [ ] T093 [P] Add loading states across all components (already implemented: ProgressIndicator component exists)
- [ ] T094 [P] Add toast notifications for user feedback (dependency installed, implementation optional)
- [x] T095 [P] Create README.md with setup instructions (comprehensive README created with installation, usage, testing, architecture)
- [ ] T096 [P] Add JSDoc comments to public APIs
- [x] T097 Run domain layer test coverage check (verify 80%+ coverage) - Domain layer: Entities 98.21%, Value Objects 95.45%, Services 96.07%
- [x] T098 Run full test suite and fix any failures - 155 tests passing, 0 failures
- [x] T099 Run ESLint and Prettier on entire codebase - No errors or warnings
- [ ] T100 [P] Performance optimization: Test with large repository (100+ contributors) - Optional
- [x] T101 [P] Security audit: Verify token never exposed to client - Token only in Server Actions, not in client bundle
- [ ] T102 Validate quickstart.md instructions by following them - Optional

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Enhances US1/US2 but independently testable
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Adds flexibility to US1 but independently testable

### Within Each User Story

- Domain entities and value objects first (can be parallel)
- Domain services after entities
- Infrastructure adapters can be parallel with domain work
- Use cases depend on both domain and infrastructure
- Server Actions depend on use cases
- Components and hooks can be parallel
- Pages integrate components
- E2E tests validate full story

### Parallel Opportunities

**Setup Phase (Phase 1)**:

```bash
# All marked [P] can run in parallel:
T003, T004, T005, T006, T007, T009, T010, T011
```

**Foundational Phase (Phase 2)**:

```bash
# Type definitions in parallel:
T012, T013, T014

# Value objects and their tests in parallel:
T015, T016, T017, T018, T019, T020, T021, T022, T023, T024

# Interfaces in parallel:
T025, T026, T027

# Schemas and utilities in parallel:
T028, T029, T030, T031
```

**User Story 1 (Phase 3)**:

```bash
# Entities and tests in parallel:
T032, T033, T034, T035, T036, T037

# DTOs in parallel:
T040, T041, T042

# Components in parallel:
T056, T057, T058, T059, T060
```

**Multiple Stories**:
Once Foundational phase completes, all user stories can start in parallel by different team members:

- Developer A: User Story 1
- Developer B: User Story 2
- Developer C: User Story 3
- Developer D: User Story 4

---

## Parallel Example: User Story 1

```bash
# Launch all entity tasks together:
Task: "Create RepositoryAnalysis entity in src/domain/entities/RepositoryAnalysis.ts"
Task: "Write unit tests for RepositoryAnalysis in tests/unit/domain/entities/RepositoryAnalysis.test.ts"
Task: "Create Contributor entity in src/domain/entities/Contributor.ts"
Task: "Write unit tests for Contributor in tests/unit/domain/entities/Contributor.test.ts"
Task: "Create ActivitySnapshot value object in src/domain/value-objects/ActivitySnapshot.ts"
Task: "Write unit tests for ActivitySnapshot in tests/unit/domain/value-objects/ActivitySnapshot.test.ts"

# Launch all DTO tasks together:
Task: "Create AnalysisRequest DTO in src/application/dto/AnalysisRequest.ts"
Task: "Create AnalysisResult DTO in src/application/dto/AnalysisResult.ts"
Task: "Create ContributorDto in src/application/dto/ContributorDto.ts"

# Launch all presentation components together:
Task: "Create AnalysisForm component in src/presentation/components/AnalysisForm.tsx"
Task: "Create Dashboard component in src/presentation/components/Dashboard.tsx"
Task: "Create ImplementationActivityChart component in src/presentation/components/ImplementationActivityChart.tsx"
Task: "Create ContributorList component in src/presentation/components/ContributorList.tsx"
Task: "Create ProgressIndicator component in src/presentation/components/ProgressIndicator.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

**MVP Deliverable**: Users can analyze repositories and view commit/code change metrics.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (MVP critical)
   - Developer B: User Story 2 (review metrics)
   - Developer C: User Story 3 (identity merging)
   - Developer D: User Story 4 (custom periods)
3. Stories complete and integrate independently
4. Each story can be released as it's completed

---

## Notes

- **[P] tasks** = different files, no dependencies - can run in parallel
- **[Story] label** maps task to specific user story for traceability
- **Each user story** should be independently completable and testable
- **Domain layer tests** are MANDATORY (80%+ coverage target)
- **E2E tests** validate critical paths only (happy path + error handling)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Avoid**: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Task Count Summary

- **Setup**: 11 tasks
- **Foundational**: 20 tasks (includes domain foundation + tests)
- **User Story 1**: 34 tasks (MVP - complete feature)
- **User Story 2**: 9 tasks (extends US1 with review metrics)
- **User Story 3**: 11 tasks (adds identity merging)
- **User Story 4**: 6 tasks (adds custom date ranges)
- **Polish**: 11 tasks (cross-cutting improvements)

**Total**: 102 tasks

**Parallel Opportunities**: ~40 tasks can run in parallel during different phases
**Independent Stories**: All 4 user stories are independently deployable after Foundational phase
