# Data Model: PR Throughput Analysis

**Feature**: 003-pr-throughput-analysis
**Date**: 2025-12-25

## Overview

This document defines the domain entities and value objects for PR Throughput Analysis feature. The model follows the existing domain-driven architecture with clear separation between single PR data, aggregated metrics, and analytical insights.

---

## 1. Value Object: PRThroughputData

**Purpose**: Represents a single PR's throughput data including size and lead time.

**Location**: `src/domain/value-objects/PRThroughputData.ts`

### Fields

| Field          | Type     | Description             | Validation                       |
| -------------- | -------- | ----------------------- | -------------------------------- |
| `prNumber`     | `number` | Pull request number     | Must be positive integer         |
| `title`        | `string` | Pull request title      | Max 500 characters               |
| `author`       | `string` | PR author username      | Non-empty string                 |
| `createdAt`    | `Date`   | PR creation timestamp   | Valid Date object                |
| `mergedAt`     | `Date`   | PR merge timestamp      | Valid Date, must be >= createdAt |
| `additions`    | `number` | Lines added             | Non-negative integer             |
| `deletions`    | `number` | Lines deleted           | Non-negative integer             |
| `changedFiles` | `number` | Number of files changed | Non-negative integer             |

### Computed Properties

| Property        | Type                        | Calculation                        | Description                                |
| --------------- | --------------------------- | ---------------------------------- | ------------------------------------------ |
| `size`          | `number`                    | `additions + deletions`            | Total line changes                         |
| `leadTimeHours` | `number`                    | `(mergedAt - createdAt) / 3600000` | Lead time in hours (milliseconds to hours) |
| `leadTimeDays`  | `number`                    | `leadTimeHours / 24`               | Lead time in days                          |
| `sizeBucket`    | `'S' \| 'M' \| 'L' \| 'XL'` | See Size Bucket Rules              | Size category                              |

### Size Bucket Rules

```typescript
function getSizeBucket(size: number): "S" | "M" | "L" | "XL" {
  if (size >= 1 && size <= 50) return "S";
  if (size >= 51 && size <= 200) return "M";
  if (size >= 201 && size <= 500) return "L";
  return "XL"; // 501+
}
```

**Edge Cases**:

- Size = 0: Treat as 'S' (minimum bucket)
- Lead time < 0: Should never occur; validation error
- Same-day merge (leadTimeDays < 1): Display as fractional days (e.g., 0.5 days = 12 hours)

### Invariants

1. `mergedAt` must be >= `createdAt`
2. `additions`, `deletions`, `changedFiles` must be >= 0
3. `prNumber` must be > 0
4. `title` and `author` must be non-empty strings

### Example

```typescript
{
  prNumber: 123,
  title: "feat: Add user authentication",
  author: "developer123",
  createdAt: new Date("2025-01-10T10:00:00Z"),
  mergedAt: new Date("2025-01-12T14:30:00Z"),
  additions: 150,
  deletions: 30,
  changedFiles: 8,
  // Computed:
  size: 180,
  leadTimeHours: 52.5,
  leadTimeDays: 2.19,
  sizeBucket: 'M'
}
```

---

## 2. Value Object: SizeBucket

**Purpose**: Represents aggregated metrics for a specific PR size category.

**Location**: `src/domain/value-objects/SizeBucket.ts`

### Fields

| Field                  | Type                        | Description                | Validation             |
| ---------------------- | --------------------------- | -------------------------- | ---------------------- |
| `bucket`               | `'S' \| 'M' \| 'L' \| 'XL'` | Size bucket identifier     | One of: S, M, L, XL    |
| `lineRange`            | `string`                    | Human-readable range       | E.g., "1-50", "51-200" |
| `averageLeadTimeHours` | `number`                    | Average lead time in hours | >= 0                   |
| `prCount`              | `number`                    | Number of PRs in bucket    | >= 0                   |
| `percentage`           | `number`                    | Percentage of total PRs    | 0-100                  |

### Computed Properties

| Property              | Type     | Calculation                 | Description               |
| --------------------- | -------- | --------------------------- | ------------------------- |
| `averageLeadTimeDays` | `number` | `averageLeadTimeHours / 24` | Average lead time in days |

### Creation Logic

```typescript
static fromPRs(
  bucket: 'S' | 'M' | 'L' | 'XL',
  prs: PRThroughputData[],
  totalPRCount: number
): SizeBucket {
  const lineRange = getLineRange(bucket);
  const prCount = prs.length;

  if (prCount === 0) {
    return {
      bucket,
      lineRange,
      averageLeadTimeHours: 0,
      prCount: 0,
      percentage: 0,
    };
  }

  const totalLeadTime = prs.reduce((sum, pr) => sum + pr.leadTimeHours, 0);
  const averageLeadTimeHours = totalLeadTime / prCount;
  const percentage = (prCount / totalPRCount) * 100;

  return {
    bucket,
    lineRange,
    averageLeadTimeHours,
    prCount,
    percentage,
  };
}

function getLineRange(bucket: 'S' | 'M' | 'L' | 'XL'): string {
  switch (bucket) {
    case 'S': return '1-50';
    case 'M': return '51-200';
    case 'L': return '201-500';
    case 'XL': return '501+';
  }
}
```

### Invariants

1. `prCount` >= 0
2. `averageLeadTimeHours` >= 0
3. `percentage` >= 0 and <= 100
4. If `prCount` === 0, then `averageLeadTimeHours` === 0 and `percentage` === 0

### Example

```typescript
{
  bucket: 'M',
  lineRange: '51-200',
  averageLeadTimeHours: 48.5,
  prCount: 25,
  percentage: 35.7,
  // Computed:
  averageLeadTimeDays: 2.02
}
```

---

## 3. Value Object: ThroughputInsight

**Purpose**: Represents the automated recommendation for optimal PR size.

**Location**: `src/domain/value-objects/ThroughputInsight.ts`

### Fields

| Field           | Type                                                  | Description            | Validation                 |
| --------------- | ----------------------------------------------------- | ---------------------- | -------------------------- |
| `type`          | `'optimal' \| 'no_difference' \| 'insufficient_data'` | Insight type           | One of the three types     |
| `message`       | `string`                                              | Human-readable insight | Non-empty string           |
| `optimalBucket` | `'S' \| 'M' \| 'L' \| 'XL' \| null`                   | Recommended bucket     | null if type !== 'optimal' |

### Generation Logic

```typescript
static generate(
  buckets: SizeBucket[],
  totalPRCount: number
): ThroughputInsight {
  // Insufficient data check
  if (totalPRCount < 10) {
    return {
      type: 'insufficient_data',
      message: 'Insufficient data: More merged PRs needed (at least 10)',
      optimalBucket: null,
    };
  }

  // Filter buckets with at least 1 PR
  const nonEmptyBuckets = buckets.filter(b => b.prCount > 0);

  if (nonEmptyBuckets.length === 0) {
    return {
      type: 'insufficient_data',
      message: 'No data available',
      optimalBucket: null,
    };
  }

  // Find bucket with lowest average lead time
  const sortedBuckets = [...nonEmptyBuckets].sort(
    (a, b) => a.averageLeadTimeHours - b.averageLeadTimeHours
  );

  const fastest = sortedBuckets[0];
  const slowest = sortedBuckets[sortedBuckets.length - 1];

  // Check if all buckets are within 20% of each other
  const range = slowest.averageLeadTimeHours - fastest.averageLeadTimeHours;
  const relativeRange = range / fastest.averageLeadTimeHours;

  if (relativeRange <= 0.20) {
    return {
      type: 'no_difference',
      message: 'No clear difference based on PR size',
      optimalBucket: null,
    };
  }

  // Clear winner
  const bucketName = getBucketName(fastest.bucket);
  return {
    type: 'optimal',
    message: `${bucketName} PRs are most efficient (${fastest.lineRange} lines)`,
    optimalBucket: fastest.bucket,
  };
}

function getBucketName(bucket: 'S' | 'M' | 'L' | 'XL'): string {
  switch (bucket) {
    case 'S': return 'Small';
    case 'M': return 'Medium';
    case 'L': return 'Large';
    case 'XL': return 'Extra Large';
  }
}
```

### Invariants

1. If `type` === 'optimal', then `optimalBucket` !== null
2. If `type` !== 'optimal', then `optimalBucket` === null
3. `message` must be non-empty string

### Examples

**Optimal Case**:

```typescript
{
  type: 'optimal',
  message: 'Small PRs are most efficient (1-50 lines)',
  optimalBucket: 'S'
}
```

**No Difference Case**:

```typescript
{
  type: 'no_difference',
  message: 'No clear difference based on PR size',
  optimalBucket: null
}
```

**Insufficient Data Case**:

```typescript
{
  type: 'insufficient_data',
  message: 'Insufficient data: More merged PRs needed (at least 10)',
  optimalBucket: null
}
```

---

## 4. Entity: PRThroughput (Aggregate Root)

**Purpose**: Aggregate root that combines all throughput analysis data.

**Location**: `src/domain/entities/PRThroughput.ts`

### Fields

| Field           | Type                         | Description                                  |
| --------------- | ---------------------------- | -------------------------------------------- |
| `repositoryUrl` | `string`                     | Repository URL                               |
| `analyzedAt`    | `Date`                       | Analysis timestamp                           |
| `dateRange`     | `{ start: Date; end: Date }` | Analysis period                              |
| `prData`        | `PRThroughputData[]`         | Individual PR data                           |
| `sizeBuckets`   | `SizeBucket[]`               | Size bucket analysis (always 4: S, M, L, XL) |
| `insight`       | `ThroughputInsight`          | Automated recommendation                     |

### Computed Properties

| Property               | Type     | Calculation                                 | Description               |
| ---------------------- | -------- | ------------------------------------------- | ------------------------- |
| `totalMergedPRs`       | `number` | `prData.length`                             | Total merged PRs analyzed |
| `averageLeadTimeHours` | `number` | `sum(prData.leadTimeHours) / prData.length` | Overall average lead time |
| `medianLeadTimeHours`  | `number` | `median(prData.leadTimeHours)`              | Overall median lead time  |

### Factory Method

```typescript
static create(
  repositoryUrl: string,
  pullRequests: PullRequest[],
  dateRange: { start: Date; end: Date }
): PRThroughput {
  // Filter merged PRs
  const mergedPRs = pullRequests.filter(
    pr => pr.state === 'merged' && pr.mergedAt
  );

  // Convert to PRThroughputData
  const prData = mergedPRs.map(pr => PRThroughputData.create(pr));

  // Group by size bucket
  const groupedBySize = {
    S: prData.filter(pr => pr.sizeBucket === 'S'),
    M: prData.filter(pr => pr.sizeBucket === 'M'),
    L: prData.filter(pr => pr.sizeBucket === 'L'),
    XL: prData.filter(pr => pr.sizeBucket === 'XL'),
  };

  // Create size buckets
  const sizeBuckets = [
    SizeBucket.fromPRs('S', groupedBySize.S, prData.length),
    SizeBucket.fromPRs('M', groupedBySize.M, prData.length),
    SizeBucket.fromPRs('L', groupedBySize.L, prData.length),
    SizeBucket.fromPRs('XL', groupedBySize.XL, prData.length),
  ];

  // Generate insight
  const insight = ThroughputInsight.generate(sizeBuckets, prData.length);

  return {
    repositoryUrl,
    analyzedAt: new Date(),
    dateRange,
    prData,
    sizeBuckets,
    insight,
  };
}
```

### Invariants

1. `sizeBuckets.length` === 4 (always S, M, L, XL)
2. Sum of `sizeBuckets[].prCount` === `prData.length`
3. Sum of `sizeBuckets[].percentage` === 100 (or close to 100 due to rounding)
4. `dateRange.end` >= `dateRange.start`

---

## 5. DTO: ThroughputResult

**Purpose**: Data Transfer Object for passing throughput analysis results to presentation layer.

**Location**: `src/application/dto/ThroughputResult.ts`

### Fields

| Field                  | Type                                                          | Description                |
| ---------------------- | ------------------------------------------------------------- | -------------------------- |
| `totalMergedPRs`       | `number`                                                      | Total merged PRs           |
| `averageLeadTimeHours` | `number`                                                      | Average lead time in hours |
| `averageLeadTimeDays`  | `number`                                                      | Average lead time in days  |
| `medianLeadTimeHours`  | `number`                                                      | Median lead time in hours  |
| `medianLeadTimeDays`   | `number`                                                      | Median lead time in days   |
| `scatterData`          | `Array<{ prNumber: number; size: number; leadTime: number }>` | Scatter plot data          |
| `sizeBuckets`          | `SizeBucket[]`                                                | Size bucket analysis       |
| `insight`              | `ThroughputInsight`                                           | Automated recommendation   |

### Mapping from Domain

```typescript
static fromDomain(throughput: PRThroughput): ThroughputResult {
  return {
    totalMergedPRs: throughput.totalMergedPRs,
    averageLeadTimeHours: throughput.averageLeadTimeHours,
    averageLeadTimeDays: throughput.averageLeadTimeHours / 24,
    medianLeadTimeHours: throughput.medianLeadTimeHours,
    medianLeadTimeDays: throughput.medianLeadTimeHours / 24,
    scatterData: throughput.prData.map(pr => ({
      prNumber: pr.prNumber,
      size: pr.size,
      leadTime: pr.leadTimeHours,
    })),
    sizeBuckets: throughput.sizeBuckets,
    insight: throughput.insight,
  };
}
```

---

## 6. Interface Extension: PullRequest

**Purpose**: Extend existing `PullRequest` interface to include throughput-specific fields.

**Location**: `src/domain/interfaces/IGitHubRepository.ts`

### Changes

```typescript
export interface PullRequest {
  number: number;
  title: string;
  author: string;
  createdAt: Date;
  state: "open" | "closed" | "merged";
  reviewCommentCount: number;

  // NEW FIELDS for throughput analysis
  mergedAt?: Date; // Timestamp when PR was merged (null for non-merged)
  additions?: number; // Lines added
  deletions?: number; // Lines deleted
  changedFiles?: number; // Number of files changed
}
```

**Backward Compatibility**: All new fields are optional (`?`) to maintain compatibility with existing code.

---

## Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                      PRThroughput                           │
│                   (Aggregate Root)                          │
│                                                             │
│  + repositoryUrl: string                                    │
│  + analyzedAt: Date                                         │
│  + dateRange: { start, end }                                │
│  + prData: PRThroughputData[]      ◄────────────────┐      │
│  + sizeBuckets: SizeBucket[]       ◄───────────┐    │      │
│  + insight: ThroughputInsight      ◄──────┐    │    │      │
│                                            │    │    │      │
└────────────────────────────────────────────┼────┼────┼──────┘
                                             │    │    │
                ┌────────────────────────────┘    │    │
                │                                 │    │
                │  ┌──────────────────────────────┘    │
                │  │                                    │
                │  │  ┌─────────────────────────────────┘
                │  │  │
         ┌──────▼──▼──▼────────┐  ┌────────────────────────┐
         │ ThroughputInsight   │  │   PRThroughputData     │
         │                     │  │                        │
         │ + type              │  │ + prNumber             │
         │ + message           │  │ + size                 │
         │ + optimalBucket     │  │ + leadTimeHours        │
         └─────────────────────┘  │ + sizeBucket           │
                                  └────────────────────────┘
                                             │
                                             │ computed from
                                             ▼
         ┌─────────────────────┐  ┌────────────────────────┐
         │    SizeBucket       │  │     PullRequest        │
         │                     │  │     (Interface)        │
         │ + bucket            │  │                        │
         │ + lineRange         │  │ + mergedAt?            │
         │ + averageLeadTime   │  │ + additions?           │
         │ + prCount           │  │ + deletions?           │
         │ + percentage        │  └────────────────────────┘
         └─────────────────────┘
```

---

## Validation Rules Summary

### PRThroughputData

- ✅ `prNumber` > 0
- ✅ `mergedAt` >= `createdAt`
- ✅ `additions`, `deletions`, `changedFiles` >= 0
- ✅ `title` and `author` non-empty

### SizeBucket

- ✅ `prCount` >= 0
- ✅ `averageLeadTimeHours` >= 0
- ✅ `percentage` between 0-100
- ✅ If `prCount` === 0, then metrics === 0

### ThroughputInsight

- ✅ `optimalBucket` not null if type === 'optimal'
- ✅ `optimalBucket` null if type !== 'optimal'
- ✅ `message` non-empty

### PRThroughput

- ✅ `sizeBuckets.length` === 4
- ✅ Sum of bucket counts === total PR count
- ✅ `dateRange.end` >= `dateRange.start`

---

## Edge Cases

1. **Zero merged PRs**: `PRThroughput` returns empty arrays, insight type = 'insufficient_data'
2. **Zero line changes**: Treated as size = 0, categorized as 'S'
3. **Same-day merge**: `leadTimeDays` < 1, display as fractional (e.g., 0.5 days)
4. **Very large PRs (10,000+ lines)**: Categorized as 'XL', no upper limit
5. **Fewer than 10 merged PRs**: Insight type = 'insufficient_data'
6. **All buckets within 20%**: Insight type = 'no_difference'
