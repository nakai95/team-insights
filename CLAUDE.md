# team-insights Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-25

## Active Technologies

- TypeScript 5.3 / Next.js 15 (App Router)
- React 18.3, Recharts 3.5.0, @octokit/rest 22.0.1
- NextAuth v5 beta.30 (session data in encrypted JWT, no database)
- ESLint 9 with flat config (eslint.config.mjs)

## Project Structure

```text
src/
├── domain/           # Business logic (no external dependencies)
├── application/      # Use cases (depends only on domain)
├── infrastructure/   # External dependencies (Git, GitHub API, filesystem)
├── presentation/     # UI components
└── app/              # Next.js App Router (routes, server components)
```

## Test File Organization

**MANDATORY**: Test files MUST be placed in `__tests__` directories within the same directory as the code being tested.

✅ **CORRECT**:

```
src/domain/value-objects/Email.ts
src/domain/value-objects/__tests__/Email.test.ts
```

❌ **INCORRECT**:

```
src/domain/value-objects/Email.ts
tests/unit/domain/value-objects/Email.test.ts
```

## Commands

```bash
pnpm test           # Run all tests
pnpm run lint       # Run ESLint
pnpm type-check     # TypeScript type checking
pnpm test:domain    # Run domain layer tests only
```

## Code Style

- TypeScript strict mode enabled
- No `any` types allowed (use `unknown` instead)
- ESLint 9 flat config in eslint.config.mjs
- Follow Next.js 15 conventions
- Domain-driven design with clean architecture

## Build Configuration

**Contract Files Exclusion**:

- `specs/**/contracts/**` are excluded from TypeScript compilation (tsconfig.json)
- `specs/**/contracts/**` are excluded from ESLint (eslint.config.mjs)
- Contract files (.ts/.tsx) in specs/ are documentation only, not executable code

## Recent Changes

- 2025-12-25: Added PR Throughput Analysis feature (003-pr-throughput-analysis)
- 2025-12-23: Upgraded to Next.js 15.5.9 and ESLint 9.39.2
- 002-github-oauth: Added GitHub OAuth integration
- 001-dev-activity-dashboard: Initial dashboard implementation

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
