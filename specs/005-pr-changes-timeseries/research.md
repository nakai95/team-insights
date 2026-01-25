# Research: PR Changes Timeseries Analysis

**Feature**: 005-pr-changes-timeseries
**Date**: 2026-01-23
**Status**: Complete

This document records technical research decisions, best practices, and alternatives considered for implementing the PR Changes Timeseries feature.

---

## 1. Weekly Aggregation Strategy

### Decision: ISO Week Definition with Monday Start

**Rationale**:

- ISO 8601 standard defines weeks as Monday-Sunday
- JavaScript `Date` methods support ISO week calculation
- Consistent with business calendar conventions (most teams track work weeks Monday-Friday)
- Aligns with GitHub's PR merge timestamps (UTC)

**Implementation Approach**:

```typescript
// Get Monday of the week containing a given date
function getWeekStart(date: Date): Date {
  const day = date.getDay(); // 0 (Sunday) to 6 (Saturday)
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0); // Start of day
  return monday;
}
```

**Alternatives Considered**:

1. **Sunday-Saturday weeks**: Rejected - Less common in business contexts, not ISO standard
2. **Arbitrary 7-day periods**: Rejected - Would create confusion with calendar weeks
3. **Monthly aggregation**: Rejected - Months vary in length (28-31 days), making trend comparison difficult

**References**:

- ISO 8601 week date standard
- JavaScript Date API documentation

---

## 2. Statistical Outlier Detection

### Decision: 2 Standard Deviations Threshold

**Rationale**:

- Standard statistical approach: values beyond 2σ from mean are considered outliers
- In normal distribution, ~95% of data falls within 2σ, making outliers genuinely unusual
- Well-understood by technical audiences
- Computationally simple (mean + standard deviation calculation)

**Implementation Approach**:

```typescript
function detectOutliers(weeklyTotals: number[]): Set<number> {
  const mean =
    weeklyTotals.reduce((sum, val) => sum + val, 0) / weeklyTotals.length;
  const variance =
    weeklyTotals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    weeklyTotals.length;
  const stdDev = Math.sqrt(variance);
  const threshold = mean + 2 * stdDev;

  const outliers = new Set<number>();
  weeklyTotals.forEach((total, index) => {
    if (total > threshold) {
      outliers.add(index);
    }
  });
  return outliers;
}
```

**Edge Cases**:

- **Too few data points (n < 4 weeks)**: Do not calculate outliers (insufficient statistical power)
- **Zero variance (all values identical)**: No outliers (all values are normal)
- **Negative outliers**: Only detect high outliers (low change weeks are not concerning)

**Alternatives Considered**:

1. **Interquartile Range (IQR)**: Rejected - More complex, less intuitive for developers
2. **3 Standard Deviations**: Rejected - Too conservative, would miss moderately unusual weeks
3. **Percentile-based (e.g., top 5%)**: Rejected - Arbitrary threshold, doesn't account for distribution shape

**References**:

- Standard deviation in statistics
- Outlier detection methods in data analysis

---

## 3. Trend Analysis Algorithm

### Decision: 4-Week Linear Regression with Directional Classification

**Rationale**:

- 4 weeks (1 month) is short enough to detect recent changes, long enough to avoid noise
- Linear regression slope indicates direction and magnitude of change
- Simple to understand and explain to users
- Resilient to single-week spikes (averages over multiple weeks)

**Implementation Approach**:

```typescript
enum TrendDirection {
  INCREASING = "increasing",
  DECREASING = "decreasing",
  STABLE = "stable",
}

function analyzeTrend(recentWeeks: number[]): {
  direction: TrendDirection;
  percentChange: number;
} {
  if (recentWeeks.length < 4) {
    throw new Error("Insufficient data for trend analysis");
  }

  const last4Weeks = recentWeeks.slice(-4);
  const firstHalf = (last4Weeks[0] + last4Weeks[1]) / 2;
  const secondHalf = (last4Weeks[2] + last4Weeks[3]) / 2;
  const percentChange = ((secondHalf - firstHalf) / firstHalf) * 100;

  if (Math.abs(percentChange) < 10) {
    return { direction: TrendDirection.STABLE, percentChange: 0 };
  }

  return {
    direction:
      percentChange > 0 ? TrendDirection.INCREASING : TrendDirection.DECREASING,
    percentChange: Math.abs(percentChange),
  };
}
```

**Classification Thresholds**:

- **Stable**: |change| < 10% (within normal variation)
- **Increasing**: change >= +10%
- **Decreasing**: change <= -10%

**Alternatives Considered**:

1. **8-week trend window**: Rejected - Too slow to detect recent changes
2. **2-week trend window**: Rejected - Too sensitive to noise and single-week spikes
3. **Exponential moving average**: Rejected - More complex, harder to explain to users
4. **Complex regression (polynomial, etc.)**: Rejected - Overfitting risk, unnecessary complexity

**References**:

- Time series analysis basics
- Moving averages and trend detection

---

## 4. Recharts Visualization Strategy

### Decision: Composed Chart with Stacked Areas + Bars

**Rationale**:

- Recharts supports `ComposedChart` for mixing chart types (area + bar)
- Stacked areas show additions (green) and deletions (red) as cumulative view
- Bars overlay PR counts on secondary Y-axis for correlation analysis
- Recharts is already a project dependency (used in PR Throughput feature)
- Responsive design with built-in tooltip/legend support

**Implementation Approach**:

```tsx
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

<ResponsiveContainer width="100%" height={400}>
  <ComposedChart data={weeklyData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="weekStart" tickFormatter={formatDate} />
    <YAxis
      yAxisId="left"
      label={{ value: "Lines Changed", angle: -90, position: "insideLeft" }}
    />
    <YAxis
      yAxisId="right"
      orientation="right"
      label={{ value: "PR Count", angle: 90, position: "insideRight" }}
    />
    <Tooltip content={<CustomTooltip />} />
    <Legend />
    <Area
      yAxisId="left"
      type="monotone"
      dataKey="additions"
      stackId="1"
      fill="#22c55e"
      stroke="#16a34a"
      name="Additions"
    />
    <Area
      yAxisId="left"
      type="monotone"
      dataKey="deletions"
      stackId="1"
      fill="#ef4444"
      stroke="#dc2626"
      name="Deletions"
    />
    <Bar yAxisId="right" dataKey="prCount" fill="#3b82f6" name="PRs Merged" />
  </ComposedChart>
</ResponsiveContainer>;
```

**Visual Design Choices**:

- **Green for additions**: Conventional color for "added" in diffs
- **Red for deletions**: Conventional color for "removed" in diffs
- **Blue for PR count**: Neutral color that stands out from green/red
- **Stacked areas**: Show total change volume at a glance
- **Dual Y-axes**: Prevent PR count bars from being dwarfed by line counts

**Alternatives Considered**:

1. **Line chart**: Rejected - Less intuitive for showing cumulative volume
2. **Separate charts for additions/deletions**: Rejected - Harder to compare visually
3. **Chart.js library**: Rejected - Would introduce new dependency unnecessarily
4. **Custom D3.js chart**: Rejected - Overkill complexity for this use case

**References**:

- Recharts documentation: ComposedChart, Area, Bar
- GitHub diff color conventions (green = added, red = removed)

---

## 5. Tab Navigation with URL Synchronization

### Decision: Next.js App Router with URLSearchParams

**Rationale**:

- Next.js 15 App Router supports client-side navigation with `useSearchParams` and `useRouter`
- Query parameters (`?tab=overview`) enable bookmarking and browser history
- No additional state management library needed (React state + URL as single source of truth)
- Server components can read initial tab from URL params
- SEO-friendly (each tab URL is indexable)

**Implementation Approach**:

```tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function AnalysisTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "overview",
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`?tab=${tab}`, { scroll: false });
  };

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  return (
    <div>
      <TabButtons activeTab={activeTab} onChange={handleTabChange} />
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "throughput" && <ThroughputTab />}
      {activeTab === "changes" && <ChangesTimeseriesTab />}
    </div>
  );
}
```

**Advantages**:

- Browser back/forward buttons work automatically
- Users can share direct links to specific tabs
- Page refresh preserves tab selection
- No Flash of Unstyled Content (FOUC) on initial load

**Alternatives Considered**:

1. **Client-side state only (no URL sync)**: Rejected - Users can't bookmark specific tabs
2. **Hash-based routing (#overview)**: Rejected - Less clean than query params, harder to parse server-side
3. **Separate routes (/dashboard/overview)**: Rejected - Overkill for tabs, requires more routing logic
4. **State management library (Zustand, Redux)**: Rejected - Unnecessary complexity for this use case

**References**:

- Next.js 15 App Router documentation
- `useSearchParams` and `useRouter` hooks
- React state synchronization patterns

---

## 6. Data Reuse Strategy

### Decision: Extend Existing GraphQL Query Response

**Rationale**:

- Current `PULL_REQUESTS_QUERY` already fetches `additions`, `deletions`, and `changedFiles`
- No additional API calls needed for timeseries feature
- Reduces GitHub API rate limit consumption
- Faster page load (single query for all tabs)
- Consistent data across Overview, Throughput, and Changes tabs

**Implementation Approach**:

- Fetch all PR data once in `DashboardContent.tsx` (existing pattern)
- Pass complete `AnalysisResult` (including new `timeseriesData` field) to `AnalysisTabs`
- Each tab extracts relevant data from props
- Timeseries calculation happens in application layer use case (`CalculateChangesTimeseries`)

**Data Flow**:

```
1. User requests dashboard
2. Server Action `analyzeRepository` fetches PR data via GraphQL
3. Application layer runs:
   - CalculateMetrics (existing)
   - CalculateThroughputMetrics (existing)
   - CalculateChangesTimeseries (NEW)
4. Combined AnalysisResult returned to client
5. AnalysisTabs component distributes data to child tabs
```

**Alternatives Considered**:

1. **Separate API endpoint for timeseries data**: Rejected - Duplicate data fetching, slower UX
2. **Client-side data fetching per tab**: Rejected - Would break instant tab switching requirement
3. **Lazy load timeseries data on tab activation**: Rejected - Adds latency, breaks <100ms switching goal

**References**:

- Existing `analyzeRepository` Server Action implementation
- GraphQL query composition patterns

---

## Summary of Key Decisions

| Topic             | Decision                                     | Primary Rationale                                |
| ----------------- | -------------------------------------------- | ------------------------------------------------ |
| Week Aggregation  | ISO weeks (Monday start)                     | Standard convention, JavaScript support          |
| Outlier Detection | 2 standard deviations                        | Well-understood statistical method               |
| Trend Analysis    | 4-week linear regression                     | Balances recency vs. noise reduction             |
| Chart Library     | Recharts ComposedChart (stacked area + bars) | Existing dependency, supports required chart mix |
| Tab Navigation    | Next.js App Router with query params         | Built-in, SEO-friendly, bookmarkable             |
| Data Fetching     | Reuse existing GraphQL PR data               | Zero additional API calls, instant tab switching |

All decisions align with constitutional principles:

- **No new external dependencies** (Recharts already used)
- **Performance optimized** (single API call, client-side aggregation)
- **Type-safe** (TypeScript strict mode throughout)
- **Testable** (pure functions for aggregation, trend analysis, outlier detection)
- **Maintainable** (follows existing patterns in codebase)

---

**Research Complete**: All technical unknowns resolved. Ready for Phase 1 (Design & Contracts).
