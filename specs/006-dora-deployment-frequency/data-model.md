# Data Model: DORA Deployment Frequency

**Feature**: 006-dora-deployment-frequency
**Date**: 2026-02-06
**Purpose**: Define domain entities, value objects, and their relationships

---

## 1. Value Objects

### 1.1 DeploymentEvent

**Purpose**: Represents a single deployment to any environment from any source (Release, Deployment, or Tag)

**Properties**:

```typescript
interface DeploymentEvent {
  /** Unique identifier for deduplication */
  readonly id: string;

  /** Tag name (normalized, e.g., "1.0.0" without "v" prefix) */
  readonly tagName: string | null;

  /** Deployment timestamp (when deployment occurred) */
  readonly timestamp: Date;

  /** Source type for provenance tracking */
  readonly source: "release" | "deployment" | "tag";

  /** Environment name (only for deployment source) */
  readonly environment?: string;

  /** Release/tag name for display */
  readonly displayName: string;
}
```

**Validation Rules**:

- `id` MUST be non-empty string
- `timestamp` MUST be valid Date object
- `source` MUST be one of the three allowed values
- `tagName` MUST be normalized (lowercase, no "v" prefix, no "refs/tags/" prefix)
- `displayName` MUST be non-empty string

**Methods**:

```typescript
class DeploymentEvent {
  /** Get ISO 8601 week key for aggregation (e.g., "2024-W03") */
  getWeekKey(): string;

  /** Get calendar month key for aggregation (e.g., "2024-01") */
  getMonthKey(): string;

  /** Check if deployment is from a specific source */
  isFromSource(source: "release" | "deployment" | "tag"): boolean;

  /** Format timestamp for display (e.g., "Jan 15, 2024") */
  formatTimestamp(locale: string): string;
}
```

**Factory Methods**:

```typescript
static fromRelease(release: GitHubGraphQLRelease): DeploymentEvent;
static fromDeployment(deployment: GitHubGraphQLDeployment): DeploymentEvent;
static fromTag(tag: GitHubGraphQLTag): DeploymentEvent;
```

---

### 1.2 DeploymentFrequency

**Purpose**: Aggregated deployment frequency metrics for a time period with weekly/monthly breakdowns

**Properties**:

```typescript
interface DeploymentFrequency {
  /** All deployment events in the period (sorted newest first) */
  readonly events: ReadonlyArray<DeploymentEvent>;

  /** Weekly aggregation map (weekKey -> count) */
  readonly weeklyData: ReadonlyMap<string, number>;

  /** Monthly aggregation map (monthKey -> count) */
  readonly monthlyData: ReadonlyMap<string, number>;

  /** Total deployment count */
  readonly totalCount: number;

  /** Average deployments per week */
  readonly averagePerWeek: number;

  /** Average deployments per month */
  readonly averagePerMonth: number;

  /** Number of days covered by the data */
  readonly periodDays: number;

  /** Annualized deployment frequency (projected to 365 days) */
  readonly deploymentsPerYear: number;
}
```

**Validation Rules**:

- `events` MUST be non-empty array for meaningful metrics
- `totalCount` MUST equal `events.length`
- `periodDays` MUST be > 0 if events exist
- `averagePerWeek` MUST be `totalCount / (periodDays / 7)`
- `averagePerMonth` MUST be `totalCount / (periodDays / 30.44)` (average month length)
- `deploymentsPerYear` MUST be `(totalCount / periodDays) * 365`

**Methods**:

```typescript
class DeploymentFrequency {
  /** Get deployment count for a specific week */
  getWeeklyCount(weekKey: string): number;

  /** Get deployment count for a specific month */
  getMonthlyCount(monthKey: string): number;

  /** Calculate DORA performance level */
  calculateDORALevel(): DORAPerformanceLevel;

  /** Get most recent N deployments */
  getRecentDeployments(count: number): DeploymentEvent[];

  /** Check if data period is sufficient (>= 90 days recommended) */
  hasSufficientData(): boolean;

  /** Get weekly data sorted by date (oldest to newest) */
  getWeeklyTimeseries(): Array<{ weekKey: string; count: number }>;

  /** Get monthly data sorted by date (oldest to newest) */
  getMonthlyTimeseries(): Array<{ monthKey: string; count: number }>;
}
```

**Factory Method**:

```typescript
static create(events: DeploymentEvent[]): DeploymentFrequency;
```

---

### 1.3 DORAPerformanceLevel

**Purpose**: Classification of deployment frequency against DORA industry benchmarks

**Properties**:

```typescript
interface DORAPerformanceLevel {
  /** Performance level classification */
  readonly level: "elite" | "high" | "medium" | "low" | "insufficient_data";

  /** Annualized deployment frequency used for classification */
  readonly deploymentsPerYear: number;

  /** Human-readable description */
  readonly description: string;

  /** Benchmark range for this level */
  readonly benchmarkRange: string;

  /** Color code for UI display */
  readonly displayColor: string;

  /** Suggestions for improvement (if not elite) */
  readonly improvementSuggestions: string[];
}
```

**Level Definitions**:

- **Elite**: ≥730 deployments/year (2+ per day)
- **High**: 52-729 deployments/year (1/week to <2/day)
- **Medium**: 12-51 deployments/year (1/month to <1/week)
- **Low**: 1-11 deployments/year (<1/month)
- **Insufficient Data**: 0 deployments

**Validation Rules**:

- `level` MUST be one of five allowed values
- `deploymentsPerYear` MUST be ≥ 0
- `displayColor` MUST be valid CSS color (hex or named)
- `benchmarkRange` MUST describe the frequency range

**Methods**:

```typescript
class DORAPerformanceLevel {
  /** Check if performance is elite */
  isElite(): boolean;

  /** Check if performance is at least high */
  isHighOrBetter(): boolean;

  /** Get next performance level to target */
  getNextLevel(): DORAPerformanceLevel | null;

  /** Get deployments needed to reach next level */
  getDeploymentsNeededForNextLevel(currentPeriodDays: number): number;
}
```

**Factory Method**:

```typescript
static fromDeploymentFrequency(frequency: DeploymentFrequency): DORAPerformanceLevel;
```

**Static Constants**:

```typescript
static readonly ELITE_THRESHOLD = 730;
static readonly HIGH_THRESHOLD = 52;
static readonly MEDIUM_THRESHOLD = 12;

static readonly COLORS = {
  elite: "#FFD700", // Gold
  high: "#22C55E", // Green
  medium: "#F59E0B", // Orange
  low: "#EF4444", // Red
  insufficient_data: "#9CA3AF", // Gray
} as const;
```

---

## 2. Entities

_No new entities required for this feature. Deployment frequency is calculated from value objects._

---

## 3. Domain Interfaces

### 3.1 IGitHubRepository (Extended)

**New Methods**:

```typescript
interface IGitHubRepository {
  // ... existing methods ...

  /**
   * Get GitHub Releases from repository
   * @param owner Repository owner
   * @param repo Repository name
   * @param sinceDate Optional date filter (releases published after this date)
   * @returns Result with array of releases
   */
  getReleases(
    owner: string,
    repo: string,
    sinceDate?: Date,
  ): Promise<Result<Release[]>>;

  /**
   * Get GitHub Deployments from repository
   * @param owner Repository owner
   * @param repo Repository name
   * @param sinceDate Optional date filter (deployments created after this date)
   * @returns Result with array of deployments
   */
  getDeployments(
    owner: string,
    repo: string,
    sinceDate?: Date,
  ): Promise<Result<Deployment[]>>;

  /**
   * Get Git tags from repository
   * @param owner Repository owner
   * @param repo Repository name
   * @param sinceDate Optional date filter (tags created after this date)
   * @returns Result with array of tags
   */
  getTags(
    owner: string,
    repo: string,
    sinceDate?: Date,
  ): Promise<Result<Tag[]>>;
}
```

**New Data Structures** (Infrastructure layer):

```typescript
// src/domain/interfaces/IGitHubRepository.ts additions

/** GitHub Release data */
export interface Release {
  name: string | null;
  tagName: string;
  createdAt: Date;
  publishedAt: Date | null;
  isPrerelease: boolean;
  isDraft: boolean;
}

/** GitHub Deployment data */
export interface Deployment {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  environment: string;
  state: string;
  ref: string | null;
  latestStatusState: string | null;
}

/** Git Tag data */
export interface Tag {
  name: string;
  createdAt: Date;
  isAnnotated: boolean;
  commitSha: string;
}
```

---

## 4. Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                     DeploymentFrequency                         │
│  - events: DeploymentEvent[]                                    │
│  - weeklyData: Map<string, number>                              │
│  - monthlyData: Map<string, number>                             │
│  - totalCount, averagePerWeek, averagePerMonth                  │
│  - periodDays, deploymentsPerYear                               │
└──────────────┬──────────────────────────────────────────────────┘
               │
               │ contains multiple
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DeploymentEvent                            │
│  - id, tagName, timestamp, source, environment                  │
│  - displayName                                                  │
└──────────────┬──────────────────────────────────────────────────┘
               │
               │ created from
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│           Infrastructure Data Sources                            │
│  Release (GitHub API) | Deployment (GitHub API) | Tag (Git)      │
└──────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                  DORAPerformanceLevel                           │
│  - level, deploymentsPerYear, description                       │
│  - benchmarkRange, displayColor, improvementSuggestions         │
└──────────────┬──────────────────────────────────────────────────┘
               │
               │ calculated from
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DeploymentFrequency                           │
└─────────────────────────────────────────────────────────────────┘
```

**Key Relationships**:

1. `DeploymentFrequency` **aggregates** multiple `DeploymentEvent` objects
2. `DeploymentEvent` **is created from** infrastructure data (Release/Deployment/Tag)
3. `DORAPerformanceLevel` **is calculated from** `DeploymentFrequency`
4. `DeploymentFrequency` **owns** aggregation maps (weekly/monthly)

---

## 5. Aggregation Logic

### 5.1 Weekly Aggregation

**Rule**: Group deployments by ISO 8601 week (Monday-Sunday)

```typescript
function aggregateByWeek(events: DeploymentEvent[]): Map<string, number> {
  const weekMap = new Map<string, number>();

  for (const event of events) {
    const weekKey = event.getWeekKey(); // e.g., "2024-W03"
    weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + 1);
  }

  return weekMap;
}
```

**Week Key Format**: `"YYYY-Www"` (ISO 8601 week format)

- Example: `"2024-W01"` (first week of 2024)
- Week starts on Monday, ends on Sunday

### 5.2 Monthly Aggregation

**Rule**: Group deployments by calendar month

```typescript
function aggregateByMonth(events: DeploymentEvent[]): Map<string, number> {
  const monthMap = new Map<string, number>();

  for (const event of events) {
    const monthKey = event.getMonthKey(); // e.g., "2024-01"
    monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + 1);
  }

  return monthMap;
}
```

**Month Key Format**: `"YYYY-MM"` (ISO 8601 month format)

- Example: `"2024-01"` (January 2024)

---

## 6. State Transitions

_No state machines required. Value objects are immutable._

**Lifecycle**:

1. Infrastructure fetches Releases, Deployments, Tags from GitHub
2. Factory methods create `DeploymentEvent` from each source
3. Deduplication merges events with same tag name
4. `DeploymentFrequency.create()` aggregates events
5. `DORAPerformanceLevel.fromDeploymentFrequency()` classifies performance

---

## 7. Invariants

### DeploymentEvent Invariants

- ✅ `id` is non-empty
- ✅ `timestamp` is valid Date
- ✅ `source` is one of three allowed values
- ✅ `tagName` is normalized (if present)
- ✅ `displayName` is non-empty

### DeploymentFrequency Invariants

- ✅ `totalCount === events.length`
- ✅ `periodDays > 0` if events exist
- ✅ `averagePerWeek === totalCount / (periodDays / 7)`
- ✅ `deploymentsPerYear === (totalCount / periodDays) * 365`
- ✅ `weeklyData` keys are valid ISO week format
- ✅ `monthlyData` keys are valid ISO month format
- ✅ Sum of weekly counts === totalCount
- ✅ Sum of monthly counts === totalCount

### DORAPerformanceLevel Invariants

- ✅ `level` matches `deploymentsPerYear` thresholds
- ✅ Elite: ≥730, High: 52-729, Medium: 12-51, Low: 1-11, Insufficient: 0
- ✅ `displayColor` is defined for each level
- ✅ `improvementSuggestions` is non-empty for non-elite levels

---

## 8. Error Conditions

### DeploymentEvent Creation Errors

- Invalid timestamp format
- Empty id or displayName
- Invalid source value
- Tag name normalization failure

### DeploymentFrequency Creation Errors

- Empty events array (insufficient data)
- Events with invalid timestamps
- Period calculation failure (all events have same timestamp)

### DORAPerformanceLevel Calculation Errors

- Negative deploymentsPerYear
- Invalid level value

**Error Handling**: All errors return `Result<T>` type with descriptive error messages for user-friendly display.

---

## 9. Example Data Flow

```typescript
// 1. Fetch from GitHub
const releases = await githubRepo.getReleases("owner", "repo");
const deployments = await githubRepo.getDeployments("owner", "repo");
const tags = await githubRepo.getTags("owner", "repo");

// 2. Create deployment events
const events = [
  ...releases.map(DeploymentEvent.fromRelease),
  ...deployments.map(DeploymentEvent.fromDeployment),
  ...tags.map(DeploymentEvent.fromTag),
];

// 3. Deduplicate by tag name
const uniqueEvents = deduplicateByTagName(events);

// 4. Aggregate into frequency metrics
const frequency = DeploymentFrequency.create(uniqueEvents);

// 5. Calculate DORA performance level
const doraLevel = DORAPerformanceLevel.fromDeploymentFrequency(frequency);

// 6. Display results
console.log(`Level: ${doraLevel.level}`); // "high"
console.log(`Deployments/year: ${doraLevel.deploymentsPerYear}`); // 120
console.log(`Average/week: ${frequency.averagePerWeek.toFixed(1)}`); // 2.3
```

---

## 10. Testing Considerations

### Unit Test Cases

**DeploymentEvent**:

- ✅ Create from release with publishedAt
- ✅ Create from release with null publishedAt (use createdAt)
- ✅ Create from deployment with environment
- ✅ Create from annotated tag (use tagger.date)
- ✅ Create from lightweight tag (use commit.date)
- ✅ Normalize tag name (remove "v" prefix, refs/tags/)
- ✅ Get week key (ISO 8601 format)
- ✅ Get month key (YYYY-MM format)

**DeploymentFrequency**:

- ✅ Create from empty array (insufficient data)
- ✅ Create from single event
- ✅ Create from multiple events (different weeks/months)
- ✅ Calculate average per week/month correctly
- ✅ Annualize deployment frequency correctly
- ✅ Weekly aggregation (group by ISO week)
- ✅ Monthly aggregation (group by calendar month)
- ✅ Get recent deployments (limit N)
- ✅ Check sufficient data (>= 90 days)

**DORAPerformanceLevel**:

- ✅ Classify elite (730+ per year)
- ✅ Classify high (52-729 per year)
- ✅ Classify medium (12-51 per year)
- ✅ Classify low (1-11 per year)
- ✅ Classify insufficient data (0 per year)
- ✅ Get correct display color for each level
- ✅ Get improvement suggestions (non-elite levels)
- ✅ Calculate deployments needed for next level

---

This data model provides a complete foundation for implementing DORA Deployment Frequency metrics with strong domain modeling, clear validation rules, and testable invariants.
