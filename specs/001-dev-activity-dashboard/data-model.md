# Data Model: Developer Activity Dashboard

**Feature**: 001-dev-activity-dashboard
**Date**: 2025-11-27
**Purpose**: Define domain entities, value objects, and relationships

## Overview

This document defines the domain model for the Developer Activity Dashboard. All entities are designed to be technology-agnostic, following clean architecture principles with domain logic separated from infrastructure concerns.

## Domain Entities

### 1. RepositoryAnalysis

**Purpose**: Represents a single analysis session for a GitHub repository

**Attributes**:

- `id`: string (unique identifier, generated)
- `repositoryUrl`: RepositoryUrl (value object)
- `analyzedAt`: Date (timestamp when analysis was performed)
- `dateRange`: DateRange (value object)
- `contributors`: Contributor[] (collection of contributors found)
- `status`: AnalysisStatus
- `errorMessage`: string | null (if status is 'failed')

**Business Rules**:

- Analysis ID must be unique
- Repository URL must be valid GitHub HTTPS URL
- Date range end must be after start
- Analysis cannot be marked complete without contributors
- Error message required if status is 'failed'

**State Transitions**:

- Initial: 'in_progress'
- Success: 'in_progress' → 'completed'
- Failure: 'in_progress' → 'failed'
- No transitions allowed from 'completed' or 'failed'

**Relationships**:

- Has many: Contributor
- Contains: DateRange (composition)

---

### 2. Contributor

**Purpose**: Represents a developer who has contributed to the repository

**Attributes**:

- `id`: string (unique identifier, generated)
- `primaryEmail`: Email (value object)
- `mergedEmails`: Email[] (additional emails merged into this identity)
- `displayName`: string
- `implementationActivity`: ImplementationActivity (value object)
- `reviewActivity`: ReviewActivity (value object)
- `activityTimeline`: ActivitySnapshot[] (time-series data)

**Business Rules**:

- At least one email (primary) required
- Merged emails must not duplicate primary email
- Display name defaults to email username if not provided
- Implementation and review activities must be non-null (can be zero values)
- Activity timeline must be sorted chronologically

**Invariants**:

- All emails (primary + merged) must be unique within a contributor
- Sum of timeline snapshots must equal total activity metrics

**Relationships**:

- Belongs to: RepositoryAnalysis
- Contains: Email (value objects)
- Contains: ImplementationActivity (composition)
- Contains: ReviewActivity (composition)
- Has many: ActivitySnapshot (composition)

---

### 3. IdentityMerge

**Purpose**: Represents a user's decision to merge multiple email identities

**Attributes**:

- `id`: string (unique identifier)
- `repositoryUrl`: RepositoryUrl (value object)
- `primaryContributorId`: string (ID of primary contributor)
- `mergedContributorIds`: string[] (IDs of merged contributors)
- `createdAt`: Date
- `lastAppliedAt`: Date

**Business Rules**:

- Repository URL must match the analysis being merged
- Primary contributor must exist
- Merged contributors must exist and be distinct from primary
- Cannot merge the same pair twice
- Merge is permanent (no undo in MVP)

**Relationships**:

- References: RepositoryAnalysis (via repositoryUrl)
- References: Contributor (via IDs)

---

## Value Objects

### 4. Email

**Purpose**: Represents a validated email address

**Attributes**:

- `value`: string (immutable)

**Validation Rules**:

- Must match email format regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Must be lowercase
- Maximum length: 254 characters (RFC 5321)
- No leading/trailing whitespace

**Equality**: Two emails are equal if their values are equal (case-insensitive)

**Factory Method**:

```typescript
static create(value: string): Result<Email> {
  // Validation logic
  // Return Result type (ok or error)
}
```

---

### 5. RepositoryUrl

**Purpose**: Represents a validated GitHub repository URL

**Attributes**:

- `value`: string (immutable, full URL)
- `owner`: string (extracted from URL)
- `repo`: string (extracted from URL)

**Validation Rules**:

- Must match GitHub HTTPS format: `https://github.com/{owner}/{repo}`
- Owner and repo must be alphanumeric + hyphens/underscores
- No query parameters or fragments allowed
- Maximum length: 500 characters

**Derived Properties**:

- `owner`: Extracted from URL path
- `repo`: Extracted from URL path
- `apiBase`: Computed GitHub API base URL

**Factory Method**:

```typescript
static create(url: string): Result<RepositoryUrl> {
  // Parse and validate
  // Extract owner and repo
  // Return Result type
}
```

---

### 6. DateRange

**Purpose**: Represents a time period for analysis

**Attributes**:

- `start`: Date (immutable)
- `end`: Date (immutable)

**Validation Rules**:

- Start must be before end
- Both dates must be in the past (cannot analyze future)
- Maximum range: 10 years (prevent abuse)
- Dates are UTC-based (no timezone confusion)

**Derived Properties**:

- `durationInDays`: Computed difference between start and end
- `durationInMonths`: Approximation for display purposes

**Factory Methods**:

```typescript
static create(start: Date, end: Date): Result<DateRange>
static defaultRange(): DateRange // 6 months ago to now
static fromMonths(months: number): DateRange // N months ago to now
```

---

### 7. ImplementationActivity

**Purpose**: Metrics related to code contribution

**Attributes**:

- `commitCount`: number (≥ 0)
- `linesAdded`: number (≥ 0)
- `linesDeleted`: number (≥ 0)
- `linesModified`: number (≥ 0)
- `filesChanged`: number (≥ 0)

**Validation Rules**:

- All values must be non-negative integers
- Lines modified = min(linesAdded, linesDeleted) conceptually

**Derived Properties**:

- `totalLineChanges`: linesAdded + linesDeleted
- `netLineChanges`: linesAdded - linesDeleted
- `activityScore`: Weighted combination for ranking (commitCount \* 10 + totalLineChanges)

**Factory Method**:

```typescript
static zero(): ImplementationActivity // All metrics set to 0
static create(metrics: Partial<ImplementationActivity>): Result<ImplementationActivity>
```

---

### 8. ReviewActivity

**Purpose**: Metrics related to code review participation

**Attributes**:

- `pullRequestCount`: number (≥ 0)
- `reviewCommentCount`: number (≥ 0)
- `pullRequestsReviewed`: number (≥ 0)

**Validation Rules**:

- All values must be non-negative integers
- pullRequestsReviewed ≤ total PRs in repository

**Derived Properties**:

- `reviewScore`: Weighted combination for ranking (pullRequestCount _ 5 + reviewCommentCount _ 2)
- `averageCommentsPerReview`: reviewCommentCount / pullRequestsReviewed (handle divide by zero)

**Factory Method**:

```typescript
static zero(): ReviewActivity // All metrics set to 0
static create(metrics: Partial<ReviewActivity>): Result<ReviewActivity>
```

---

### 9. ActivitySnapshot

**Purpose**: Time-series data point for activity trends

**Attributes**:

- `date`: Date (immutable, represents start of period)
- `period`: Period
- `implementationActivity`: ImplementationActivity
- `reviewActivity`: ReviewActivity

**Validation Rules**:

- Date must be within analysis date range
- Activities must be non-null
- Period must match analysis granularity

**Relationships**:

- Belongs to: Contributor (via composition)

---

### 10. Metrics (Utility Value Object)

**Purpose**: Common metrics calculations and comparisons

**Static Methods**:

```typescript
static calculatePercentile(value: number, allValues: number[]): number
static rankContributors(contributors: Contributor[], by: RankingCriteria): Contributor[]
static aggregateByPeriod(snapshots: ActivitySnapshot[], period: Period): ActivitySnapshot[]
```

---

## Type Definitions

### AnalysisStatus

```typescript
export const AnalysisStatus = {
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;
export type AnalysisStatus =
  (typeof AnalysisStatus)[keyof typeof AnalysisStatus];
```

### Period

```typescript
export const Period = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
} as const;
export type Period = (typeof Period)[keyof typeof Period];
```

### RankingCriteria

```typescript
export const RankingCriteria = {
  COMMITS: "commits",
  LINE_CHANGES: "lineChanges",
  PULL_REQUESTS: "pullRequests",
  REVIEW_COMMENTS: "reviewComments",
  IMPLEMENTATION_SCORE: "implementationScore",
  REVIEW_SCORE: "reviewScore",
} as const;
export type RankingCriteria =
  (typeof RankingCriteria)[keyof typeof RankingCriteria];
```

---

## Entity Relationships Diagram

```
RepositoryAnalysis
├── id: string
├── repositoryUrl: RepositoryUrl
├── dateRange: DateRange
├── analyzedAt: Date
├── status: AnalysisStatus
└── contributors: Contributor[]
    ├── id: string
    ├── primaryEmail: Email
    ├── mergedEmails: Email[]
    ├── displayName: string
    ├── implementationActivity: ImplementationActivity
    │   ├── commitCount: number
    │   ├── linesAdded: number
    │   ├── linesDeleted: number
    │   ├── linesModified: number
    │   └── filesChanged: number
    ├── reviewActivity: ReviewActivity
    │   ├── pullRequestCount: number
    │   ├── reviewCommentCount: number
    │   └── pullRequestsReviewed: number
    └── activityTimeline: ActivitySnapshot[]
        ├── date: Date
        ├── period: Period
        ├── implementationActivity: ImplementationActivity
        └── reviewActivity: ReviewActivity

IdentityMerge (separate aggregate)
├── id: string
├── repositoryUrl: RepositoryUrl
├── primaryContributorId: string
├── mergedContributorIds: string[]
├── createdAt: Date
└── lastAppliedAt: Date
```

---

## Business Logic and Domain Services

### ContributorService (Domain Service)

**Purpose**: Handle contributor identity merging logic

**Methods**:

1. `mergeContributors(primary: Contributor, others: Contributor[]): Contributor`
   - Combines all emails into primary
   - Sums all activity metrics
   - Concatenates activity timelines
   - Returns new Contributor instance (immutable)

2. `detectDuplicates(contributors: Contributor[]): DuplicateGroup[]`
   - Fuzzy matching on display names (Levenshtein distance)
   - Exact email domain matching
   - Returns groups of potential duplicates for user review

3. `splitContributor(contributor: Contributor, emailToSplit: Email): [Contributor, Contributor]`
   - Reverses a merge (future feature, not MVP)
   - Splits activities proportionally by commit count per email

---

### ActivityAggregationService (Domain Service)

**Purpose**: Calculate and aggregate activity metrics

**Methods**:

1. `aggregateByPeriod(timeline: ActivitySnapshot[], period: Period): ActivitySnapshot[]`
   - Groups snapshots by day/week/month
   - Sums activities within each period
   - Returns new timeline with specified granularity

2. `calculateTrends(timeline: ActivitySnapshot[]): Trend`
   - Linear regression on activity over time
   - Returns trend direction (increasing, decreasing, stable)
   - Calculates velocity (change per period)

3. `comparePeriods(current: DateRange, previous: DateRange, contributors: Contributor[]): Comparison`
   - Period-over-period comparison
   - Percentage change calculations
   - Identifies top movers (biggest changes)

---

## Data Validation Rules Summary

| Entity/Value Object    | Key Validations                                        |
| ---------------------- | ------------------------------------------------------ |
| RepositoryAnalysis     | URL format, date range logic, status transitions       |
| Contributor            | At least one email, unique emails, non-null activities |
| IdentityMerge          | Valid contributor IDs, no duplicate merges             |
| Email                  | RFC 5321 format, lowercase, max 254 chars              |
| RepositoryUrl          | GitHub HTTPS format, valid owner/repo                  |
| DateRange              | Start < end, both in past, max 10 years                |
| ImplementationActivity | All values ≥ 0                                         |
| ReviewActivity         | All values ≥ 0, pullRequestsReviewed ≤ total PRs       |
| ActivitySnapshot       | Date within range, valid period enum                   |

---

## Persistence Notes

**Domain entities are persistence-agnostic.** The following notes are for infrastructure layer implementation:

### RepositoryAnalysis

- **Storage**: Transient (not persisted in MVP)
- **Rationale**: Each analysis is ephemeral; user triggers new analysis each time
- **Future**: Consider caching in Redis if repeated analyses become common

### Contributor

- **Storage**: Transient (part of RepositoryAnalysis)
- **Rationale**: Derived data, recalculated on each analysis

### IdentityMerge

- **Storage**: Persistent (browser localStorage)
- **Key Format**: `team-insights:merge:${sha256(repositoryUrl)}`
- **Serialization**: JSON with ISO date strings
- **Rationale**: User preferences must persist across sessions

### ActivitySnapshot

- **Storage**: Transient (part of Contributor)
- **Rationale**: Aggregated data, can be recalculated from raw commits

---

## Domain Events (Future Consideration)

For post-MVP observability and extensibility:

1. `AnalysisStarted` - When repository analysis begins
2. `AnalysisCompleted` - When analysis finishes successfully
3. `AnalysisFailed` - When analysis encounters error
4. `IdentitiesMerged` - When user merges contributor identities
5. `ProgressUpdated` - When analysis progress changes (for SSE)

These events are **not implemented in MVP** but are documented for future reference.

---

## Summary

The domain model prioritizes:

- **Immutability**: Value objects are immutable
- **Validation**: Business rules enforced at entity boundaries
- **Testability**: Pure domain logic, no infrastructure dependencies
- **Extensibility**: Domain services for complex operations

All entities follow the Result type pattern for error handling, ensuring explicit error cases and type-safe domain logic.

**Constitutional Compliance**:

- ✅ Domain layer is pure TypeScript (no external dependencies)
- ✅ Business logic encapsulated in entities and domain services
- ✅ Validation rules clearly defined and testable
- ✅ Separation of concerns (domain vs infrastructure persistence)
