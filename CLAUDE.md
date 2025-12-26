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

### String Literal Types - Enum Pattern (MANDATORY)

When defining string literal union types, **ALWAYS** provide a constant object with the same name to avoid hardcoding strings:

✅ **CORRECT** - Constant object with derived type:

```typescript
export const SizeBucket = {
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
} as const;
export type SizeBucket = (typeof SizeBucket)[keyof typeof SizeBucket];

// Usage: SizeBucket.S instead of "S"
const bucket = SizeBucket.fromPRs(SizeBucket.S, prs, total);
```

✅ **CORRECT** - Works for any string literal type:

```typescript
export const InsightType = {
  OPTIMAL: "optimal",
  NO_DIFFERENCE: "no_difference",
  INSUFFICIENT_DATA: "insufficient_data",
} as const;
export type InsightType = (typeof InsightType)[keyof typeof InsightType];

// Usage: InsightType.OPTIMAL instead of "optimal"
if (insight.type === InsightType.OPTIMAL) { ... }
```

❌ **INCORRECT** - Hardcoded strings:

```typescript
const bucket = SizeBucket.fromPRs("S", prs, total); // Don't do this
const insight = ThroughputInsight.create("optimal", msg, "S"); // Don't do this
if (insight.type === "optimal") { ... } // Don't do this
```

**Rationale**:

- Prevents typos (compile-time checking)
- Enables IDE autocomplete
- Makes refactoring safer (rename in one place)
- Self-documenting code
- Cleaner syntax than class static properties

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
