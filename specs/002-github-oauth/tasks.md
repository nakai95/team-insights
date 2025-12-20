# Tasks: GitHub OAuth Authentication

**Input**: Design documents from `/specs/002-github-oauth/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the spec. Following Clean Architecture test strategy: domain tests unchanged (80%+ coverage maintained), infrastructure tests optional, E2E tests for critical paths.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and NextAuth.js v5 installation

- [ ] T001 Install NextAuth.js v5 (beta) via `pnpm add next-auth@beta`
- [ ] T002 Create GitHub OAuth application in GitHub Developer Settings for development (callback: `http://localhost:3000/api/auth/callback/github`)
- [ ] T003 Generate AUTH_SECRET for JWT encryption via `openssl rand -base64 32`
- [ ] T004 [P] Create `.env.local` with AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, AUTH_SECRET variables
- [ ] T005 [P] Create TypeScript type extensions in `types/next-auth.d.ts` for Session and JWT interfaces
- [ ] T006 [P] Update `tsconfig.json` to include `types/**/*.d.ts` in the include array

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core authentication infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Create ISessionProvider domain interface in `src/domain/interfaces/ISessionProvider.ts`
- [ ] T008 Create NextAuth v5 configuration in `src/infrastructure/auth/auth.config.ts` with GitHub provider, JWT strategy, 7-day maxAge, and session/jwt callbacks
- [ ] T009 [P] Create NextAuthAdapter implementing ISessionProvider in `src/infrastructure/auth/NextAuthAdapter.ts`
- [ ] T010 [P] Create environment validation schema with Zod in `src/infrastructure/auth/env.schema.ts`
- [ ] T011 Create NextAuth v5 catch-all route handler in `src/app/api/auth/[...nextauth]/route.ts` that exports GET and POST from handlers
- [ ] T012 Create middleware for route protection in `middleware.ts` (project root) with auth checks, redirects, and error handling
- [ ] T013 [P] Create SessionProvider wrapper component in `src/app/providers.tsx` for client-side session access
- [ ] T014 Update root layout in `src/app/layout.tsx` to wrap children with Providers component

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - First-Time User Authentication (Priority: P1) 🎯 MVP

**Goal**: Enable users to sign in with GitHub OAuth and establish an authenticated session with profile display

**Independent Test**: Visit app as unauthenticated user → click "Sign in with GitHub" → approve permissions on GitHub → redirect back with session → see GitHub profile in header → refresh page → still authenticated

### Implementation for User Story 1

- [ ] T015 [P] [US1] Create SignInButton client component in `src/presentation/components/auth/SignInButton.tsx`
- [ ] T016 [P] [US1] Create SignOutButton client component in `src/presentation/components/auth/SignOutButton.tsx`
- [ ] T017 [P] [US1] Create UserProfile client component in `src/presentation/components/auth/UserProfile.tsx` showing user info and auth buttons
- [ ] T018 [US1] Update Header component in `src/presentation/components/Header.tsx` to include UserProfile component
- [ ] T019 [P] [US1] Create login page in `src/app/login/page.tsx` with SignInButton
- [ ] T020 [P] [US1] Create auth error page in `src/app/auth/error/page.tsx` with auto sign-out useEffect and error message display
- [ ] T021 [US1] Test OAuth flow end-to-end: sign in → verify session → verify profile display → verify session persistence

**Checkpoint**: At this point, User Story 1 should be fully functional - users can sign in with GitHub OAuth and see their profile

---

## Phase 4: User Story 2 - Repository Analysis Without Token Input (Priority: P1) 🎯 MVP

**Goal**: Enable authenticated users to analyze repositories using session token (no manual token input required)

**Independent Test**: Authenticate via OAuth → enter repository URL (no token field) → submit analysis → verify analysis proceeds using session token → verify results displayed

### Implementation for User Story 2

- [ ] T022 [US2] Modify AnalysisRequest DTO in `src/application/dto/AnalysisRequest.ts` to remove `githubToken` field
- [ ] T023 [P] [US2] Modify OctokitAdapter constructor in `src/infrastructure/github/OctokitAdapter.ts` to accept ISessionProvider, update all methods to call sessionProvider.getAccessToken()
- [ ] T024 [P] [US2] Modify SimpleGitAdapter constructor in `src/infrastructure/git/SimpleGitAdapter.ts` to accept ISessionProvider, update clone() method to inject token into URL as `https://oauth2:<token>@github.com/owner/repo.git`
- [ ] T025 [US2] Modify analyzeRepository Server Action in `src/app/actions/analyzeRepository.ts` to remove githubToken parameter validation, inject NextAuthAdapter, pass to adapters, add AUTHENTICATION_REQUIRED error handling
- [ ] T026 [US2] Update AnalysisForm component in `src/presentation/components/AnalysisForm.tsx` to remove token input field
- [ ] T027 [US2] Add TOKEN_EXPIRED error code to AnalysisErrorCode enum in `src/application/dto/AnalysisResult.ts`
- [ ] T028 [US2] Update error mapping in `src/app/actions/errorMapping.ts` to handle session authentication errors
- [ ] T029 [US2] Test repository analysis flow: authenticate → enter repo URL → analyze → verify no token input → verify results

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can sign in and analyze repos without token input

---

## Phase 5: User Story 3 - Session Management and Logout (Priority: P2)

**Goal**: Enable users to sign out and verify session termination with proper redirects

**Independent Test**: Authenticate → click "Sign out" → verify redirect to homepage → verify unauthenticated state → attempt to access analysis → verify redirect to login

### Implementation for User Story 3

- [ ] T030 [US3] Verify SignOutButton component (already created in T016) properly calls signOut({ callbackUrl: "/" })
- [ ] T031 [US3] Verify middleware (created in T012) redirects unauthenticated users attempting to access protected routes to /login
- [ ] T032 [US3] Test session persistence: authenticate → close browser → reopen → verify still authenticated (within 7 days)
- [ ] T033 [US3] Test sign-out flow: authenticate → sign out → verify redirect → verify unauthenticated → attempt analysis → verify login redirect

**Checkpoint**: All core authentication flows (sign in, analysis, sign out) should now be independently functional

---

## Phase 6: User Story 4 - Token Expiration Handling (Priority: P2)

**Goal**: Gracefully handle expired/invalid OAuth tokens with user-friendly error messages and re-authentication prompts

**Independent Test**: Simulate invalid token (manually modify session or revoke GitHub app access) → attempt analysis → verify clear error message → verify re-authentication prompt

### Implementation for User Story 4

- [ ] T034 [US4] Verify NextAuthAdapter (created in T009) returns proper error Result when session has error field
- [ ] T035 [US4] Verify middleware (created in T012) redirects users with session.error to /auth/error page
- [ ] T036 [US4] Verify auth error page (created in T020) displays appropriate messages for token expiration errors
- [ ] T037 [US4] Update analyzeRepository Server Action error handling to detect TOKEN_EXPIRED and return user-friendly message
- [ ] T038 [US4] Add re-authentication flow: user receives token expired error → clicks "Sign in again" → redirected to OAuth flow
- [ ] T039 [US4] Test token expiration scenario: simulate expired token → attempt analysis → verify error message → re-authenticate → verify analysis works

**Checkpoint**: Token expiration errors should be handled gracefully with clear user guidance

---

## Phase 7: User Story 5 - Insufficient Permissions Handling (Priority: P3)

**Goal**: Display helpful error messages when users lack access to private repositories

**Independent Test**: Authenticate → attempt to analyze private repo without access → verify error message "You do not have permission to access this repository" with guidance

### Implementation for User Story 5

- [ ] T040 [US5] Verify OctokitAdapter (modified in T023) already handles 403/404 GitHub API errors with appropriate messages
- [ ] T041 [US5] Update error mapping to ensure ACCESS_DENIED errors include guidance on requesting access or verifying repository visibility
- [ ] T042 [US5] Update AnalysisForm to display permission errors with actionable guidance
- [ ] T043 [US5] Test insufficient permissions scenario: authenticate → analyze inaccessible private repo → verify helpful error message
- [ ] T044 [US5] Test graceful handling of mid-analysis permission revocation

**Checkpoint**: All user stories should now be independently functional with proper error handling

---

## Phase 8: E2E Testing (Critical Paths)

**Purpose**: Validate critical authentication and analysis flows end-to-end

- [ ] T045 [P] Create E2E test for OAuth login → repository analysis flow in `tests/e2e/auth-flow.spec.ts` using Playwright
- [ ] T046 [P] Create E2E test for OAuth denial → error message flow in `tests/e2e/auth-error.spec.ts`
- [ ] T047 [P] Update existing E2E tests to use OAuth flow instead of token input
- [ ] T048 Run all E2E tests and verify 100% pass rate for authentication flows

---

## Phase 9: Infrastructure Tests (Optional - Recommended)

**Purpose**: Test infrastructure adapters with new session provider pattern

- [ ] T049 [P] Create MockSessionProvider for testing in `tests/unit/infrastructure/__mocks__/MockSessionProvider.ts`
- [ ] T050 [P] Update OctokitAdapter tests in `tests/unit/infrastructure/github/OctokitAdapter.test.ts` to use MockSessionProvider
- [ ] T051 [P] Update SimpleGitAdapter tests in `tests/unit/infrastructure/git/SimpleGitAdapter.test.ts` to use MockSessionProvider
- [ ] T052 [P] Create NextAuthAdapter tests in `tests/unit/infrastructure/auth/NextAuthAdapter.test.ts` (optional - simple wrapper)
- [ ] T053 Run all infrastructure tests and verify pass rate

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [ ] T054 [P] Verify all logs use maskToken() utility to prevent token exposure
- [ ] T055 [P] Verify AUTH_SECRET is at least 32 characters and properly encrypted JWT
- [ ] T056 [P] Verify session cookies are HTTP-only, Secure (production), SameSite=Lax
- [ ] T057 [P] Update README.md with OAuth setup instructions and environment variable documentation
- [ ] T058 [P] Create MIGRATION.md documenting breaking change: removal of githubToken parameter
- [ ] T059 Run quickstart.md validation: follow all 10 steps and verify successful OAuth implementation
- [ ] T060 [P] Performance test: verify auth check overhead <10ms per request
- [ ] T061 [P] Security audit: verify zero tokens in client-side code, logs, or error messages
- [ ] T062 Final manual test: complete all user stories end-to-end to verify independent functionality

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T006) - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion (T007-T014)
  - US1 (Phase 3): Can start after Foundational - No dependencies on other stories
  - US2 (Phase 4): Can start after Foundational - Integrates with US1 but independently testable
  - US3 (Phase 5): Can start after Foundational - Depends on US1 components but independently testable
  - US4 (Phase 6): Can start after Foundational - Builds on US1-US3 error handling
  - US5 (Phase 7): Can start after Foundational - Extends US2 error handling
- **E2E Testing (Phase 8)**: Depends on US1 and US2 completion for critical paths
- **Infrastructure Tests (Phase 9)**: Can run in parallel with user stories (test-first approach) or after implementation
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Must integrate with US1 but should be independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Uses US1 components (SignOutButton) but independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Extends US1-US3 error handling but independently testable
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Extends US2 error handling but independently testable

### Within Each User Story

- UI components can be created in parallel (marked [P])
- Adapter modifications depend on ISessionProvider interface (T007)
- Server Action modifications depend on adapter changes
- Testing tasks depend on implementation completion

### Parallel Opportunities

- **Setup Phase**: T002-T003 (GitHub OAuth app + AUTH_SECRET generation), T004-T006 (config files) can run in parallel
- **Foundational Phase**: T009-T010 (adapters + validation schema), T013-T014 (UI providers) can run in parallel
- **User Story 1**: T015-T017 (UI components), T019-T020 (pages) can run in parallel
- **User Story 2**: T022 (DTO), T023-T024 (adapters), T027 (error code) can run in parallel
- **E2E Tests**: T045-T047 can run in parallel
- **Infrastructure Tests**: T049-T052 can run in parallel
- **Polish**: T054-T058, T060-T061 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all UI components for User Story 1 together:
Task: "Create SignInButton client component in src/presentation/components/auth/SignInButton.tsx"
Task: "Create SignOutButton client component in src/presentation/components/auth/SignOutButton.tsx"
Task: "Create UserProfile client component in src/presentation/components/auth/UserProfile.tsx"

# Launch page components together:
Task: "Create login page in src/app/login/page.tsx"
Task: "Create auth error page in src/app/auth/error/page.tsx"
```

## Parallel Example: User Story 2

```bash
# Launch adapter modifications together:
Task: "Modify OctokitAdapter constructor in src/infrastructure/github/OctokitAdapter.ts"
Task: "Modify SimpleGitAdapter constructor in src/infrastructure/git/SimpleGitAdapter.ts"

# Launch error handling updates together:
Task: "Add TOKEN_EXPIRED error code to AnalysisErrorCode enum"
Task: "Update error mapping in src/app/actions/errorMapping.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T014) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T015-T021)
4. **STOP and VALIDATE**: Test US1 independently - users can sign in with OAuth
5. Complete Phase 4: User Story 2 (T022-T029)
6. **STOP and VALIDATE**: Test US2 independently - users can analyze repos without token input
7. Run critical E2E tests (T045)
8. Deploy/demo MVP

**MVP Scope**: 14 foundational tasks + 7 US1 tasks + 8 US2 tasks + 1 E2E test = **30 tasks**

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (14 tasks)
2. Add User Story 1 → Test independently → Deploy/Demo (7 tasks) - **MVP Checkpoint 1**
3. Add User Story 2 → Test independently → Deploy/Demo (8 tasks) - **MVP Checkpoint 2**
4. Add User Story 3 → Test independently → Deploy/Demo (4 tasks)
5. Add User Story 4 → Test independently → Deploy/Demo (6 tasks)
6. Add User Story 5 → Test independently → Deploy/Demo (5 tasks)
7. Add E2E + Infrastructure Tests (9 tasks)
8. Polish & Finalize (9 tasks)

Total: **62 tasks**

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

1. Team completes Setup + Foundational together (14 tasks)
2. Once Foundational is done:
   - Developer A: User Story 1 (7 tasks)
   - Developer B: User Story 2 (8 tasks)
   - Developer C: User Story 3 (4 tasks)
3. Continue with remaining stories
4. Final integration and testing

---

## Task Summary

### Total Task Count: **62 tasks**

### Tasks Per Phase:

- **Phase 1 (Setup)**: 6 tasks
- **Phase 2 (Foundational)**: 8 tasks
- **Phase 3 (US1 - P1)**: 7 tasks
- **Phase 4 (US2 - P1)**: 8 tasks
- **Phase 5 (US3 - P2)**: 4 tasks
- **Phase 6 (US4 - P2)**: 6 tasks
- **Phase 7 (US5 - P3)**: 5 tasks
- **Phase 8 (E2E Tests)**: 4 tasks
- **Phase 9 (Infrastructure Tests)**: 5 tasks
- **Phase 10 (Polish)**: 9 tasks

### Tasks Per User Story:

- **US1 (First-Time Authentication)**: 7 tasks
- **US2 (Analysis Without Token)**: 8 tasks
- **US3 (Session Management)**: 4 tasks
- **US4 (Token Expiration)**: 6 tasks
- **US5 (Permissions Handling)**: 5 tasks

### Parallelizable Tasks: **28 tasks** marked with [P]

### Independent Test Criteria:

- **US1**: Sign in with OAuth → verify session → see profile in header → session persists
- **US2**: Authenticate → analyze repo without token input → verify results
- **US3**: Authenticate → sign out → verify redirect → verify login required for protected routes
- **US4**: Simulate expired token → verify error message → re-authenticate → verify recovery
- **US5**: Authenticate → analyze inaccessible repo → verify helpful error message

### Suggested MVP Scope:

- **Phases 1-4 only** (Setup + Foundational + US1 + US2)
- **30 critical tasks** for core OAuth authentication and token-free analysis
- Delivers immediate user value: sign in with GitHub + analyze repositories without manual token input

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label (US1-US5) maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Breaking change: AnalysisRequest DTO no longer accepts githubToken parameter
- Security: All tokens must be masked in logs using existing maskToken() utility
- Session persistence: JWT-based, 7-day expiry with 24-hour activity extension
- Middleware handles all route protection and authentication checks
