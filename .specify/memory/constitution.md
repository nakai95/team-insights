<!--
Sync Impact Report
==================
Version Change: NEW → 1.0.0
Rationale: Initial constitution creation for team-insights project

Principles Defined:
- I. Pragmatic Clean Architecture (Domain-driven layering with practical considerations)
- II. Practical SOLID Principles (Single Responsibility, Interface Segregation, Dependency Inversion emphasized)
- III. Test Strategy (Domain-first testing with E2E critical paths)
- IV. Performance & Scalability (Large repository handling, async processing)
- V. Type Safety (TypeScript strict mode, runtime validation)
- VI. Security First (Token protection, cleanup, rate limiting)
- VII. Error Handling (Result types, user-friendly messages)
- VIII. Code Quality & Discipline (No any types, no console.log commits, YAGNI)

Sections Added:
- Core Principles (8 principles defined)
- Development Workflow (MVP-first, 80-point delivery)
- Governance (Constitution compliance, amendment process)

Templates Requiring Updates:
✅ plan-template.md - Constitution Check section already present, aligns with principles
✅ spec-template.md - Requirements structure compatible with test strategy
✅ tasks-template.md - Test-first optional approach aligns with test strategy
⚠ commands/*.md - No commands directory found, will need alignment when created

Follow-up TODOs: None - all principles fully defined
-->

# team-insights Constitution

## Core Principles

### I. Pragmatic Clean Architecture

**Complete readability and maintainability over perfect abstraction.**

**Directory Structure:**

- `src/domain/` - Business logic, type definitions, interfaces (pure TypeScript, no external dependencies)
- `src/application/` - Use cases for data collection and analysis (depends only on domain)
- `src/infrastructure/` - External dependencies: Git (simple-git), GitHub API (@octokit/rest), filesystem
- `src/presentation/` - UI components
- `src/app/` - Next.js App Router (routes, server components)
- `specs/` - Feature specifications and planning documents (excluded from compilation/linting)

**Dependency Rules:**

- Domain layer MUST NOT depend on any other layer
- Application layer MUST depend only on domain
- Infrastructure layer MUST implement domain interfaces
- Presentation and app layers MAY use all layers

**Practical Considerations:**

- Small utility functions MAY reside in common `utils/` directory
- Next.js conventions MUST be followed (do not force abstraction against framework patterns)
- Server Components MAY call Use Cases directly without intermediate layers

**Rationale**: Clean architecture provides maintainability for the GitHub analysis domain logic while avoiding over-engineering. The pragmatic allowances prevent fighting Next.js conventions and enable rapid development for this personal project.

### II. Practical SOLID Principles

**Single Responsibility Principle (MANDATORY):**

- One class/function = one responsibility
- Example: `GitLogParser` handles ONLY git log parsing; `GitHubAPIClient` handles ONLY API calls

**Interface Segregation Principle (MANDATORY):**

- Interfaces MUST remain focused and avoid bloat
- Clients SHOULD NOT depend on methods they don't use

**Dependency Inversion Principle (MANDATORY for critical boundaries):**

- Define interfaces at important boundaries: Git operations, GitHub API interactions
- Enable easy mocking for tests

**Open/Closed & Liskov Substitution:**

- Do NOT over-apply these principles in personal development context
- Prioritize shipping functional code

**Rationale**: Single Responsibility, Interface Segregation, and Dependency Inversion provide the most practical value for testability and maintainability. The other SOLID principles are less critical for a solo developer project and should not block progress.

### III. Test Strategy

**Test File Organization (MANDATORY):**

- Test files MUST be placed in `__tests__` directories within the same directory as the code being tested
- Pattern: `src/domain/value-objects/__tests__/Email.test.ts` for testing `src/domain/value-objects/Email.ts`
- DO NOT create separate `tests/unit/` directory structure
- This keeps tests close to implementation and makes them easier to find

**Examples:**

```
✅ CORRECT:
src/domain/value-objects/Email.ts
src/domain/value-objects/__tests__/Email.test.ts

❌ INCORRECT:
src/domain/value-objects/Email.ts
tests/unit/domain/value-objects/Email.test.ts
```

**Unit Tests (Vitest) - Domain Layer:**

- Domain layer tests are **MANDATORY** (ensures business logic correctness)
- Target: 80%+ coverage in domain layer

**Unit Tests (Vitest) - Application Layer:**

- Application layer tests are **RECOMMENDED** (use mocks for dependencies)
- Focus on use case orchestration logic

**Unit Tests (Vitest) - Infrastructure Layer:**

- Infrastructure tests are **OPTIONAL** (only for complex parsing logic)
- Simple wrappers do not require tests

**Unit Tests (Vitest) - Presentation Layer:**

- Presentation tests are **OPTIONAL** (initially covered by E2E tests)

**E2E Tests (Playwright):**

- Test **ONLY critical paths** (minimal coverage to reduce maintenance burden)
  1. Happy path: URL + token input → graph display
  2. Error path: invalid token → error message display
- Use mock GitHub API server (avoid slow real API calls)

**Coverage Goals:**

- Domain: 80%+ (strict requirement)
- Overall: Defer until codebase stabilizes

**Rationale**: Domain logic is the heart of the application and must be tested thoroughly. Test files are co-located with implementation files to improve discoverability and maintainability. Other layers provide diminishing returns for testing effort in early stages. E2E tests validate integration but should be kept minimal to avoid brittleness.

### IV. Performance & Scalability

**Large Repository Handling (MANDATORY):**

- Git log operations MUST use `--since` to limit time range (default: past 6 months)
- MUST NOT use shallow clone `--depth 1` (history is required for analysis)
- GitHub API calls MUST implement pagination
- Progress indicators MUST be displayed for long operations

**Async Processing (MANDATORY):**

- Use Next.js Server Actions OR API Routes for all analysis operations
- Set appropriate timeouts (Vercel has 60-second limit on Hobby plan)
- Consider job queue (Redis, BullMQ) if timeouts become problematic (defer until needed)

**Caching (DEFERRED):**

- Not required for MVP
- Evaluate after initial launch based on actual usage patterns

**Rationale**: GitHub repositories can have massive commit histories. Without time-based filtering, the application would be unusable for popular open-source projects. Async processing and progress indicators are essential for user experience.

### V. Type Safety

**TypeScript Strict Mode (MANDATORY):**

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

**Runtime Validation (MANDATORY at boundaries):**

- User inputs (repository URL, GitHub token) MUST be validated with Zod
- External API responses (GitHub API) SHOULD use Zod schemas for type checking

**Rationale**: Compile-time type safety catches most bugs. Runtime validation at system boundaries (user input, external APIs) prevents invalid data from corrupting the system.

### VI. Security First

**Token Protection (MANDATORY):**

- GitHub tokens MUST be processed server-side ONLY
- Tokens MUST NEVER be exposed to client-side JavaScript
- Logs MUST NEVER contain tokens (mask sensitive data)

**Temporary Directory Cleanup (MANDATORY):**

- Cloned repositories MUST be deleted after analysis
- Use try-finally blocks or defer patterns to ensure cleanup

**Rate Limiting (REQUIRED):**

- Implement basic rate limiting for MVP
- Consider Redis-based rate limiting for production

**Rationale**: GitHub tokens provide broad access to user data. Leaking them would be a critical security vulnerability. Temporary directory cleanup prevents disk exhaustion on the server.

### VII. Error Handling

**Domain Layer:**

- Use Result types OR exceptions (MUST be consistent across domain layer)
- Prefer Result types for expected failures (e.g., invalid input)
- Reserve exceptions for unexpected errors

**Application Layer:**

- Transform technical errors into user-friendly messages
- Example: "Git clone failed: ssh key not found" → "Unable to access repository. Please check the URL and your access permissions."

**Presentation Layer:**

- Display errors via toast notifications OR error boundaries
- Provide actionable guidance when possible

**Rationale**: Users should never see stack traces or internal error codes. Clear, actionable error messages improve user experience and reduce support burden.

### VIII. Code Quality & Discipline

**Prohibited Practices:**

- `any` type usage (use `unknown` instead)
- Committed `console.log` statements (development-only)
- Direct environment variable access (use env schema/validation)
- Premature abstraction (YAGNI: You Aren't Gonna Need It)
- Perfectionism (ship at 80% quality, iterate based on feedback)
- Business logic changes without tests
- Hardcoded string literals for type unions (use enum-like constants instead)
- Duplicate type definitions across multiple files (violates DRY and Single Source of Truth)

**String Literal Types - Enum Pattern (MANDATORY):**

When defining string literal union types, ALWAYS provide a constant object with the same name:

```typescript
// ✅ CORRECT - Constant object with derived type
export const SizeBucket = {
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
} as const;
export type SizeBucket = (typeof SizeBucket)[keyof typeof SizeBucket];

// Usage: SizeBucket.S instead of "S"
const bucket = SizeBucket.fromPRs(SizeBucket.S, prs, total);
if (data.bucket === SizeBucket.M) { ... }

// ✅ CORRECT - Works for any string literal type
export const InsightType = {
  OPTIMAL: "optimal",
  NO_DIFFERENCE: "no_difference",
  INSUFFICIENT_DATA: "insufficient_data",
} as const;
export type InsightType = (typeof InsightType)[keyof typeof InsightType];

// ❌ INCORRECT - Hardcoded strings
const bucket = SizeBucket.fromPRs("S", prs, total);
if (insight.type === "optimal") { ... }
```

**Rationale**: Compile-time safety, IDE autocomplete, refactoring safety, self-documenting code, cleaner syntax

**Single Source of Truth for Type Definitions (MANDATORY):**

When the same type definition is needed across multiple files, define it ONCE in the most appropriate location and import it elsewhere:

```typescript
// ✅ CORRECT - Single definition in SizeBucket.ts
export const SizeBucketType = {
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
} as const;
export type SizeBucketType =
  (typeof SizeBucketType)[keyof typeof SizeBucketType];

// Other files import from the single source
import { SizeBucketType } from "./SizeBucket";

// ❌ INCORRECT - Duplicate definitions in multiple files
// PRThroughputData.ts has: export const SizeBucket = { S: "S", M: "M", L: "L", XL: "XL" };
// ThroughputInsight.ts has: export const PRSizeBucket = { S: "S", M: "M", L: "L", XL: "XL" };
// SizeBucket.ts has: export const SizeBucketType = { S: "S", M: "M", L: "L", XL: "XL" };
```

**Rationale**: Duplicate type definitions violate the DRY (Don't Repeat Yourself) principle and create maintenance burden. When the definition needs to change, it must be updated in multiple places, increasing the risk of inconsistencies.

**Required Practices:**

- ESLint + Prettier auto-formatting MUST be configured
- Pre-commit hooks (husky) MUST run lint + tests
- Comments SHOULD be used only when intent is unclear (prefer self-documenting code)

**Build Configuration:**

- `specs/**/contracts/**` MUST be excluded from TypeScript compilation (`tsconfig.json`)
- `specs/**/contracts/**` MUST be excluded from ESLint (`eslint.config.mjs`)
- Contract files are documentation only, not executable code

**Rationale**: These practices prevent common bugs, maintain code consistency, and establish quality gates. The prohibition on perfectionism recognizes that shipping functional software faster is more valuable than achieving theoretical perfection.

## Development Workflow

**Priority Hierarchy:**

1. **Ship functional MVP** - Get a working product in users' hands quickly
2. **Test coverage for domain** - Ensure business logic correctness with mandatory domain tests
3. **Refactor after validation** - Clean up code once it's proven valuable

**Development Cycle:**

- Build → Test → Ship → Gather Feedback → Refactor
- Avoid refactoring before validating with real usage
- Optimize for learning speed in early stages

**Definition of Done:**

- Feature works end-to-end for happy path
- Domain logic has ≥80% test coverage
- No `any` types, no committed console.logs
- README updated if public-facing changes

**Rationale**: Personal projects benefit from rapid iteration. Perfect code that ships in 6 months is less valuable than working code that ships in 2 weeks and improves based on real feedback.

## Governance

**Constitution Authority:**

- This constitution supersedes all other development practices
- All code reviews MUST verify constitutional compliance
- Technical debt MUST be justified against constitutional principles

**Amendment Process:**

- Amendments require: documented rationale + migration plan + version bump
- Version scheme: MAJOR.MINOR.PATCH
  - **MAJOR**: Backward-incompatible changes (principle removal/redefinition)
  - **MINOR**: New principles or material expansions
  - **PATCH**: Clarifications, wording fixes, non-semantic changes
- Amendments MUST update dependent templates (plan, spec, tasks)

**Compliance Review:**

- Constitution Check in plan-template.md MUST be completed before Phase 0 research
- Re-check after Phase 1 design
- Implementation MUST NOT proceed with unresolved violations

**Complexity Justification:**

- Any deviation from constitutional principles MUST be documented in Complexity Tracking table
- Justification MUST explain why simpler alternatives were insufficient

**Version**: 1.0.0 | **Ratified**: 2025-11-27 | **Last Amended**: 2025-11-27
