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
│   └── services/     # Application services (e.g., AnalyticsDataService)
├── infrastructure/   # External dependencies (Git, GitHub API, filesystem)
├── presentation/     # UI components
│   └── components/
│       ├── features/ # Feature modules (analytics, contributors)
│       ├── layout/   # App-wide layout components
│       └── shared/   # Cross-feature shared components
└── app/              # Next.js App Router (routes, server components)
    └── [locale]/
        └── (route-group)/
            ├── page.tsx
            ├── _components/  # Route-private components (with _ prefix)
            └── _lib/         # Route-private utilities (with _ prefix)
```

## Component Organization (MANDATORY)

This project follows a **Feature-Based Component Organization** strategy to maintain Clean Architecture principles while providing clear ownership boundaries.

### Core Principles

1. **Clean Architecture**: Presentation layer NEVER imports from `app/` directory (except within the same route)
2. **Feature Modules**: Components are organized by feature domain, not technical type
3. **Private Folders**: Use `_` prefix for route-specific code (`_components/`, `_lib/`)
4. **Barrel Exports**: Each feature module exports through `index.ts` for clean imports

### Component Placement Rules

#### 1. Feature Modules (`src/presentation/components/features/`)

**Use when:**

- Component is reusable within a feature domain
- Component has clear feature ownership
- Component is used by multiple routes or tabs within the feature

**Examples:**

```typescript
// Analytics feature
features/analytics/
├── components/      # HeroMetrics, HeroMetricCard, IdentityMerger
│   └── IdentityMerger/
│       ├── hooks/   # useIdentityMerge (component-specific hooks)
│       ├── IdentityMerger.tsx
│       └── index.ts
├── widgets/         # PRTrendsWidget, DORAMetricsWidget
│   └── components/  # Widget-specific components (TimeseriesChart, EmptyState)
├── tabs/           # TeamTab, OverviewTab, TeamTabHeader
├── skeletons/      # Loading states
└── shared/         # Feature-specific utilities (MetricCardError)

// Contributors feature
features/contributors/
├── ContributorList.tsx
└── ImplementationActivityChart.tsx
```

**Import pattern:**

```typescript
// ✅ Use barrel export
import {
  PRTrendsWidget,
  TeamTab,
  IdentityMerger,
} from "@/presentation/components/features/analytics";
import { ContributorList } from "@/presentation/components/features/contributors";
```

#### 2. Layout Components (`src/presentation/components/layout/`)

**Use when:**

- Component is part of app-wide layout structure
- Component is used across route groups
- Component defines visual boundaries (header, sidebar, footer)

**Examples:**

```typescript
layout/
├── AppHeader.tsx
├── AppSidebar.tsx
├── AppFooter.tsx
├── SimpleHeader.tsx
├── DateRangePicker.tsx
└── RepositorySwitcher.tsx
```

**Import pattern:**

```typescript
import { AppHeader, AppSidebar } from "@/presentation/components/layout";
```

#### 3. Shared Components (`src/presentation/components/shared/`)

**Use when:**

- Component is used across multiple feature domains
- Component is truly generic (not feature-specific)
- Component provides cross-cutting concerns

**Examples:**

```typescript
shared/
├── SkeletonChart.tsx
├── ThemeToggle/
└── LocaleSwitcher/
```

**Import pattern:**

```typescript
import { SkeletonChart } from "@/presentation/components/shared";
```

#### 4. Route-Private Components (`app/[locale]/(route-group)/_components/`)

**Use when:**

- Component is used ONLY in one specific route
- Component will NEVER be reused elsewhere
- Component is tightly coupled to route-specific logic

**IMPORTANT:** Always use `_components` prefix (not `components`)

**Import pattern:**

```typescript
// ✅ Relative import (same route only)
import { SettingsForm } from "./_components/SettingsForm";

// ❌ Never import from other routes
import { SettingsForm } from "@/app/[locale]/(app)/settings/_components/SettingsForm";
```

#### 5. Route Utilities (`app/[locale]/(route-group)/_lib/`)

**Use when:**

- Utility is route-specific (not reusable across routes)
- Utility is a thin adapter to application services
- Server actions that are route-specific
- Data fetchers using React `cache()`

**Examples:**

```typescript
analytics/_lib/
├── data-fetchers.ts   # Thin adapters using cache()
├── actions.ts         # Server actions
└── contributor-fetcher.ts
```

**Pattern:**

```typescript
// In _lib/data-fetchers.ts
import { cache } from "react";
import { createAnalyticsDataService } from "@/application/services/analytics";

export const getCachedPRs = cache(
  async (repositoryId: string, dateRange: DateRange) => {
    const service = createAnalyticsDataService();
    return await service.getPRs(repositoryId, dateRange);
  },
);
```

**Import pattern:**

```typescript
// ✅ From within same route
import { getCachedPRs } from "./_lib/data-fetchers";

// ❌ Never import from other routes
import { getCachedPRs } from "@/app/[locale]/(app)/analytics/_lib/data-fetchers";
```

### Application Services Layer

For reusable business logic and data fetching, create services in `src/application/services/`:

```typescript
// src/application/services/analytics/AnalyticsDataService.ts
export class AnalyticsDataService {
  constructor(private githubAdapter: OctokitAdapter) {}

  async getPRs(repositoryId: string, dateRange: DateRange) {
    const [owner, repo] = repositoryId.split("/");
    return await this.githubAdapter.getPullRequests(
      owner,
      repo,
      dateRange.start,
    );
  }
}

// Factory function
export function createAnalyticsDataService(): AnalyticsDataService {
  const sessionProvider = createSessionProvider();
  const githubAdapter = new OctokitAdapter(sessionProvider);
  return new AnalyticsDataService(githubAdapter);
}
```

**Benefits:**

- Maintains Clean Architecture (no presentation → app imports)
- Services are easily testable
- Can be reused across routes
- Clear separation of concerns

### Import Path Conventions

**✅ CORRECT - Absolute imports for cross-module:**

```typescript
import { PRTrendsWidget } from "@/presentation/components/features/analytics";
import { ContributorList } from "@/presentation/components/features/contributors";
import { createAnalyticsDataService } from "@/application/services/analytics";
import { DateRange } from "@/domain/value-objects/DateRange";
```

**✅ CORRECT - Relative imports for same module:**

```typescript
// Within same feature module
import { PRTrendsChart } from "./components/PRTrendsChart";

// Within same route
import { SettingsForm } from "./_components/SettingsForm";
import { getCachedPRs } from "./_lib/data-fetchers";
```

**❌ PROHIBITED - Never import app directory from presentation:**

```typescript
// ❌ Architectural violation
import { getCachedPRs } from "@/app/[locale]/(app)/analytics/data-fetchers";

// ❌ Never cross route boundaries for private code
import { SettingsForm } from "@/app/[locale]/(app)/settings/_components/SettingsForm";
```

### File Naming Conventions

1. **Components**: PascalCase matching component name (`ContributorList.tsx`)
2. **Barrel exports**: Always `index.ts`
3. **Private folders**: Use `_` prefix (`_components/`, `_lib/`)
4. **Utilities**: camelCase or kebab-case (`data-fetchers.ts`, `actions.ts`)
5. **Services**: PascalCase with suffix (`AnalyticsDataService.ts`)

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

**Translation file structure** (`src/i18n/messages/{locale}.json`):

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
