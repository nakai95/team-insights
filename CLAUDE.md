# team-insights Development Guidelines

## Technology Stack

- **TypeScript 5.3** with strict mode enabled
- **Next.js 15** (App Router) with React 18.3
- **Authentication**: NextAuth v5 beta.30 (session data in encrypted JWT, no database)
- **Data Storage**: IndexedDB for client-side caching (no server-side database)
- **API**: @octokit/graphql 9.0.3 for GitHub GraphQL API
- **UI**: Recharts 3.5.0, next-themes 0.4.6
- **i18n**: next-intl for internationalization (ja/en locales)
- **Linting**: ESLint 9 with flat config (eslint.config.mjs)

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
pnpm test                    # Run all tests (vitest run)
pnpm test:unit               # Run tests in tests/unit directory
pnpm test:domain             # Run tests in tests/unit/domain directory (NOTE: does NOT include src/domain/__tests__)
pnpm test:watch              # Run tests in watch mode
pnpm test:coverage           # Run tests with coverage report
pnpm test:e2e                # Run Playwright E2E tests
pnpm test:e2e:ui             # Run Playwright E2E tests with UI
pnpm run lint                # Run ESLint
pnpm type-check              # TypeScript type checking (tsc --noEmit)
```

**Important Notes:**

- Tests in `src/**/__tests__/` directories are run by `pnpm test` (runs all vitest tests)
- To run specific test files: `pnpm test <path-to-test-file>`
- `pnpm test:domain` only covers `tests/unit/domain/`, NOT `src/domain/__tests__/`

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

### Internationalization (i18n) - MANDATORY

All user-facing strings MUST be internationalized using next-intl.

**✅ MUST translate:**

- UI labels, buttons, headings
- Error messages and validation messages
- Chart titles, axis labels, tooltips
- Form placeholders and helper text
- Navigation items and page titles
- Empty states and loading messages

**❌ DO NOT hardcode strings:**

```typescript
// ❌ INCORRECT
<button>Submit</button>
<h1>Dashboard</h1>

// ✅ CORRECT
import { useTranslations } from 'next-intl';

const t = useTranslations('ComponentName');
<button>{t('submit')}</button>
<h1>{t('title')}</h1>
```

**Translation file structure** (`messages/{locale}.json`):

```json
{
  "ComponentName": {
    "title": "Title text",
    "submit": "Submit",
    "description": "Description text"
  }
}
```

**Key naming convention:**

- Use PascalCase for component namespaces
- Use camelCase for keys within namespaces
- Group related translations under the same namespace

## Build Configuration

**Contract Files Exclusion**:

- `specs/**/contracts/**` are excluded from TypeScript compilation (tsconfig.json)
- `specs/**/contracts/**` are excluded from ESLint (eslint.config.mjs)
- Contract files (.ts/.tsx) in specs/ are documentation only, not executable code

## Additional Documentation

For detailed implementation patterns and examples, see:

- Progressive loading patterns: `docs/patterns/progressive-loading.md`
- Cache management: `docs/patterns/cache-management.md`

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
