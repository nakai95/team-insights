# Quickstart: Progressive Data Loading Implementation

**Feature**: 007-progressive-loading
**Date**: 2026-02-06
**For**: Developers implementing progressive loading feature

## Overview

This guide provides a step-by-step implementation path for the progressive loading feature, following clean architecture principles and constitutional requirements.

---

## Prerequisites

1. **Read Required Documents**:
   - [spec.md](./spec.md) - Feature requirements and user stories
   - [data-model.md](./data-model.md) - Entity and value object specifications
   - [research.md](./research.md) - Technology decisions and rationale
   - [plan.md](./plan.md) - Constitutional compliance and project structure

2. **Install Dependencies**:

```bash
pnpm add idb  # IndexedDB wrapper only (no Zustand - using URL params + component state)
pnpm add -D @types/fake-indexeddb fake-indexeddb
```

3. **Verify Environment**:
   - TypeScript 5.3+ strict mode enabled
   - Next.js 15 App Router
   - React 18.3+
   - Existing auth with NextAuth v5

---

## Implementation Phases

### Phase 1: Domain Layer (Days 1-2)

**Goal**: Implement pure business logic with zero external dependencies.

#### Step 1.1: Value Objects

Create in `src/domain/value-objects/`:

**CacheKey.ts**:

```typescript
export class CacheKey {
  private constructor(private readonly _value: string) {}

  static create(
    repositoryId: string,
    dataType: DataType,
    dateRange: DateRange,
  ): Result<CacheKey> {
    // Validation logic
    const value = `${repositoryId}:${dataType}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
    return Result.ok(new CacheKey(value));
  }

  get value(): string {
    return this._value;
  }

  equals(other: CacheKey): boolean {
    return this._value === other._value;
  }
}
```

**DateRange.ts**:

```typescript
export class DateRange {
  private constructor(
    public readonly start: Date,
    public readonly end: Date,
  ) {}

  static create(start: Date, end: Date): Result<DateRange> {
    if (end <= start) {
      return Result.fail("End date must be after start date");
    }
    return Result.ok(new DateRange(start, end));
  }

  static last30Days(): DateRange {
    const end = new Date();
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return new DateRange(start, end);
  }

  get durationDays(): number {
    return (this.end.getTime() - this.start.getTime()) / (24 * 60 * 60 * 1000);
  }
}
```

**LoadingProgress.ts**: Similar pattern

**Test Requirements** (MANDATORY per constitution):

- Create `__tests__/CacheKey.test.ts` alongside CacheKey.ts
- Create `__tests__/DateRange.test.ts` alongside DateRange.ts
- Target: 80%+ coverage

#### Step 1.2: Enums (String Literal Types)

Create in `src/domain/types/`:

**LoadingTypes.ts**:

```typescript
export const LoadingType = {
  INITIAL: "initial",
  BACKGROUND: "background",
  CUSTOM: "custom",
} as const;
export type LoadingType = (typeof LoadingType)[keyof typeof LoadingType];

export const LoadingStatus = {
  IDLE: "idle",
  LOADING: "loading",
  COMPLETE: "complete",
  ERROR: "error",
} as const;
export type LoadingStatus = (typeof LoadingStatus)[keyof typeof LoadingStatus];

// ... other enums
```

#### Step 1.3: Entities

Create in `src/domain/entities/`:

**CachedDataEntry.ts**:

```typescript
export class CachedDataEntry {
  private constructor(
    public readonly key: CacheKey,
    public readonly repositoryId: string,
    public readonly dataType: DataType,
    public readonly dateRange: DateRange,
    public readonly data: unknown,
    public readonly cachedAt: Date,
    public readonly expiresAt: Date,
    public readonly lastAccessedAt: Date,
    public readonly size: number,
    public readonly isRevalidating: boolean,
  ) {}

  static create(
    repositoryId: string,
    dataType: DataType,
    dateRange: DateRange,
    data: unknown,
    ttl: number,
  ): Result<CachedDataEntry> {
    // Validation
    const keyResult = CacheKey.create(repositoryId, dataType, dateRange);
    if (!keyResult.success) return Result.fail(keyResult.error);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl);

    return Result.ok(
      new CachedDataEntry(
        keyResult.value,
        repositoryId,
        dataType,
        dateRange,
        data,
        now,
        expiresAt,
        now,
        JSON.stringify(data).length,
        false,
      ),
    );
  }

  isStale(): boolean {
    return new Date() > this.expiresAt;
  }

  touch(): CachedDataEntry {
    return new CachedDataEntry(
      this.key,
      this.repositoryId,
      this.dataType,
      this.dateRange,
      this.data,
      this.cachedAt,
      this.expiresAt,
      new Date(), // Updated lastAccessedAt
      this.size,
      this.isRevalidating,
    );
  }
}
```

**LoadingState.ts**: Similar pattern
**DateRangeSelection.ts**: Similar pattern

**Test Requirements**: `__tests__/` directories with unit tests for each entity

#### Step 1.4: Repository Interfaces

Create in `src/domain/repositories/`:

**ICacheRepository.ts**: Copy from [contracts/index.ts](./contracts/index.ts)
**IDataLoader.ts**: Copy from contracts
**ILoadingStateManager.ts**: Copy from contracts

---

### Phase 2: Infrastructure Layer (Days 3-5)

**Goal**: Implement external dependencies (IndexedDB, GraphQL, Zustand).

#### Step 2.1: IndexedDB Adapter

Create `src/infrastructure/cache/IndexedDBAdapter.ts`:

```typescript
import { openDB, IDBPDatabase } from "idb";
import type { ICacheRepository } from "@/domain/repositories/ICacheRepository";
import { CachedDataEntry } from "@/domain/entities/CachedDataEntry";

export class IndexedDBAdapter implements ICacheRepository {
  private db?: IDBPDatabase;

  async init(): Promise<void> {
    this.db = await openDB("team-insights-cache", 1, {
      upgrade(db) {
        const store = db.createObjectStore("cacheEntries", { keyPath: "key" });
        store.createIndex("timestamp", "cachedAt");
        store.createIndex("repoId", "repositoryId");
      },
    });
  }

  async get(key: CacheKey): Promise<CachedDataEntry | null> {
    if (!this.db) throw new Error("IndexedDB not initialized");

    const raw = await this.db.get("cacheEntries", key.value);
    if (!raw) return null;

    // Deserialize and validate with Zod
    const result = CachedDataEntry.fromRaw(raw);
    if (!result.success) return null;

    const entry = result.value;

    // TTL check
    if (entry.isStale()) {
      await this.delete(key);
      return null;
    }

    // Touch for LRU
    const touched = entry.touch();
    await this.db.put("cacheEntries", touched);

    return touched;
  }

  async set(entry: CachedDataEntry): Promise<void> {
    if (!this.db) throw new Error("IndexedDB not initialized");

    await this.db.put("cacheEntries", entry);

    // Check storage quota and evict if needed
    await this.evictIfNeeded();
  }

  private async evictIfNeeded(): Promise<void> {
    const allEntries = await this.getAll();
    if (allEntries.length > CacheConfig.MAX_ENTRIES) {
      // Sort by lastAccessedAt (LRU)
      const sorted = allEntries.sort(
        (a, b) => a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime(),
      );

      // Remove oldest 10%
      const toRemove = Math.ceil(allEntries.length * 0.1);
      for (let i = 0; i < toRemove; i++) {
        await this.delete(sorted[i].key);
      }
    }
  }

  // ... other methods
}
```

**Test Requirements**: Use `fake-indexeddb` for testing

- `__tests__/IndexedDBAdapter.test.ts`
- Mock IndexedDB environment
- Test LRU eviction logic

#### Step 2.2: In-Memory Cache Adapter (Fallback)

Create `src/infrastructure/cache/InMemoryCacheAdapter.ts`:

```typescript
import type { ICacheRepository } from "@/domain/repositories/ICacheRepository";
import { CachedDataEntry } from "@/domain/entities/CachedDataEntry";

/**
 * Fallback cache adapter when IndexedDB is unavailable
 * (Safari private mode, storage quota exceeded, etc.)
 */
export class InMemoryCacheAdapter implements ICacheRepository {
  private cache = new Map<string, CachedDataEntry>();

  async get(key: CacheKey): Promise<CachedDataEntry | null> {
    const entry = this.cache.get(key.value);
    if (!entry) return null;

    // TTL check
    if (entry.isStale()) {
      this.cache.delete(key.value);
      return null;
    }

    // Touch for LRU
    const touched = entry.touch();
    this.cache.set(key.value, touched);

    return touched;
  }

  async set(entry: CachedDataEntry): Promise<void> {
    this.cache.set(entry.key.value, entry);

    // Check memory size and evict if needed
    await this.evictIfNeeded();
  }

  private async evictIfNeeded(): Promise<void> {
    const MAX_SIZE_MB = 50;
    const allEntries = Array.from(this.cache.values());
    const totalSize = allEntries.reduce((sum, e) => sum + e.size, 0);

    if (totalSize > MAX_SIZE_MB * 1024 * 1024) {
      // Sort by lastAccessedAt (LRU)
      const sorted = allEntries.sort(
        (a, b) => a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime(),
      );

      // Remove oldest 20%
      const toRemove = Math.ceil(allEntries.length * 0.2);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(sorted[i].key.value);
      }
    }
  }

  // ... other methods
}
```

**Note**: Loading state is managed at component level using React useState/useTransition (no global state library per spec clarifications)

#### Step 2.3: GraphQL Batch Loader

Create `src/infrastructure/api/GraphQLBatchLoader.ts`:

```typescript
import { graphql } from "@octokit/graphql";
import type { IDataLoader } from "@/domain/repositories/IDataLoader";

export class GraphQLBatchLoader implements IDataLoader {
  constructor(private graphqlWithAuth: typeof graphql) {}

  async fetchPRs(
    repositoryId: string,
    dateRange: DateRange,
    signal?: AbortSignal,
  ): Promise<Result<PullRequest[]>> {
    const [owner, repo] = repositoryId.split("/");

    try {
      const response = await this.graphqlWithAuth(PULL_REQUESTS_QUERY, {
        owner,
        repo,
        since: dateRange.start.toISOString(),
        until: dateRange.end.toISOString(),
        first: 100,
        request: { signal },
      });

      const prs = response.repository.pullRequests.nodes.map(mapPullRequest);
      return Result.ok(prs);
    } catch (error) {
      if (error.name === "AbortError") {
        return Result.fail("Request cancelled");
      }
      return Result.fail(`Failed to fetch PRs: ${error.message}`);
    }
  }

  // ... other methods
}
```

---

### Phase 3: Application Layer (Days 6-7)

**Goal**: Implement use cases that orchestrate domain and infrastructure.

#### Step 3.1: LoadInitialData Use Case

Create `src/application/use-cases/LoadInitialData.ts`:

```typescript
export class LoadInitialData {
  constructor(
    private cache: ICacheRepository,
    private loader: IDataLoader,
  ) {}

  async execute(
    repositoryId: string,
    dateRange: DateRange,
    abortSignal?: AbortSignal,
  ): Promise<Result<InitialData>> {
    // 1. Check cache
    const cacheKey = CacheKey.create(repositoryId, DataType.PRS, dateRange);

    if (!cacheKey.success) {
      return Result.fail(cacheKey.error);
    }

    const cached = await this.cache.get(cacheKey.value);
    if (cached && !cached.isStale()) {
      return Result.ok({ prs: cached.data as PullRequest[], fromCache: true });
    }

    try {
      // 2. Fetch from API (parallel for all 3 streams)
      const [prsResult, deploymentsResult, commitsResult] = await Promise.all([
        this.loader.fetchPRs(repositoryId, dateRange, abortSignal),
        this.loader.fetchDeployments(repositoryId, dateRange, abortSignal),
        this.loader.fetchCommits(repositoryId, dateRange, abortSignal),
      ]);

      if (!prsResult.success) {
        return Result.fail(prsResult.error);
      }

      // 3. Cache the results
      const entryResult = CachedDataEntry.create(
        repositoryId,
        DataType.PRS,
        dateRange,
        prsResult.value,
        CacheConfig.ACTIVE_REPO_TTL,
      );

      if (entryResult.success) {
        await this.cache.set(entryResult.value);
      }

      return Result.ok({
        prs: prsResult.value,
        deployments: deploymentsResult.success ? deploymentsResult.value : [],
        commits: commitsResult.success ? commitsResult.value : [],
        fromCache: false,
      });
    } catch (error) {
      return Result.fail(error.message);
    }
  }
}
```

**Test Requirements**: Mock dependencies (cache, loader, loadingManager)

- Test cache hit path
- Test cache miss path
- Test parallel loading
- Test error handling

#### Step 3.2: LoadHistoricalData Use Case

Similar pattern, implement chunked background loading with rate limit awareness.

#### Step 3.3: GetCachedData Use Case

Simple cache retrieval with staleness checking.

---

### Phase 4: Presentation Layer (Days 8-10)

**Goal**: Build React hooks and components for UI integration.

#### Step 4.1: useProgressiveLoading Hook

Create `src/presentation/hooks/useProgressiveLoading.ts`:

```typescript
"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { LoadInitialData } from "@/application/use-cases/LoadInitialData";
import { LoadHistoricalData } from "@/application/use-cases/LoadHistoricalData";

export function useProgressiveLoading(
  repositoryId: string,
  initialData: InitialData,
  dateRange: DateRange,
) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef(new AbortController());

  useEffect(() => {
    const abortController = abortControllerRef.current;

    // Background historical load (component-level state management)
    startTransition(async () => {
      try {
        const loadHistorical = new LoadHistoricalData(cache, loader);
        await loadHistorical.execute(
          repositoryId,
          dateRange,
          (batch) => {
            // Non-blocking update with startTransition
            setData((prev) => mergeBatchData(prev, batch));
          },
          abortController.signal,
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      }
    });

    return () => abortController.abort();
  }, [repositoryId, dateRange]);

  return {
    data,
    isPending, // useTransition's isPending flag
    error,
  };
}

function mergeBatchData(
  prev: InitialData,
  batch: HistoricalBatch,
): InitialData {
  return {
    prs: [...prev.prs, ...batch.prs],
    deployments: [...prev.deployments, ...batch.deployments],
    commits: [...prev.commits, ...batch.commits],
  };
}
```

**Key Differences from Global State**:

- No Zustand - component-level useState/useTransition
- No loading state manager - useTransition's isPending flag
- Each component independently manages its own background loading
- Date range passed as prop from URL params (Server Component reads them)

#### Step 4.2: DateRangePicker Component

Install shadcn/ui calendar:

```bash
npx shadcn-ui@latest add calendar
```

Copy date-range-picker component from:
https://github.com/johnpolackin/date-range-picker-for-shadcn

Customize presets:

```typescript
const presets = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "Last 6 months", value: 180 },
  { label: "Last 1 year", value: 365 },
  { label: "Custom", value: null },
];
```

#### Step 4.3: Loading Indicators

Create `src/presentation/components/LoadingIndicator.tsx`:

```typescript
'use client';

import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';

export function LoadingIndicator({ loadingState }: { loadingState: LoadingState }) {
  if (loadingState.status === LoadingStatus.IDLE) return null;

  if (loadingState.status === LoadingStatus.LOADING) {
    return (
      <div className="flex items-center gap-2">
        <Spinner size="sm" />
        <span className="text-sm text-muted-foreground">
          {loadingState.loadingType === LoadingType.INITIAL
            ? "Loading recent data (last 30 days)..."
            : `Loading historical data... (${loadingState.progress.percentage}%)`}
        </span>
      </div>
    );
  }

  if (loadingState.status === LoadingStatus.ERROR) {
    return (
      <Badge variant="destructive">
        Error: {loadingState.error?.message}
      </Badge>
    );
  }

  return null;
}
```

---

## Testing Strategy

### Domain Layer Tests (MANDATORY)

- **Target**: 80%+ coverage
- **Location**: `src/domain/**/__tests__/`
- **Tools**: Vitest
- **Pattern**: Test value objects, entities, validation rules

**Example**:

```typescript
// src/domain/value-objects/__tests__/DateRange.test.ts
import { describe, it, expect } from "vitest";
import { DateRange } from "../DateRange";

describe("DateRange", () => {
  it("should create valid date range", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");
    const result = DateRange.create(start, end);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.durationDays).toBe(30);
    }
  });

  it("should reject end before start", () => {
    const start = new Date("2024-01-31");
    const end = new Date("2024-01-01");
    const result = DateRange.create(start, end);

    expect(result.success).toBe(false);
  });
});
```

### Application Layer Tests (RECOMMENDED)

- **Location**: `src/application/**/__tests__/`
- **Tools**: Vitest with mocks
- **Pattern**: Mock dependencies (cache, loader, loadingManager)

### E2E Tests (CRITICAL PATHS)

- **Tools**: Playwright
- **Paths**:
  1. Initial 30-day load within 5s
  2. Background historical load without blocking UI
  3. Cache retrieval on subsequent visits

---

## Configuration Checklist

- [ ] Add `idb` to dependencies (no Zustand - using URL params + component state)
- [ ] Configure `specs/**/contracts/**` exclusion in `tsconfig.json`
- [ ] Configure `specs/**/contracts/**` exclusion in `eslint.config.mjs`
- [ ] Verify strict TypeScript mode enabled
- [ ] Ensure pre-commit hooks run tests
- [ ] Configure fake-indexeddb for test environment

---

## Common Pitfalls

1. **IndexedDB in SSR**: Always initialize in client components with `"use client"` directive
2. **AbortController reuse**: Create new instance for each operation (single-use only)
3. **Component re-renders**: Use React.memo and careful dependency arrays in useEffect to prevent unnecessary re-renders
4. **Date serialization**: Store dates as ISO strings in IndexedDB, deserialize on read
5. **Race conditions**: Check abortSignal.aborted before setState to prevent updates after unmount

---

## Performance Targets

| Metric                     | Target | How to Measure                         |
| -------------------------- | ------ | -------------------------------------- |
| Initial 30-day load        | <5s    | `performance.mark()` in use case       |
| Cached data load           | <1s    | IndexedDB get time                     |
| Date range change (cached) | <500ms | React DevTools Profiler                |
| Background historical load | <30s   | Loading progress monitoring            |
| UI interaction response    | <200ms | React DevTools Profiler during loading |

---

## Next Steps

1. Start with Phase 1 (Domain Layer)
2. Write tests FIRST for each value object/entity
3. Run `pnpm test:domain` after each implementation
4. Move to Phase 2 only after domain tests pass
5. Follow constitutional requirements throughout

---

## Support

- **Questions**: Refer to [spec.md](./spec.md), [data-model.md](./data-model.md), [research.md](./research.md)
- **Constitutional compliance**: See [plan.md](./plan.md) Constitution Check section
- **Architecture patterns**: Follow existing patterns in `src/domain/`, `src/application/`, `src/infrastructure/`

**Document Status**: Complete
**Last Updated**: 2026-02-06
