# Research: Progressive Data Loading Technology Decisions

**Date**: 2026-02-06
**Feature**: Progressive Data Loading (007-progressive-loading)
**Status**: Complete

This document consolidates all technology decisions for Team Insights' progressive loading feature based on comprehensive research of available libraries, patterns, and best practices.

---

## Executive Summary

### Technology Decisions

| Decision Area          | Selected Technology                   | Bundle Impact | Rationale                                                          |
| ---------------------- | ------------------------------------- | ------------- | ------------------------------------------------------------------ |
| **IndexedDB Wrapper**  | idb 8.x                               | +1.19 KB      | Minimal overhead, TypeScript excellence, 20x smaller than Dexie.js |
| **Date Range Picker**  | shadcn/ui + react-day-picker v9       | 0 KB          | Zero new dependencies, perfect dark mode, presets included         |
| **State Management**   | Zustand                               | +1 KB         | Fine-grained reactivity, DevTools, minimal complexity              |
| **Cache Invalidation** | Stale-While-Revalidate (1hr TTL)      | 0 KB          | Best UX, 75% API reduction, industry standard                      |
| **Query Batching**     | Hybrid Waterfall (Parallel + Chunked) | 0 KB          | Meets 5s target, progressive enhancement, graceful degradation     |
| **Background Loading** | React 18 startTransition              | 0 KB          | Zero overhead, native React 18, non-blocking updates               |

**Total Bundle Impact**: ~2.2 KB gzipped

### Key Clarifications Resolved

1. **IndexedDB Wrapper**: Use `idb` library for promise-based IndexedDB with TypeScript support
2. **Date Range Picker**: Use shadcn/ui date-range-picker component (copy-paste, no new dependencies)
3. **Loading State Management**: Use Zustand for concurrent stream tracking with fine-grained reactivity
4. **Cache Invalidation**: Implement hybrid TTL + manual refresh with stale-while-revalidate pattern
5. **GraphQL Batching**: Use hybrid waterfall (initial 30-day parallel + background chunked loading)
6. **Background Worker**: Use React 18 `startTransition` for non-blocking state updates (no Web Workers)

---

## Research Topics

### 1. IndexedDB Wrapper Library

### 2. Date Range Picker Component

### 3. Loading State Management

### 4. Cache Invalidation Strategy

### 5. GraphQL Query Batching

### 6. Background Loading Implementation

---

## 1. IndexedDB Wrapper Library Decision

### Recommendation: **idb (by Jake Archibald/Google)**

**Version**: 8.x
**Bundle Size**: ~1.19 KB brotli'd
**Weekly Downloads**: 11.5M
**Repository**: https://github.com/jakearchibald/idb

### Rationale

1. **Minimal Bundle Impact**: 20x smaller than Dexie.js (1.19 KB vs 26-29 KB)
2. **Simple CRUD Requirements**: Our cache needs basic get/set/delete - no complex queries needed
3. **TypeScript Excellence**: First-class TypeScript support with `IDBPDatabase` typed interfaces
4. **Near-Native Performance**: Thin promise wrapper with negligible overhead
5. **Maintenance**: Maintained by Google Chrome team, 11.5M weekly downloads

### Alternatives Rejected

- **Dexie.js**: Larger bundle (26-29 KB), feature overkill for simple key-value operations
- **Native IndexedDB API**: Poor TypeScript ergonomics (callback-based), 3-5x more boilerplate

### Implementation

```bash
pnpm add idb
pnpm add -D @types/fake-indexeddb fake-indexeddb # For testing
```

---

## 2. Date Range Picker Component Decision

### Recommendation: **shadcn/ui Date Range Picker**

**Dependencies**: react-day-picker v9, date-fns (already installed)
**Bundle Impact**: 0 KB (copy-paste architecture)
**Repository**: https://github.com/johnpolackin/date-range-picker-for-shadcn

### Rationale

1. **Zero Learning Curve**: Uses same Radix UI + Tailwind patterns already in codebase
2. **Perfect Dark Mode**: Built-in next-themes support with automatic switching
3. **Presets Included**: 9 default presets (Last 7/14/30/90 days) - easily customizable
4. **Architecture Alignment**: Fits seamlessly with existing component patterns
5. **Accessibility**: Full WCAG 2.1 support with keyboard navigation

### Alternatives Rejected

- **react-datepicker**: Manual dark mode implementation, 43% larger bundle
- **@mui/x-date-pickers**: Massive bundle overhead (requires entire MUI ecosystem)
- **Native HTML5**: Accessibility issues, inconsistent browser styling

### Implementation

```bash
npx shadcn-ui@latest add calendar
# Copy date-range-picker from: https://github.com/johnpolackin/date-range-picker-for-shadcn
```

---

## 3. Loading State Management Decision

### Recommendation: **Zustand**

**Version**: Latest
**Bundle Size**: ~1 KB gzipped
**Weekly Downloads**: ~4M
**Repository**: https://zustand.docs.pmnd.rs/

### Rationale

1. **Perfect Balance**: Low complexity with high power (fine-grained reactivity)
2. **Fine-Grained Reactivity**: Components only re-render when their slice changes
3. **DevTools Integration**: Redux DevTools extension support out-of-box
4. **TypeScript Excellence**: Matches project's strict mode requirements
5. **Next.js 15 Compatible**: Recommended for 2026 App Router patterns

### Alternatives Rejected

- **React Context + useReducer**: Manual optimization requirements, more boilerplate
- **TanStack Query**: Larger bundle (10 KB), opinionated patterns conflict with custom logic
- **useReducer Only**: Cannot share state across components, difficult concurrent coordination

### Implementation

```typescript
// src/infrastructure/stores/useProgressiveLoadingStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useProgressiveLoadingStore = create<LoadingStore>()(
  devtools(
    (set) => ({
      streams: { prs: {...}, deployments: {...}, commits: {...} },
      startStream: (type, loadingType) => set(...),
      updateProgress: (type, progress, eta) => set(...),
    }),
    { name: 'ProgressiveLoadingStore' }
  )
);

// Component usage (only re-renders when PR progress changes)
const prProgress = useProgressiveLoadingStore((state) => state.streams.prs.progress);
```

```bash
pnpm add zustand
```

---

## 4. Cache Invalidation Strategy Decision

### Recommendation: **Hybrid TTL + Manual Refresh (Stale-While-Revalidate)**

### Configuration

- **Active repositories**: 1 hour TTL
- **Archived repositories**: 24 hour TTL
- **Historical data** (>90 days): 7 day TTL
- **Rate limit safety**: Pause revalidation when < 10% remaining

### Rationale

1. **Best UX**: Serve cached data instantly, update in background (no blocking loads)
2. **API Efficiency**: 75% reduction in API requests (meets SC-008: >70% cache hit rate)
3. **Adaptive Freshness**: Short TTL for active repos, long TTL for archived
4. **Rate Limit Aware**: Pauses background revalidation when GitHub API budget low
5. **Industry Standard**: Proven pattern (HTTP Cache-Control, Vercel SWR, React Query)

### Alternatives Rejected

- **TTL Only**: Poor UX on expiration (full reload), no graceful degradation
- **Manual Refresh Only**: User burden, poor stale data discoverability
- **Event-Based (Webhooks)**: Over-engineered, requires GitHub App + server infrastructure

### Implementation

```typescript
export const CacheConfig = {
  ACTIVE_REPO_TTL: 60 * 60 * 1000, // 1 hour
  ARCHIVED_REPO_TTL: 24 * 60 * 60 * 1000, // 24 hours
  MIN_RATE_LIMIT_PERCENTAGE: 10,
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
} as const;

async function getCachedDataWithRevalidation(key: string) {
  const entry = await indexedDB.get(key);

  if (!entry) {
    const freshData = await fetchFromAPI(key);
    await indexedDB.set(key, { data: freshData, cachedAt: Date.now(), ... });
    return { data: freshData, isStale: false };
  }

  const isStale = Date.now() > entry.expiresAt;

  if (isStale && !entry.isRevalidating) {
    revalidateInBackground(key); // Non-blocking
  }

  return { data: entry.data, isStale };
}
```

---

## 5. GraphQL Query Batching Strategy Decision

### Recommendation: **Hybrid Waterfall Approach**

### Pattern

**Phase 1: Initial Load (30 days)** - Parallel for speed

```typescript
const [prsResult, deploymentsResult, releasesResult] = await Promise.all([
  fetchPRs({ days: 30 }),
  fetchDeployments({ days: 30 }),
  fetchReleases({ days: 30 }),
]);
```

**Phase 2: Background Load (31-365 days)** - Chunked batches

```typescript
for (const chunk of [31 - 120, 121 - 210, 211 - 365]) {
  await Promise.all([
    fetchPRs(chunk),
    fetchDeployments(chunk),
    fetchReleases(chunk),
  ]);
  updateUI(partialData); // Progressive enhancement
}
```

### Rationale

1. **Meets 5-Second Target**: Parallel queries achieve fast first paint (2-4s)
2. **API Efficiency**: Chunked loading prevents rate limit exhaustion and timeouts
3. **Progressive Enhancement**: Users interact immediately, historical data loads incrementally
4. **Graceful Degradation**: Initial failures don't block UI, background failures don't affect displayed data
5. **Cancellation-Ready**: Single `AbortController` integrates with React hooks

### Alternatives Rejected

- **Sequential Queries**: Cannot meet 5-second requirement (3 queries × 2s = 6s)
- **GraphQL Batching (Aliases)**: High complexity, breaks architecture, pagination nightmare
- **Parallel Only**: No background loading strategy, all data fetched upfront

---

## 6. Background Loading Implementation Decision

### Recommendation: **React 18 `startTransition`**

### Pattern

```typescript
function useProgressiveLoading() {
  const [data, setData] = useState<PRData[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const abortController = new AbortController();

    async function loadData() {
      // 1. Initial 30 days (urgent update)
      const initial = await fetchPRs({ days: 30 }, abortController.signal);
      setData(initial);

      // 2. Background historical data in batches
      for (let days = 60; days <= 365; days += 30) {
        if (abortController.signal.aborted) break;

        const batch = await fetchPRs(
          { startDays: days - 30, endDays: days },
          abortController.signal,
        );

        // Non-blocking update with startTransition
        startTransition(() => {
          setData((prev) => [...prev, ...batch]);
        });
      }
    }

    loadData();
    return () => abortController.abort();
  }, []);

  return { data, isPending };
}
```

### Rationale

1. **Perfect Alignment**: Target <200ms interactions → `startTransition` prioritizes urgent updates
2. **Zero Complexity**: No worker files, no webpack config, no message passing
3. **Zero Serialization Cost**: Direct state updates (no postMessage)
4. **Existing Ecosystem Fit**: React 18.3, Next.js 15 - first-class citizen
5. **Works with React.memo**: Project already uses `React.memo` for charts

### Alternatives Rejected

- **Web Workers**: Memory overhead (1-2MB), serialization cost (20-30ms), overkill for I/O-bound tasks
- **requestIdleCallback**: Not optimal for timely loading (designed for deferrable work)
- **Server-Sent Events**: Architectural mismatch (client-side GitHub API fetching)

### Expected Performance

| Metric                                | Target | Expected |
| ------------------------------------- | ------ | -------- |
| Initial 30-day load                   | <5s    | 2-4s     |
| Tab switch during background load     | <200ms | <100ms   |
| Background historical load (2000 PRs) | <30s   | 15-25s   |

---

## Implementation Phases

### Phase 1: Basic Cache Infrastructure (2-3 days)

- IndexedDB adapter with idb wrapper
- 1-hour fixed TTL
- Manual refresh button
- Simple staleness indicator

**Risk**: Low
**Value**: 50% API reduction

### Phase 2: Stale-While-Revalidate (3-4 days)

- Background revalidation logic
- Rate limit awareness
- Loading indicators
- Multi-tab synchronization

**Risk**: Medium
**Value**: 75% API reduction, instant UX

### Phase 3: Progressive Loading (2-3 days)

- Initial 30-day parallel load
- Background chunked loading
- React startTransition integration
- Zustand store

**Risk**: Low
**Value**: <5s initial load

### Phase 4: Adaptive TTL (1-2 days)

- Repository activity detection
- Dynamic TTL adjustment
- Historical data optimization

**Risk**: Low
**Value**: 85% API reduction for archived repos

---

## Detailed Analysis: GraphQL Query Batching

## Research Question

How should we structure GraphQL queries to fetch multiple data sources (PRs, deployments, releases/tags) for progressive loading with optimal API efficiency, perceived performance, and implementation complexity?

## Context

### Current Implementation (Baseline)

The existing `CalculateDeploymentFrequency` use case (lines 47-53 in `/src/application/use-cases/CalculateDeploymentFrequency.ts`) uses **parallel queries with Promise.all**:

```typescript
const [releasesResult, deploymentsResult, tagsResult] = await Promise.all([
  this.githubRepository.getReleases(owner, repo, sinceDate),
  this.githubRepository.getDeployments(owner, repo, sinceDate),
  this.githubRepository.getTags(owner, repo, sinceDate),
]);
```

Each method (`getReleases`, `getDeployments`, `getTags`) performs separate GraphQL queries with pagination, returning when all pages are fetched.

### Progressive Loading Requirements

From `/specs/007-progressive-loading/spec.md`:

- **Initial load**: 30-day data within 5 seconds (500 PRs)
- **Background load**: Historical data (31-365 days) in batches without blocking UI
- **Cancellation support**: User navigation during load must cancel in-flight requests
- **Multiple metrics**: Concurrent loading of PRs, deployments, commits/tags
- **API efficiency**: Reduce rate limit consumption (current limit: 5,000 points/hour)

### Technology Constraints

- **@octokit/graphql 9.0.3**: Uses `graphql.defaults()` for authentication, no built-in batching API
- **Fetch API**: Underlying transport supports `AbortSignal` via `request: { signal }` option
- **GitHub GraphQL API**: Point-based rate limiting (cost per query based on complexity, not just request count)
- **Next.js 15 App Router**: Server Components + Client Components with streaming support

## Approach Evaluation

### Option 1: Parallel Queries (Current Approach)

**Description**: Execute multiple independent GraphQL queries concurrently using `Promise.all`. Each query targets a single resource type (PRs, deployments, releases) with full pagination.

**Implementation Example**:

```typescript
const [prsResult, deploymentsResult, releasesResult] = await Promise.all([
  graphqlWithAuth<PRsResponse>(PULL_REQUESTS_QUERY, {
    owner,
    repo,
    first: 100,
    since: "30-days-ago",
  }),
  graphqlWithAuth<DeploymentsResponse>(DEPLOYMENTS_QUERY, {
    owner,
    repo,
    first: 100,
    since: "30-days-ago",
  }),
  graphqlWithAuth<ReleasesResponse>(RELEASES_QUERY, {
    owner,
    repo,
    first: 100,
    since: "30-days-ago",
  }),
]);
```

**API Efficiency**:

- ✅ **Good**: Each query is optimized independently (minimal fields, focused scope)
- ✅ **Good**: GitHub charges based on query complexity, not HTTP request count ([GitHub Docs: Rate limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api))
- ❌ **Poor**: 3 separate HTTP requests = 3× network latency overhead (critical for initial load <5s target)
- ⚠️ **Moderate**: Total API cost = sum of individual query costs (typically 1-3 points per query for simple paginated fetches)

**Perceived Performance**:

- ✅ **Excellent**: True parallelism - all data sources load simultaneously
- ✅ **Excellent**: Fastest time to first byte for initial 30-day load (no waiting for other queries)
- ✅ **Excellent**: Individual query failures don't block others (graceful degradation)
- ⚠️ **Moderate**: 3× TCP connection overhead (especially noticeable on high-latency networks)

**Implementation Complexity**:

- ✅ **Excellent**: Minimal code changes - already implemented in existing codebase
- ✅ **Excellent**: Each query independently handles pagination (isolated logic)
- ✅ **Excellent**: Error handling per query is straightforward (Result type pattern)
- ✅ **Excellent**: Easy to test each query in isolation

**Error Handling**:

- ✅ **Excellent**: Partial failures supported out-of-box - failing PRs query doesn't affect deployments
- ✅ **Excellent**: Result type pattern already in use (line 56-75 in `CalculateDeploymentFrequency.ts`)
- ✅ **Excellent**: Rate limit handling per query (independent retry logic)
- ❌ **Poor**: If one query hits rate limit, others may succeed but waste budget

**Cancellation Support**:

- ✅ **Excellent**: AbortController per query for fine-grained cancellation
- ✅ **Excellent**: Can cancel specific data sources without affecting others
- ⚠️ **Moderate**: Requires managing multiple AbortController instances

**Implementation Example with Cancellation**:

```typescript
const abortControllers = [
  new AbortController(),
  new AbortController(),
  new AbortController(),
];

try {
  const [prsResult, deploymentsResult, releasesResult] = await Promise.all([
    graphqlWithAuth(PULL_REQUESTS_QUERY, {
      owner,
      repo,
      first: 100,
      since: "30-days-ago",
      request: { signal: abortControllers[0].signal },
    }),
    graphqlWithAuth(DEPLOYMENTS_QUERY, {
      owner,
      repo,
      first: 100,
      since: "30-days-ago",
      request: { signal: abortControllers[1].signal },
    }),
    graphqlWithAuth(RELEASES_QUERY, {
      owner,
      repo,
      first: 100,
      since: "30-days-ago",
      request: { signal: abortControllers[2].signal },
    }),
  ]);
} catch (error) {
  // Handle AbortError separately
}

// Cleanup: abort all on unmount
useEffect(() => () => abortControllers.forEach((c) => c.abort()), []);
```

**@octokit/graphql API Compatibility**:

- ✅ **Excellent**: Fully supported pattern (existing implementation uses this)
- ✅ **Excellent**: AbortSignal support confirmed via `request: { signal }` option ([Octokit request.js PR #442](https://github.com/octokit/request.js/pull/442))

---

### Option 2: Sequential Queries (Waterfall)

**Description**: Execute queries one after another, waiting for each to complete before starting the next. Prioritize critical data (PRs) first, then secondary data (deployments, releases).

**Implementation Example**:

```typescript
// Step 1: Load PRs first (highest priority)
const prsResult = await graphqlWithAuth<PRsResponse>(PULL_REQUESTS_QUERY, {
  owner,
  repo,
  first: 100,
  since: "30-days-ago",
  request: { signal: abortSignal },
});

// Step 2: Load deployments (if not cancelled)
if (!abortSignal.aborted) {
  const deploymentsResult = await graphqlWithAuth<DeploymentsResponse>(
    DEPLOYMENTS_QUERY,
    {
      owner,
      repo,
      first: 100,
      since: "30-days-ago",
      request: { signal: abortSignal },
    },
  );
}

// Step 3: Load releases (if not cancelled)
if (!abortSignal.aborted) {
  const releasesResult = await graphqlWithAuth<ReleasesResponse>(
    RELEASES_QUERY,
    {
      owner,
      repo,
      first: 100,
      since: "30-days-ago",
      request: { signal: abortSignal },
    },
  );
}
```

**API Efficiency**:

- ✅ **Excellent**: Same total API cost as parallel (1-3 points per query)
- ✅ **Excellent**: Can stop early if rate limit is hit (save budget for later)
- ⚠️ **Moderate**: Wasted time if rate limit hit on first query (other queries never execute)

**Perceived Performance**:

- ❌ **Poor**: Total time = sum of all query times (serial execution)
- ❌ **Critical Failure**: Cannot meet 5-second initial load target (3 queries × ~2s each = 6s minimum)
- ❌ **Poor**: User sees empty dashboard until first query completes
- ✅ **Good**: Progressive display possible (show PRs immediately, then add deployments)

**Implementation Complexity**:

- ⚠️ **Moderate**: Requires conditional logic for cancellation checks
- ⚠️ **Moderate**: Manual orchestration of query order (priority decisions)
- ✅ **Good**: Single AbortController shared across all queries

**Error Handling**:

- ⚠️ **Moderate**: Early query failure blocks subsequent queries (unless wrapped in try-catch)
- ⚠️ **Moderate**: Partial data more complex to manage (state updates per query)
- ✅ **Good**: Rate limit errors caught early before wasting budget

**Cancellation Support**:

- ✅ **Excellent**: Single AbortController cancels entire pipeline
- ✅ **Excellent**: Explicit cancellation checks between queries prevent unnecessary work
- ✅ **Excellent**: Clean abort semantics (no orphaned promises)

**@octokit/graphql API Compatibility**:

- ✅ **Excellent**: Fully supported (standard async/await pattern)

**Verdict**: ❌ **REJECTED** - Cannot meet 5-second initial load requirement due to serial execution time

---

### Option 3: GraphQL Query Batching (Single Request with Aliases)

**Description**: Combine multiple queries into a single GraphQL request using field aliases. This allows fetching all data sources in one HTTP roundtrip.

**Implementation Example**:

```graphql
query BatchedData(
  $owner: String!
  $repo: String!
  $first: Int!
  $since: GitTimestamp
) {
  repository(owner: $owner, name: $repo) {
    pullRequests: pullRequests(
      first: $first
      since: $since
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      nodes {
        number
        title
        createdAt
        mergedAt
        additions
        deletions
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
    deployments: deployments(
      first: $first
      since: $since
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      nodes {
        id
        createdAt
        environment
        state
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
    releases: releases(
      first: $first
      since: $since
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      nodes {
        name
        tagName
        publishedAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  rateLimit {
    limit
    cost
    remaining
    resetAt
  }
}
```

**API Efficiency**:

- ✅ **Excellent**: Single HTTP request = minimal network overhead
- ⚠️ **Moderate**: Query complexity increases (combined cost = sum of individual costs + repository lookup overhead)
- ⚠️ **Critical Issue**: GitHub's GraphQL API has timeout limits for complex queries - large batches may timeout ([GitHub Docs: Query limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api))
- ❌ **Poor**: Cannot paginate individual resources independently (all must share same page size)

**Perceived Performance**:

- ✅ **Excellent**: Single TCP connection = lowest latency overhead
- ✅ **Excellent**: Fastest time to first byte for initial load (one roundtrip)
- ❌ **Critical Failure**: Cannot paginate efficiently - if PRs need 10 pages but releases need 1, must wait for all 10 PRs pages in separate requests
- ❌ **Poor**: Large combined response size may cause timeout or memory issues

**Implementation Complexity**:

- ❌ **Poor**: Requires rewriting all existing query logic to use aliases
- ❌ **Poor**: Pagination becomes extremely complex (must track cursors for 3 resources simultaneously)
- ❌ **Poor**: Cannot reuse existing query modules (PULL_REQUESTS_QUERY, DEPLOYMENTS_QUERY, etc.)
- ❌ **Critical Issue**: Breaking change to existing codebase architecture

**Error Handling**:

- ❌ **Critical Failure**: All-or-nothing - if one resource fails, entire query fails (no partial data)
- ❌ **Poor**: Cannot gracefully degrade (missing one resource type blocks all others)
- ❌ **Poor**: Rate limit errors affect all resources simultaneously (cannot retry individually)

**Cancellation Support**:

- ✅ **Good**: Single AbortController cancels entire query
- ❌ **Poor**: Cannot cancel individual resources (all-or-nothing cancellation)

**@octokit/graphql API Compatibility**:

- ⚠️ **Moderate**: Technically supported via field aliases ([Contentful Blog: GraphQL multiple queries](https://www.contentful.com/blog/graphql-multiple-queries/))
- ❌ **Poor**: No TypeScript type safety for aliased responses (loses type inference)
- ❌ **Poor**: Breaks existing mapper pattern (mapPullRequest, mapDeployment, mapRelease)

**Pagination Challenge**:

```typescript
// Problem: How to handle different pagination needs?
// PRs: 100 items per page, 10 pages needed
// Deployments: 100 items per page, 2 pages needed
// Releases: 100 items per page, 1 page needed

// Approach 1: Fetch minimum needed (wasteful for PRs)
// Approach 2: Multiple batched queries (defeats purpose)
// Approach 3: Separate queries after first batch (back to Option 1)
```

**Verdict**: ❌ **REJECTED** - High complexity, breaks existing architecture, no graceful degradation, pagination nightmare

---

### Option 4: Waterfall Approach (Initial + Background)

**Description**: Hybrid strategy optimizing for perceived performance. Load critical 30-day data first (prioritized), then background-load historical data in chunks without blocking UI.

**Implementation Example**:

```typescript
// Phase 1: Initial Load (30 days) - Parallel for speed
async function loadInitialData(
  owner: string,
  repo: string,
  abortSignal: AbortSignal,
) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [prsResult, deploymentsResult, releasesResult] = await Promise.all([
    graphqlWithAuth(PULL_REQUESTS_QUERY, {
      owner,
      repo,
      first: 100,
      since: thirtyDaysAgo,
      request: { signal: abortSignal },
    }),
    graphqlWithAuth(DEPLOYMENTS_QUERY, {
      owner,
      repo,
      first: 100,
      since: thirtyDaysAgo,
      request: { signal: abortSignal },
    }),
    graphqlWithAuth(RELEASES_QUERY, {
      owner,
      repo,
      first: 100,
      since: thirtyDaysAgo,
      request: { signal: abortSignal },
    }),
  ]);

  return {
    prs: prsResult,
    deployments: deploymentsResult,
    releases: releasesResult,
  };
}

// Phase 2: Background Load (31-365 days) - Chunked batches
async function loadHistoricalDataInBackground(
  owner: string,
  repo: string,
  onProgress: (data: PartialData) => void,
  abortSignal: AbortSignal,
) {
  // Load in 90-day chunks to avoid rate limit exhaustion
  const chunks = [
    { start: 31, end: 120 }, // Days 31-120
    { start: 121, end: 210 }, // Days 121-210
    { start: 211, end: 365 }, // Days 211-365
  ];

  for (const chunk of chunks) {
    if (abortSignal.aborted) break;

    const startDate = new Date(Date.now() - chunk.end * 24 * 60 * 60 * 1000);
    const endDate = new Date(Date.now() - chunk.start * 24 * 60 * 60 * 1000);

    // Parallel within each chunk
    const [prsResult, deploymentsResult, releasesResult] = await Promise.all([
      graphqlWithAuth(PULL_REQUESTS_QUERY, {
        owner,
        repo,
        first: 100,
        since: startDate,
        until: endDate,
        request: { signal: abortSignal },
      }),
      graphqlWithAuth(DEPLOYMENTS_QUERY, {
        owner,
        repo,
        first: 100,
        since: startDate,
        until: endDate,
        request: { signal: abortSignal },
      }),
      graphqlWithAuth(RELEASES_QUERY, {
        owner,
        repo,
        first: 100,
        since: startDate,
        until: endDate,
        request: { signal: abortSignal },
      }),
    ]);

    // Update UI progressively
    onProgress({
      prs: prsResult,
      deployments: deploymentsResult,
      releases: releasesResult,
      chunkRange: chunk,
    });

    // Rate limit awareness: check remaining budget
    const rateLimitInfo = await getRateLimitStatus();
    if (rateLimitInfo.remaining < 100) {
      console.warn("Rate limit low, pausing background load");
      break;
    }
  }
}

// React hook usage
function useProgressiveLoading(owner: string, repo: string) {
  const [initialData, setInitialData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const abortControllerRef = useRef(new AbortController());

  useEffect(() => {
    const abortController = abortControllerRef.current;

    // Step 1: Load initial 30 days (fast)
    loadInitialData(owner, repo, abortController.signal)
      .then((data) => {
        setInitialData(data);

        // Step 2: Start background loading (non-blocking)
        loadHistoricalDataInBackground(
          owner,
          repo,
          (partialData) => setHistoricalData((prev) => [...prev, partialData]),
          abortController.signal,
        );
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Load failed:", error);
        }
      });

    // Cleanup: cancel on unmount
    return () => abortController.abort();
  }, [owner, repo]);

  return { initialData, historicalData };
}
```

**API Efficiency**:

- ✅ **Excellent**: Initial load uses minimal API budget (30 days only)
- ✅ **Excellent**: Background loading pauses if rate limit is low (intelligent budget management)
- ✅ **Excellent**: Chunked loading prevents single large query timeout
- ✅ **Excellent**: Can skip background load entirely if rate limit exhausted (graceful degradation)

**Perceived Performance**:

- ✅ **Excellent**: Initial 30-day data displays within 5 seconds (meets requirement)
- ✅ **Excellent**: UI remains interactive during background load (non-blocking)
- ✅ **Excellent**: Progressive enhancement - more data appears gradually without page reload
- ✅ **Excellent**: Parallel queries within each chunk maximize throughput

**Implementation Complexity**:

- ⚠️ **Moderate**: Requires orchestration logic for two-phase loading
- ⚠️ **Moderate**: Progress callback mechanism for UI updates
- ✅ **Good**: Reuses existing query modules (no breaking changes)
- ✅ **Good**: Clear separation of concerns (initial vs background)

**Error Handling**:

- ✅ **Excellent**: Initial load failure shows error immediately (fast feedback)
- ✅ **Excellent**: Background load errors don't block initial display (graceful degradation)
- ✅ **Excellent**: Per-chunk error handling allows partial historical data
- ✅ **Excellent**: Rate limit awareness prevents cascading failures

**Cancellation Support**:

- ✅ **Excellent**: Single AbortController cancels both initial + background loads
- ✅ **Excellent**: Background loop checks `aborted` flag before each chunk
- ✅ **Excellent**: Clean unmount behavior (no memory leaks)
- ✅ **Excellent**: User navigation immediately stops all in-flight requests

**@octokit/graphql API Compatibility**:

- ✅ **Excellent**: Standard Promise.all + async/await pattern
- ✅ **Excellent**: AbortSignal support via `request: { signal }` option
- ✅ **Excellent**: No special batching API required

**Caching Integration**:

```typescript
// Cache-aware version
async function loadInitialData(owner: string, repo: string, abortSignal: AbortSignal) {
  // Check cache first
  const cachedData = await cacheRepository.get(owner, repo, "30-days");
  if (cachedData && !cachedData.isStale) {
    return cachedData.value; // Instant return from cache
  }

  // Cache miss: fetch from API
  const [prsResult, deploymentsResult, releasesResult] = await Promise.all([...]);

  // Store in cache for next visit
  await cacheRepository.set(owner, repo, "30-days", { prs, deployments, releases });

  return { prs: prsResult, deployments: deploymentsResult, releases: releasesResult };
}
```

**Verdict**: ✅ **RECOMMENDED** - Best balance of performance, complexity, and API efficiency

---

## Comparison Matrix

| Criterion                         | Option 1: Parallel | Option 2: Sequential | Option 3: GraphQL Batch | Option 4: Waterfall (Recommended) |
| --------------------------------- | ------------------ | -------------------- | ----------------------- | --------------------------------- |
| **Initial Load Time (<5s)**       | ✅ Excellent       | ❌ Fails (6s+)       | ✅ Excellent            | ✅ Excellent                      |
| **API Efficiency (Rate Limit)**   | ⚠️ Moderate        | ✅ Excellent         | ⚠️ Moderate             | ✅ Excellent                      |
| **Perceived Performance**         | ✅ Excellent       | ❌ Poor              | ⚠️ Moderate             | ✅ Excellent                      |
| **Implementation Complexity**     | ✅ Excellent       | ⚠️ Moderate          | ❌ Poor                 | ⚠️ Moderate                       |
| **Error Handling (Partial Data)** | ✅ Excellent       | ⚠️ Moderate          | ❌ Poor                 | ✅ Excellent                      |
| **Cancellation Support**          | ✅ Excellent       | ✅ Excellent         | ⚠️ Moderate             | ✅ Excellent                      |
| **Breaking Changes Required**     | ✅ None            | ✅ None              | ❌ Major                | ✅ None                           |
| **Caching Integration**           | ✅ Simple          | ⚠️ Moderate          | ❌ Complex              | ✅ Simple                         |
| **Progressive Enhancement**       | ❌ No              | ⚠️ Possible          | ❌ No                   | ✅ Excellent                      |
| **Rate Limit Awareness**          | ⚠️ Reactive        | ✅ Proactive         | ❌ None                 | ✅ Proactive                      |

## Recommendation

### Primary Strategy: Option 4 (Waterfall Approach)

**Why**:

1. **Meets Performance Requirements**: Initial 30-day load completes in <5s using parallel queries (Option 1 pattern)
2. **Optimal User Experience**: Progressive enhancement allows immediate interaction with recent data while historical data loads in background
3. **API Efficiency**: Chunked background loading prevents rate limit exhaustion and timeout errors
4. **Graceful Degradation**: Initial load failure doesn't block UI, background load errors don't affect displayed data
5. **No Breaking Changes**: Reuses existing query modules and infrastructure
6. **Cancellation-Ready**: Single AbortController pattern integrates cleanly with React hooks lifecycle

**Implementation Phases**:

1. **Phase 1 (MVP)**: Implement initial 30-day parallel load with cache integration
   - Target: Meet FR-001 (5-second initial load)
   - Use existing `Promise.all` pattern from `CalculateDeploymentFrequency.ts`
   - Add cache check before API call
   - Single AbortController for cleanup

2. **Phase 2**: Add background historical loading
   - Target: Meet FR-002 (background load without blocking)
   - Implement chunked loading (90-day batches)
   - Add progress callbacks for UI updates
   - Rate limit awareness (pause if budget low)

3. **Phase 3**: Optimize caching strategy
   - Target: Meet SC-008 (70% cache hit rate)
   - IndexedDB adapter with LRU eviction
   - Stale data indicators
   - Manual refresh option

### Fallback Strategy: Option 1 (Parallel Queries)

**When to Use**: If background loading proves unnecessary (e.g., users rarely need historical data beyond 30 days)

**Advantages**:

- Already implemented in codebase
- Simplest to maintain
- Proven stable (deployed in DORA metrics feature)

### Rejected Options

- **Option 2 (Sequential)**: Cannot meet 5-second requirement
- **Option 3 (GraphQL Batch)**: High complexity, poor error handling, pagination nightmare

## References

### GitHub GraphQL API Documentation

- [Rate limits and query limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api) - 5,000 points/hour limit, query complexity calculation
- [Forming calls with GraphQL](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql) - Query structure and aliases

### @octokit/graphql Library

- [GitHub: octokit/graphql.js](https://github.com/octokit/graphql.js) - Official repository with documentation
- [npm: @octokit/graphql](https://www.npmjs.com/package/@octokit/graphql) - Package documentation
- [Octokit request.js PR #442](https://github.com/octokit/request.js/pull/442) - AbortError handling support

### GraphQL Batching Patterns

- [Contentful Blog: GraphQL multiple queries](https://www.contentful.com/blog/graphql-multiple-queries/) - Field aliases for combining queries
- [Apollo GraphQL: Query batching](https://www.apollographql.com/docs/graphos/routing/performance/query-batching) - General batching concepts
- [Shopify Engineering: Rate limiting by query complexity](https://shopify.engineering/rate-limiting-graphql-apis-calculating-query-complexity) - Query cost calculation approaches

### React Query Cancellation

- [TanStack Query: Query cancellation](https://tanstack.com/query/latest/docs/react/guides/query-cancellation) - AbortSignal integration patterns
- [DEV Community: Canceling requests in React](https://dev.to/serifcolakel/canceling-requests-in-reactreact-native-a-comprehensive-guide-2ami) - AbortController best practices
- [Daniel Westbrook: Using AbortControllers in React](https://westbrookdaniel.com/blog/react-abort-controllers/) - React hook patterns

### Existing Codebase

- `/src/infrastructure/github/OctokitAdapter.ts` - Current GraphQL implementation
- `/src/application/use-cases/CalculateDeploymentFrequency.ts` - Parallel query pattern example
- `/src/infrastructure/github/graphql/pullRequests.ts` - Query structure reference

## Next Steps

1. **Create data model contracts** (Phase 1 of `/speckit.plan`)
   - `CachedDataEntry` entity with date range metadata
   - `LoadingState` value object for progress tracking
   - `ICacheRepository` interface

2. **Implement initial 30-day load** (Phase 2 - Task 1)
   - Extend `OctokitAdapter` with date range support
   - Add AbortSignal parameter to existing query methods
   - Create `LoadInitialData` use case

3. **Add background loading orchestration** (Phase 2 - Task 2)
   - Create `LoadHistoricalData` use case with chunking logic
   - Implement rate limit awareness checks
   - Add progress callback mechanism

4. **Integrate caching layer** (Phase 2 - Task 3)
   - Implement `IndexedDBAdapter`
   - Add cache-check logic before API calls
   - Implement LRU eviction strategy

5. **Build React hooks** (Phase 2 - Task 4)
   - `useProgressiveLoading` orchestration hook
   - `useCachedData` for cache retrieval
   - `useBackgroundLoader` for historical data
