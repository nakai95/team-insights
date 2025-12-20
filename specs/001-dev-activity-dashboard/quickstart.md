# Quickstart: Developer Activity Dashboard

**Feature**: 001-dev-activity-dashboard
**Date**: 2025-11-27
**Purpose**: Developer onboarding and quick reference

## Overview

This quickstart guide helps developers quickly understand and work with the Developer Activity Dashboard feature. It covers project setup from scratch, architecture overview, common development tasks, and testing.

---

## Prerequisites

**Required**:

- Node.js 20+ (LTS recommended)
- pnpm 8+
- Git
- GitHub account with personal access token

**Recommended**:

- VS Code with recommended extensions
- GitHub CLI (`gh`)

---

## Project Setup (First Time)

### 1. Initialize Next.js Project

```bash
# Create Next.js 14 project with TypeScript in current directory
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Configuration options selected**:

- ✅ TypeScript
- ✅ ESLint
- ✅ Tailwind CSS
- ✅ App Router
- ✅ `src/` directory
- ✅ Import alias `@/*`
- ❌ Turbopack (not yet)

**Note**: Using `.` as the project name will initialize in the current directory. Make sure you're in the `team-insights` directory before running this command.

---

### 2. Install Core Dependencies

```bash
# GitHub and Git integration
pnpm add @octokit/rest simple-git

# Runtime validation
pnpm add zod

# UI components (Shadcn/UI dependencies)
pnpm add @radix-ui/react-slot @radix-ui/react-toast @radix-ui/react-select
pnpm add class-variance-authority clsx tailwind-merge lucide-react

# Visualization
pnpm add recharts

# Development dependencies
pnpm add -D vitest @vitest/ui @playwright/test
pnpm add -D @types/node
pnpm add -D husky lint-staged
```

---

### 3. Configure Shadcn/UI

```bash
# Initialize Shadcn/UI
pnpm dlx shadcn-ui@latest init
```

**Configuration**:

- Style: Default
- Base color: Slate
- CSS variables: Yes

```bash
# Add essential components
pnpm dlx shadcn-ui@latest add button
pnpm dlx shadcn-ui@latest add input
pnpm dlx shadcn-ui@latest add card
pnpm dlx shadcn-ui@latest add toast
pnpm dlx shadcn-ui@latest add table
pnpm dlx shadcn-ui@latest add select
```

---

### 4. Configure TypeScript (Strict Mode)

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

### 5. Configure Vitest

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/domain/**", "src/application/**"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "**/index.ts"],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `tests/setup.ts`:

```typescript
import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

---

### 6. Configure Playwright

```bash
pnpm create playwright
```

Update `playwright.config.ts`:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

### 7. Configure Husky and Lint-Staged

```bash
# Initialize Husky
pnpm exec husky init
```

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
```

Update `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:domain": "vitest run tests/unit/domain",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "vitest related --run --passWithNoTests"
    ],
    "*.{md,json}": ["prettier --write"]
  }
}
```

---

### 8. Create Directory Structure

```bash
# Domain layer
mkdir -p src/domain/entities
mkdir -p src/domain/value-objects
mkdir -p src/domain/interfaces

# Application layer
mkdir -p src/application/use-cases
mkdir -p src/application/dto

# Infrastructure layer
mkdir -p src/infrastructure/git
mkdir -p src/infrastructure/github
mkdir -p src/infrastructure/storage
mkdir -p src/infrastructure/filesystem

# Presentation layer
mkdir -p src/presentation/components
mkdir -p src/presentation/hooks

# Lib utilities
mkdir -p src/lib/validation
mkdir -p src/lib/errors
mkdir -p src/lib/utils

# Test directories
mkdir -p tests/unit/domain/entities
mkdir -p tests/unit/domain/value-objects
mkdir -p tests/unit/application
mkdir -p tests/e2e
```

---

### 9. Create Core Utilities

Create `src/lib/result.ts`:

```typescript
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

Create `src/lib/errors/ApplicationError.ts`:

```typescript
export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}
```

---

### 10. Environment Configuration

Create `.env.example`:

```bash
# Optional: Test GitHub token for development
TEST_GITHUB_TOKEN=

# Optional: Debug logging
DEBUG=false
```

Create `.env.local` (gitignored):

```bash
TEST_GITHUB_TOKEN=ghp_your_token_here
DEBUG=true
```

---

### 11. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Architecture Overview

### Layer Structure

```
src/
├── domain/          # Pure business logic (NO dependencies)
├── application/     # Use cases (depends only on domain)
├── infrastructure/  # External adapters (Git, GitHub API)
├── presentation/    # React components
├── app/             # Next.js routes + Server Actions
└── lib/             # Shared utilities
```

### Key Principles

1. **Domain Layer**: Zero external dependencies, pure TypeScript
2. **Dependency Rule**: Dependencies point inward (infra → domain, never reverse)
3. **Server-Side Only**: All GitHub token handling happens server-side
4. **Type Safety**: Strict TypeScript mode, Zod for runtime validation

---

## Common Development Tasks

### Task 1: Add a New Domain Entity

**File**: `src/domain/entities/YourEntity.ts`

```typescript
import { Result, ok, err } from "@/lib/result";

export class YourEntity {
  private constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}

  static create(id: string, name: string): Result<YourEntity> {
    if (!name.trim()) {
      return err(new Error("Name cannot be empty"));
    }

    return ok(new YourEntity(id, name));
  }
}
```

**Test**: `tests/unit/domain/entities/YourEntity.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { YourEntity } from "@/domain/entities/YourEntity";

describe("YourEntity", () => {
  it("should create valid entity", () => {
    const result = YourEntity.create("123", "Test");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe("123");
    }
  });

  it("should reject empty name", () => {
    const result = YourEntity.create("123", "");

    expect(result.ok).toBe(false);
  });
});
```

**Run Test**:

```bash
pnpm test:unit src/domain/entities/YourEntity
```

---

### Task 2: Create a Server Action

**File**: `src/app/actions/analyzeRepository.ts`

```typescript
"use server";

import { AnalysisRequestSchema } from "@/lib/validation/schemas";
import { Result, ok, err } from "@/lib/result";
import { z } from "zod";

type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;
type AnalysisError = { code: string; message: string; details?: unknown };
type AnalysisResult = { message: string };

export async function analyzeRepository(
  request: AnalysisRequest,
): Promise<Result<AnalysisResult, AnalysisError>> {
  const validation = AnalysisRequestSchema.safeParse(request);

  if (!validation.success) {
    return err({
      code: "INVALID_INPUT",
      message: "Validation failed",
      details: validation.error.errors,
    });
  }

  // Implementation...

  return ok({ message: "Analysis complete" });
}
```

---

### Task 3: Create a UI Component

**File**: `src/presentation/components/AnalysisForm.tsx`

```typescript
'use client';

import { useState, useTransition } from 'react';
import { analyzeRepository } from '@/app/actions/analyzeRepository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

export function AnalysisForm() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await analyzeRepository({
        repositoryUrl: formData.get('repositoryUrl') as string,
        githubToken: formData.get('githubToken') as string,
      });

      if (result.ok) {
        toast({ title: 'Success', description: result.value.message });
      } else {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        name="repositoryUrl"
        placeholder="https://github.com/owner/repo"
        required
      />
      <Input
        name="githubToken"
        type="password"
        placeholder="GitHub Token"
        required
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Analyzing...' : 'Analyze Repository'}
      </Button>
    </form>
  );
}
```

---

## Testing

### Unit Tests (Vitest)

**Run all tests**:

```bash
pnpm test
```

**Run specific tests**:

```bash
pnpm test:unit
pnpm test:domain
pnpm test:watch
pnpm test:coverage
```

---

### E2E Tests (Playwright)

**Run E2E tests**:

```bash
pnpm test:e2e
pnpm test:e2e:ui
```

**Example test**:

**File**: `tests/e2e/happy-path.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test("should display home page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Team Insights/);
});
```

---

## Useful Commands

```bash
# Development
pnpm dev                 # Start dev server
pnpm build               # Build for production
pnpm start               # Start production server

# Code Quality
pnpm lint                # Run ESLint
pnpm lint:fix            # Fix ESLint errors
pnpm format              # Format with Prettier
pnpm type-check          # TypeScript type checking

# Testing
pnpm test                # Run all tests
pnpm test:unit           # Run unit tests
pnpm test:domain         # Run domain tests only
pnpm test:e2e            # Run E2E tests
pnpm test:watch          # Watch mode
pnpm test:coverage       # Coverage report
```

---

## Resources

### Documentation

- [Next.js 14 Docs](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Guide](https://vitest.dev/guide/)
- [Playwright Docs](https://playwright.dev/)
- [Shadcn/UI](https://ui.shadcn.com/)

### Project-Specific

- [Constitution](./.specify/memory/constitution.md) - Project principles
- [Data Model](./data-model.md) - Domain entities
- [API Contracts](./contracts/api-contracts.md) - Endpoint definitions
- [Research](./research.md) - Technical decisions

### External Tools

- [GitHub API Docs](https://docs.github.com/en/rest)
- [simple-git Docs](https://github.com/steveukx/git-js#readme)
- [Octokit Docs](https://octokit.github.io/rest.js/)
- [Recharts Examples](https://recharts.org/en-US/examples)

---

## Next Steps

1. **Read the Constitution**: [.specify/memory/constitution.md](./.specify/memory/constitution.md)
2. **Review Research**: [research.md](./research.md)
3. **Explore Data Model**: [data-model.md](./data-model.md)
4. **Check API Contracts**: [contracts/api-contracts.md](./contracts/api-contracts.md)
5. **Start Building**: Follow user stories in [spec.md](./spec.md)

---

**Last Updated**: 2025-11-27
**Maintained By**: Team Insights Development Team
