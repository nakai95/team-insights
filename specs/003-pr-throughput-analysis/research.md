# Research: PR Throughput Analysis

**Feature**: 003-pr-throughput-analysis
**Date**: 2025-12-25
**Status**: Complete

## 1. GitHub REST API - PR Details Fetching

### Decision: Use Two-Step Fetch Pattern

**Rationale**: The `pulls.list()` endpoint returns basic PR information but may not reliably include `additions`, `deletions`, and `changed_files` fields. According to GitHub community discussions and Octokit.js issues, list endpoints often return these fields as 0, even when the PR has actual changes.

**Approach**:

1. First, use `pulls.list()` to get all PR numbers and basic info (filtered by state='closed' and checking merged_at)
2. Then, for each merged PR, call `pulls.get()` to fetch detailed statistics

**Alternatives Considered**:

- **GraphQL API**: Could fetch all data in one query, but would require significant refactoring and introduce a new dependency. Rejected due to complexity and existing REST API infrastructure.
- **Trust `pulls.list()` statistics**: Rejected because of unreliable data in list endpoints as documented in GitHub community discussions.

### Implementation Details

**Endpoint**: `GET /repos/{owner}/{repo}/pulls/{pull_number}`

**Required Fields**:

- `merged_at`: ISO 8601 timestamp when the PR was merged (null for unmerged PRs)
- `additions`: Total count of added lines across all files
- `deletions`: Total count of removed lines across all files
- `changed_files`: Total number of files modified

**Example Response**:

```typescript
{
  number: 125,
  title: "Feature: Add new component",
  state: "closed",
  merged: true,
  merged_at: "2025-01-15T10:30:00Z",
  created_at: "2025-01-10T14:20:00Z",
  additions: 208,
  deletions: 172,
  changed_files: 5,
  commits: 3,
  user: {
    login: "developer123"
  }
}
```

**Code Pattern** (following existing pattern in OctokitAdapter.ts:467-476):

```typescript
// After filtering merged PRs
if (state === "merged") {
  await this.rateLimiter.waitIfNeeded();

  const detailResponse = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pr.number,
  });

  const rateLimitResult = await this.getRateLimitStatus();
  if (rateLimitResult.ok) {
    this.rateLimiter.updateRateLimit(rateLimitResult.value);
  }

  pullRequests.push({
    number: pr.number,
    title: pr.title,
    author: pr.user?.login || "unknown",
    createdAt,
    mergedAt: new Date(pr.merged_at!),
    state: "merged",
    reviewCommentCount: 0,
    additions: detailResponse.data.additions,
    deletions: detailResponse.data.deletions,
    changedFiles: detailResponse.data.changed_files,
  });
}
```

### Rate Limiting Analysis

**GitHub API Rate Limits**:

- Authenticated requests: **5,000 requests per hour**
- Unauthenticated requests: 60 requests per hour

**Estimated Usage for 1000 Merged PRs**:

- `pulls.list()`: ~10 requests (100 PRs per page)
- `pulls.get()` for each merged PR: 1000 requests
- **Total: ~1010 requests** (well within the 5,000 limit)

**Current Implementation Assessment**:

- ✅ Existing `RateLimiter` class already handles rate limit management
- ✅ Code calls `waitIfNeeded()` before each API request
- ✅ Rate limit status is checked after each request
- ✅ No additional rate limiting infrastructure needed

**Conclusion**: No changes needed to rate limiting strategy. Existing implementation is sufficient.

---

## 2. Recharts ScatterChart Implementation

### Decision: Use Recharts ScatterChart with Performance Optimizations

**Rationale**: Recharts 3.5.0 is already installed and provides a ScatterChart component that meets all requirements. Performance with 1000 data points is acceptable with proper optimization.

**Required Components**:

```typescript
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
```

### Basic Implementation Pattern

```typescript
"use client";

import React, { useMemo, useCallback } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface PRDataPoint {
  prNumber: number;
  size: number; // additions + deletions
  leadTime: number; // hours
}

export const PRScatterChart = React.memo(function PRScatterChart({
  data
}: { data: PRDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" />

        {/* CRITICAL: type='number' is required for scatter charts */}
        <XAxis
          type="number"
          dataKey="size"
          name="PR Size"
          unit=" lines"
          label={{
            value: 'PR Size (Total Lines Changed)',
            position: 'insideBottom',
            offset: -10
          }}
        />

        <YAxis
          type="number"
          dataKey="leadTime"
          name="Lead Time"
          unit=" hours"
          label={{
            value: 'Lead Time (Hours)',
            angle: -90,
            position: 'insideLeft'
          }}
        />

        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={<CustomTooltip />}
        />

        <Scatter
          name="Pull Requests"
          data={data}
          fill="#8884d8"
          isAnimationActive={data.length < 500}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
});

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
        <p className="font-semibold">PR #{data.prNumber}</p>
        <p className="text-sm">Size: {data.size} lines</p>
        <p className="text-sm">Lead Time: {data.leadTime} hours</p>
      </div>
    );
  }
  return null;
}
```

### Key Implementation Notes

1. **XAxis and YAxis type='number' is mandatory**: Unlike other chart types, scatter charts require explicitly setting `type="number"` on both axes.

2. **Data structure**: Each data point must have properties matching the `dataKey` values.

3. **ResponsiveContainer**: Ensures proper sizing and responsiveness, consistent with existing `ImplementationActivityChart`.

**Alternatives Considered**:

- **D3.js**: More powerful but steeper learning curve and larger bundle size. Rejected to maintain consistency with existing Recharts usage.
- **Victory**: Similar to Recharts but would introduce a new dependency. Rejected.

---

## 3. Performance Optimization for 1000+ PRs

### Decision: Apply React Memoization and Disable Animations for Large Datasets

**Rationale**: Recharts can handle 1000 data points with proper optimization. Performance benchmarks show ~160ms initial render and ~60ms updates with optimization.

### Performance Benchmarks

- Under 1000 points: Generally good performance
- 1000-5000 points: Performance degrades, optimizations required
- 10,000+ points: Significant performance issues

**Verdict**: With 1000 PRs, we are at the threshold where optimization is important but the chart remains functional.

### Optimization Techniques

#### 1. React Memoization (Critical)

```typescript
export function PRThroughputSection({ pullRequests }: Props) {
  // Memoize expensive calculations
  const chartData = useMemo(() => {
    return pullRequests
      .filter(pr => pr.state === 'merged' && pr.mergedAt)
      .map(pr => ({
        prNumber: pr.number,
        size: pr.additions + pr.deletions,
        leadTime: calculateLeadTime(pr.createdAt, pr.mergedAt!),
      }));
  }, [pullRequests]);

  return <PRScatterChart data={chartData} />;
}
```

**Why this works**:

- `useMemo` prevents recalculating chart data on every render
- `React.memo` prevents re-rendering the chart unless props actually change
- Stabilized dataKey prevents Recharts from recalculating all points

#### 2. Disable Animations for Large Datasets

```typescript
<Scatter
  name="Pull Requests"
  data={data}
  fill="#8884d8"
  isAnimationActive={data.length < 500} // Disable for 500+ points
/>
```

#### 3. Simplify SVG Rendering

```typescript
<Scatter
  name="Pull Requests"
  data={data}
  fill="#8884d8"
  shape="circle" // Simple shape
/>

<CartesianGrid
  strokeDasharray="3 3"
  strokeWidth={1} // Thin lines
/>
```

### Pagination vs Virtualization

**Decision: Neither Needed**

**Reasoning**:

- **Pagination**: Not suitable for scatter plots (would break visual continuity)
- **Virtualization**: Only applicable to DOM lists, not SVG charts
- **Instead**: Apply memoization techniques and disable animations for 500+ points

**Alternatives Considered**:

- **Data sampling**: Could reduce points if > 2000 PRs, but not needed for initial implementation
- **Server-side rendering**: SVG charts don't benefit from SSR; keep client-only

### Best Practices Summary

1. Always use `useMemo` for data transformation
2. Wrap chart components with `React.memo`
3. Stabilize dataKey and callback props with `useCallback`
4. Disable animations for datasets > 500 points
5. Use simple shapes and thin strokes
6. Consider lazy loading the chart component (dynamic import)

---

## 4. Domain Model Design

### Decision: Separate Value Objects for Single PR Data and Aggregates

**Rationale**: Following the constitution's Pragmatic Clean Architecture principle, we separate concerns:

- `PRThroughputData`: Single PR throughput data (value object)
- `SizeBucket`: Size bucket analysis (value object with aggregate logic)
- `ThroughputInsight`: Automated insight (value object)

**Alternatives Considered**:

- **Single entity**: Rejected because mixing single PR data with aggregates violates Single Responsibility
- **Complex aggregate entity**: Rejected due to YAGNI (You Aren't Gonna Need It) principle

### Data Flow

```
1. OctokitAdapter fetches PR data with merged_at, additions, deletions
2. CalculateThroughputMetrics use case:
   - Creates PRThroughputData value objects
   - Groups into SizeBucket value objects
   - Generates ThroughputInsight
3. ThroughputResult DTO passed to presentation layer
4. PRThroughputSection component renders charts
```

---

## 5. Integration with Existing Architecture

### Decision: Extend Existing Use Cases, Don't Create Parallel Flow

**Rationale**: The existing `AnalyzeRepository` use case orchestrates all analysis. Throughput analysis should be integrated into this flow, not run separately.

**Changes**:

1. Extend `PullRequest` interface in `IGitHubRepository.ts`
2. Update `OctokitAdapter.getPullRequests()` to fetch detailed PR data
3. Create new `CalculateThroughputMetrics` use case
4. Extend `AnalyzeRepository` to call throughput calculation
5. Extend `AnalysisResult` DTO to include throughput data

**Alternatives Considered**:

- **Separate analysis endpoint**: Rejected to avoid duplicating PR fetching logic
- **Client-side calculation**: Rejected because calculation should be server-side per constitution

---

## Sources

- [GitHub REST API - Pull Requests Endpoints](https://docs.github.com/en/rest/pulls/pulls)
- [GitHub Community Discussion - Merged Pull Requests](https://github.com/orgs/community/discussions/24879)
- [Octokit.js Issue #1075 - Zero Values for PR Statistics](https://github.com/octokit/octokit.js/issues/1075)
- [Recharts ScatterChart Documentation](https://recharts.org/en-US/api/ScatterChart)
- [Recharts Performance Guide](https://recharts.github.io/en-US/guide/performance/)
- [Recharts Large Dataset Discussion](https://github.com/recharts/recharts/discussions/3181)
- [GitHub Best Practices for REST API](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api)
- [GitHub Rate Limits for REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [Improving Recharts Performance](https://belchior.hashnode.dev/improving-recharts-performance-clp5w295y000b0ajq8hu6cnmm)
