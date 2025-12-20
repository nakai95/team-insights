# Implementation Plan: GitHub OAuth Authentication

**Branch**: `002-github-oauth` | **Date**: 2025-12-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-github-oauth/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Replace existing GitHub Personal Access Token (PAT) direct input method with OAuth 2.0 authentication flow. Users will authenticate via "Sign in with GitHub" button, with OAuth access tokens managed server-side through NextAuth.js v5. This eliminates manual token management, improves security by preventing token exposure to clients, and enables centralized session management. Existing infrastructure adapters (OctokitAdapter, SimpleGitAdapter) will be modified to retrieve tokens from session instead of accepting them as parameters.

## Technical Context

**Language/Version**: TypeScript 5.3 / Next.js 14 (App Router)
**Primary Dependencies**:

- NextAuth.js v5 (auth.js) for OAuth flow
- @octokit/rest 22.0.1 for GitHub API
- simple-git 3.30.0 for git operations
- Zod 4.1.13 for validation
- Vitest 4.0.14 for testing

**Storage**: Session data in encrypted JWT (NextAuth default), no database required initially
**Testing**: Vitest for unit tests (domain layer mandatory 80%+ coverage), Playwright for E2E critical paths
**Target Platform**: Web (Next.js 14 App Router), Server-side rendering with Server Actions
**Project Type**: Web application (single Next.js project)
**Performance Goals**:

- Authentication flow completion <30 seconds (FR-SC-001)
- Token expiration detection within 5 seconds (FR-SC-006)
- 95% first-attempt authentication success rate (FR-SC-002)

**Constraints**:

- Zero OAuth tokens in logs/errors/client-side code (FR-011, SC-003)
- Session persistence for 7 days with activity extension (FR-017, SC-005)
- Must work within Vercel 60-second timeout limit
- NextAuth.js v5 required (specified by user)

**Scale/Scope**:

- Single-user sessions (no multi-tenant complexity initially)
- Existing Clean Architecture layers preserved
- Infrastructure layer modifications only
- 5 user stories (2 P1, 2 P2, 1 P3)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Pragmatic Clean Architecture ✅ PASS

**Compliance**:

- Domain layer unchanged (no OAuth logic in domain)
- Application layer unchanged (use cases remain pure)
- Infrastructure layer modified: new NextAuthAdapter implements session management
- App layer modified: new auth route handlers, session helpers
- Presentation layer modified: UI components for auth buttons, session display

**Justification**: Authentication is infrastructure concern. Session management adapter will implement domain interfaces for token retrieval, maintaining dependency inversion. Server Components call use cases directly (existing pattern).

### II. Practical SOLID Principles ✅ PASS

**Single Responsibility**:

- NextAuthAdapter: handles ONLY session/token retrieval
- Auth route handlers: handle ONLY OAuth callback/sign-out
- OctokitAdapter/SimpleGitAdapter: modified to fetch token, retain existing responsibilities

**Interface Segregation**:

- New ISessionProvider interface for token access (focused, single method)
- Existing IGitHubAPI, IGitOperations unchanged

**Dependency Inversion**:

- Infrastructure adapters depend on ISessionProvider interface
- No direct NextAuth imports in adapters (abstracted through interface)

### III. Test Strategy ✅ PASS

**Domain Layer**: No changes required (0 new tests)
**Application Layer**: No changes required (0 new tests)
**Infrastructure Layer**:

- NextAuthAdapter unit tests (OPTIONAL per constitution - simple wrapper)
- OctokitAdapter/SimpleGitAdapter tests updated for new token source (RECOMMENDED)

**E2E Tests**:

- New critical path: OAuth login → repository analysis → results display
- Error path: OAuth denial → error message display
- Replaces old token input E2E tests

**Coverage**: Domain layer 80%+ maintained (no changes), overall deferred

### IV. Performance & Scalability ✅ PASS

**Large Repository Handling**: No changes to existing git log filtering (--since remains)
**Async Processing**: OAuth flow completes in <30 seconds, within Vercel limits
**Session Management**: JWT-based (stateless), no database queries for session validation
**Token Refresh**: Deferred to future iteration (FR-020 - prompt re-auth on expiration)

### V. Type Safety ✅ PASS

**TypeScript Strict Mode**: All new code maintains strict mode compliance
**Runtime Validation**:

- NextAuth configuration uses Zod schemas for environment variables
- Session token validation on retrieval
- Existing Zod validation for repository URL/input preserved

### VI. Security First ✅ PASS

**Token Protection**:

- OAuth tokens NEVER exposed to client (stored in server-side JWT)
- NextAuth encrypts JWT with NEXTAUTH_SECRET
- Existing maskToken utility used in all logs

**Cleanup**: No repository cleanup changes (existing try-finally preserved)
**Rate Limiting**: Existing rate limiting unchanged

### VII. Error Handling ✅ PASS

**Domain Layer**: No changes (Result types preserved)
**Application Layer**: No changes
**Infrastructure Layer**: New errors for auth failures:

- "Authentication required" → "Please sign in with GitHub to analyze repositories"
- "Token expired" → "Your session has expired. Please sign in again"
- "OAuth denied" → "GitHub authorization was cancelled. Please try again"

**Presentation Layer**: Toast notifications for auth errors (existing pattern)

### VIII. Code Quality & Discipline ✅ PASS

**Prohibited**: No `any` types, no console.log, no direct process.env access
**Required**: ESLint + Prettier (existing), pre-commit hooks (existing)
**YAGNI**: No token refresh implementation (deferred per FR-020)
**MVP Focus**: Ship OAuth flow first, iterate on advanced features

## Constitution Check Summary

**Status**: ✅ ALL GATES PASS - Ready for Phase 0 Research

**No violations detected**. Feature aligns with all constitutional principles:

- Clean Architecture: infrastructure-only changes
- SOLID: focused interfaces, dependency inversion maintained
- Testing: domain tests unchanged, E2E updated for new flow
- Performance: within Vercel limits, no database overhead
- Type Safety: strict mode throughout
- Security: tokens server-side only, encrypted JWT
- Error Handling: user-friendly messages for auth failures
- Code Quality: no anti-patterns, MVP-focused scope

## Project Structure

### Documentation (this feature)

```text
specs/002-github-oauth/
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
│   ├── interfaces/
│   │   ├── IGitHubAPI.ts           # Unchanged
│   │   ├── IGitOperations.ts       # Unchanged
│   │   └── ISessionProvider.ts     # NEW: Interface for session token access
│   ├── entities/                   # Unchanged
│   └── value-objects/              # Unchanged
│
├── application/
│   ├── use-cases/                  # Unchanged
│   ├── dto/
│   │   └── AnalysisRequest.ts      # MODIFIED: Remove githubToken field
│   └── mappers/                    # Unchanged
│
├── infrastructure/
│   ├── auth/
│   │   ├── NextAuthAdapter.ts      # NEW: Implements ISessionProvider
│   │   └── auth.config.ts          # NEW: NextAuth v5 configuration
│   ├── github/
│   │   └── OctokitAdapter.ts       # MODIFIED: Inject ISessionProvider, remove token params
│   └── git/
│       └── SimpleGitAdapter.ts     # MODIFIED: Inject ISessionProvider, format URLs with token
│
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts        # NEW: NextAuth v5 route handler
│   ├── actions/
│   │   └── analyzeRepository.ts    # MODIFIED: Remove token param, inject session provider
│   └── (authenticated)/             # NEW: Route group for protected pages
│       └── layout.tsx              # NEW: Authentication wrapper
│
└── presentation/
    └── components/
        ├── auth/
        │   ├── SignInButton.tsx    # NEW: GitHub OAuth sign-in button
        │   ├── SignOutButton.tsx   # NEW: Sign-out button
        │   └── UserProfile.tsx     # NEW: Display username/avatar
        ├── AnalysisForm.tsx        # MODIFIED: Remove token input field
        └── Header.tsx              # MODIFIED: Add user profile/auth buttons

tests/
├── unit/
│   ├── infrastructure/
│   │   └── auth/
│   │       └── NextAuthAdapter.test.ts  # NEW: Session provider tests
│   └── domain/                      # Unchanged (80%+ coverage maintained)
└── e2e/
    └── auth-flow.spec.ts            # NEW: OAuth login → analysis flow
```

**Structure Decision**: Single Next.js project (Option 1 adapted for App Router). Authentication added as new infrastructure layer component. Existing Clean Architecture layers preserved. App Router conventions followed with new `/api/auth/[...nextauth]` route and authenticated route group.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. This table is intentionally empty.
