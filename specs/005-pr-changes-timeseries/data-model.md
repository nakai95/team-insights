# Data Model: PR Changes Timeseries Analysis

**Feature**: 005-pr-changes-timeseries
**Date**: 2026-01-23
**Status**: Complete

This document defines all domain entities and value objects for the PR Changes Timeseries feature.

---

## Domain Layer

### 1. WeeklyAggregate (Value Object)

Represents aggregated PR change metrics for a single calendar week (Monday-Sunday).

**Properties**:

| Property          | Type   | Description                                         | Validation                   |
| ----------------- | ------ | --------------------------------------------------- | ---------------------------- |
| weekStart         | Date   | Monday (00:00:00) of the week                       | Must be Monday, start of day |
| weekEnd           | Date   | Sunday (23:59:59) of the week                       | Must be 6 days after start   |
| additions         | number | Total lines added across all PRs merged this week   | >= 0                         |
| deletions         | number | Total lines deleted across all PRs merged this week | >= 0                         |
| totalChanges      | number | additions + deletions                               | >= 0                         |
| netChange         | number | additions - deletions (positive = codebase grew)    | any integer                  |
| prCount           | number | Number of PRs merged this week                      | >= 0                         |
| averagePRSize     | number | totalChanges / prCount (0 if prCount = 0)           | >= 0                         |
| changedFilesTotal | number | Total files changed across all PRs                  | >= 0                         |

**Factory Method**:

```typescript
static fromPRs(weekStart: Date, prs: MergedPR[]): WeeklyAggregate
```

**Business Rules**:

- `weekStart` MUST be a Monday (ISO week definition)
- `weekEnd` MUST be exactly 6 days after `weekStart`
- `totalChanges = additions + deletions`
- `netChange = additions - deletions`
- `averagePRSize = totalChanges / prCount` (handle division by zero gracefully)
- PRs with missing `additions` or `deletions` fields SHOULD be excluded from aggregation

**Immutability**: All properties are readonly. WeeklyAggregate is a value object.

**Example**:

```typescript
const week = WeeklyAggregate.fromPRs(
  new Date("2026-01-20"), // Monday
  [
    {
      mergedAt: "2026-01-21T10:00:00Z",
      additions: 150,
      deletions: 50,
      changedFiles: 5,
    },
    {
      mergedAt: "2026-01-22T14:30:00Z",
      additions: 300,
      deletions: 100,
      changedFiles: 8,
    },
  ],
);

// Result:
// {
//   weekStart: 2026-01-20T00:00:00Z,
//   weekEnd: 2026-01-26T23:59:59Z,
//   additions: 450,
//   deletions: 150,
//   totalChanges: 600,
//   netChange: 300,
//   prCount: 2,
//   averagePRSize: 300,
//   changedFilesTotal: 13
// }
```

---

### 2. ChangeTrend (Value Object)

Represents the directional trend of code changes over a time period (typically 4 weeks).

**Properties**:

| Property      | Type           | Description                             | Validation |
| ------------- | -------------- | --------------------------------------- | ---------- |
| direction     | TrendDirection | "increasing", "decreasing", or "stable" | enum value |
| percentChange | number         | Magnitude of change (always positive)   | >= 0       |
| analyzedWeeks | number         | Number of weeks analyzed (typically 4)  | >= 2       |
| startValue    | number         | Average of first half of period         | >= 0       |
| endValue      | number         | Average of second half of period        | >= 0       |

**TrendDirection Enum**:

```typescript
export const TrendDirection = {
  INCREASING: "increasing",
  DECREASING: "decreasing",
  STABLE: "stable",
} as const;
export type TrendDirection =
  (typeof TrendDirection)[keyof typeof TrendDirection];
```

**Factory Method**:

```typescript
static analyze(weeklyTotals: number[]): ChangeTrend
```

**Business Rules**:

- Requires at least 4 weeks of data (throws error if fewer)
- Compares average of first half vs. second half of period
- **Stable**: |change| < 10%
- **Increasing**: change >= +10%
- **Decreasing**: change <= -10%
- `percentChange` is always positive (absolute value)

**Example**:

```typescript
const trend = ChangeTrend.analyze([500, 550, 600, 650]); // Last 4 weeks

// Result:
// {
//   direction: "increasing",
//   percentChange: 18.18,
//   analyzedWeeks: 4,
//   startValue: 525,  // (500 + 550) / 2
//   endValue: 625     // (600 + 650) / 2
// }
```

---

### 3. OutlierWeek (Value Object)

Represents a week identified as having abnormally high code changes based on statistical analysis.

**Properties**:

| Property     | Type   | Description                                 | Validation     |
| ------------ | ------ | ------------------------------------------- | -------------- |
| weekStart    | Date   | Monday of the outlier week                  | Must be Monday |
| totalChanges | number | Total lines changed (additions + deletions) | > 0            |
| prCount      | number | Number of PRs merged this week              | > 0            |
| zScore       | number | Number of standard deviations from mean     | > 2.0          |
| meanValue    | number | Mean of all weekly totals in dataset        | >= 0           |
| stdDeviation | number | Standard deviation of weekly totals         | >= 0           |

**Factory Method**:

```typescript
static detect(weeklyData: WeeklyAggregate[], threshold: number = 2.0): OutlierWeek[]
```

**Business Rules**:

- Only detect **high outliers** (values exceeding mean + threshold \* σ)
- Ignore low outliers (low activity weeks are not concerning)
- Requires at least 4 weeks of data (insufficient statistical power otherwise)
- If standard deviation is 0 (all values identical), return empty array
- `zScore = (weekTotal - mean) / stdDev`

**Statistical Method**:

- Calculate mean (μ) and standard deviation (σ) of all weekly totals
- Flag weeks where `totalChanges > μ + 2σ`

**Example**:

```typescript
const outliers = OutlierWeek.detect([
  week1, // 500 changes
  week2, // 550 changes
  week3, // 600 changes
  week4, // 10000 changes (outlier!)
]);

// Result:
// [
//   {
//     weekStart: week4.weekStart,
//     totalChanges: 10000,
//     prCount: week4.prCount,
//     zScore: 4.5,
//     meanValue: 2912.5,
//     stdDeviation: 4087.5
//   }
// ]
```

---

## Application Layer

### 4. TimeseriesResult (DTO)

Data Transfer Object for timeseries analysis results, used by Server Actions and API routes.

**Properties**:

| Property     | Type                   | Description                                |
| ------------ | ---------------------- | ------------------------------------------ |
| weeklyData   | WeeklyAggregateDto[]   | Array of weekly aggregates (chronological) |
| trend        | ChangeTrendDto \| null | Trend analysis (null if insufficient data) |
| outlierWeeks | OutlierWeekDto[]       | Weeks with abnormally high changes         |
| summary      | TimeseriesSummary      | Aggregate statistics across entire period  |

**WeeklyAggregateDto**:

```typescript
interface WeeklyAggregateDto {
  weekStart: string; // ISO 8601 date string
  weekEnd: string; // ISO 8601 date string
  additions: number;
  deletions: number;
  totalChanges: number;
  netChange: number;
  prCount: number;
  averagePRSize: number;
  changedFilesTotal: number;
}
```

**ChangeTrendDto**:

```typescript
interface ChangeTrendDto {
  direction: "increasing" | "decreasing" | "stable";
  percentChange: number;
  analyzedWeeks: number;
  startValue: number;
  endValue: number;
}
```

**OutlierWeekDto**:

```typescript
interface OutlierWeekDto {
  weekStart: string; // ISO 8601 date string
  totalChanges: number;
  prCount: number;
  zScore: number;
  meanValue: number;
  stdDeviation: number;
}
```

**TimeseriesSummary**:

```typescript
interface TimeseriesSummary {
  totalPRs: number; // Sum of prCount across all weeks
  totalAdditions: number; // Sum of additions across all weeks
  totalDeletions: number; // Sum of deletions across all weeks
  averageWeeklyChanges: number; // Mean of totalChanges across all weeks
  averagePRSize: number; // totalChanges / totalPRs
  weeksAnalyzed: number; // Number of weeks in dataset
}
```

---

## Infrastructure Layer

### 5. MergedPR (Source Data)

Input data from GitHub GraphQL API (already fetched by existing queries).

**Properties**:

| Property     | Type              | Description                             |
| ------------ | ----------------- | --------------------------------------- |
| number       | number            | PR number                               |
| mergedAt     | string \| null    | ISO 8601 timestamp (null if not merged) |
| additions    | number            | Lines added                             |
| deletions    | number            | Lines deleted                           |
| changedFiles | number            | Number of files changed                 |
| author       | { login: string } | PR author (may be null if user deleted) |

**Note**: This data structure already exists in `GitHubGraphQLPullRequest` interface. No modifications needed to infrastructure layer.

**Filtering**:

- Only PRs with `mergedAt !== null` are considered
- PRs with missing `additions` or `deletions` should be excluded from aggregation (log warning)

---

## Relationships

```
MergedPR (Infrastructure)
    ↓ (many PRs)
WeeklyAggregate (Domain Value Object)
    ↓ (weekly aggregates)
ChangeTrend (Domain Value Object) - analyzes trends across weeks
OutlierWeek (Domain Value Object) - identifies statistical anomalies
    ↓ (all mapped to DTOs)
TimeseriesResult (Application DTO)
    ↓ (sent to client)
ChangesTimeseriesTab (Presentation Component)
```

---

## Validation Rules Summary

**WeeklyAggregate**:

- ✅ Week starts on Monday (ISO week)
- ✅ All numeric fields >= 0 (except netChange which can be negative)
- ✅ averagePRSize handles division by zero (returns 0 if prCount = 0)

**ChangeTrend**:

- ✅ Requires at least 4 weeks of data (throws error otherwise)
- ✅ Stable threshold: |change| < 10%
- ✅ percentChange is always positive

**OutlierWeek**:

- ✅ Requires at least 4 weeks of data (returns empty array otherwise)
- ✅ Only detects high outliers (> mean + 2σ)
- ✅ zScore > 2.0 for flagged weeks
- ✅ Handles zero variance (all values identical) gracefully

---

## Type Safety

All types follow TypeScript strict mode:

- No `any` types
- All dates are `Date` objects in domain layer, ISO 8601 strings in DTOs
- Enums use constant object pattern (e.g., `TrendDirection.INCREASING`)
- Immutable value objects (readonly properties)

---

**Data Model Complete**: Ready for contract generation (Phase 1, step 2).
