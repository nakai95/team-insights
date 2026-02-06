# Quickstart: DORA Deployment Frequency Implementation

**Feature**: 006-dora-deployment-frequency
**Date**: 2026-02-06
**Purpose**: Quick reference guide for implementing deployment frequency analysis

---

## Overview

This feature adds DORA Deployment Frequency metrics to the Team Insights dashboard by:

1. Fetching deployment data from GitHub (Releases, Deployments, Tags)
2. Deduplicating events by tag name
3. Aggregating by ISO 8601 weeks and calendar months
4. Classifying performance against DORA benchmarks
5. Visualizing trends in a new dashboard tab

**Estimated Effort**: 2-3 days for core implementation + 1 day for testing

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  - DeploymentFrequencyTab (main view)                       │
│  - DeploymentFrequencyChart (weekly line chart)             │
│  - DeploymentBarChart (monthly bar chart)                   │
│  - DORABenchmarkCard (performance level indicator)          │
│  - DeploymentSummaryCards (statistics)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  - CalculateDeploymentFrequency (use case)                  │
│  - DeploymentFrequencyResult (DTO)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     Domain Layer                            │
│  - DeploymentEvent (value object)                           │
│  - DeploymentFrequency (value object)                       │
│  - DORAPerformanceLevel (value object)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                       │
│  - OctokitAdapter.getReleases() (GraphQL query)             │
│  - OctokitAdapter.getDeployments() (GraphQL query)          │
│  - OctokitAdapter.getTags() (GraphQL query)                 │
│  - releases.ts (GraphQL schema)                             │
│  - deployments.ts (GraphQL schema)                          │
│  - tags.ts (GraphQL schema)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Domain Layer (2-3 hours)

**Files to Create**:

- `src/domain/value-objects/DeploymentEvent.ts`
- `src/domain/value-objects/DeploymentFrequency.ts`
- `src/domain/value-objects/DORAPerformanceLevel.ts`

**Key Points**:

- Use immutable value objects with validation
- Factory methods for creating from different sources
- Follow existing patterns (see `WeeklyAggregate.ts`, `ThroughputInsight.ts`)

**Example**:

```typescript
export class DeploymentEvent {
  private constructor(
    readonly id: string,
    readonly tagName: string | null,
    readonly timestamp: Date,
    readonly source: "release" | "deployment" | "tag",
    readonly environment?: string,
    readonly displayName: string = "",
  ) {}

  static fromRelease(release: Release): DeploymentEvent {
    return new DeploymentEvent(
      `release-${release.tagName}`,
      normalizeTagName(release.tagName),
      new Date(release.publishedAt ?? release.createdAt),
      "release",
      undefined,
      release.name ?? release.tagName,
    );
  }

  // More factory methods...
}
```

### Phase 2: Infrastructure Layer (3-4 hours)

**Files to Create**:

- `src/infrastructure/github/graphql/releases.ts`
- `src/infrastructure/github/graphql/deployments.ts`
- `src/infrastructure/github/graphql/tags.ts`

**Files to Modify**:

- `src/infrastructure/github/OctokitAdapter.ts` (add 3 new methods)
- `src/infrastructure/github/mappers/graphqlMappers.ts` (add 3 new mappers)
- `src/domain/interfaces/IGitHubRepository.ts` (extend interface)

**Key Points**:

- Follow existing pagination pattern from `pullRequests.ts`
- Reuse `RateLimiter` for rate limit management
- Return `Result<T>` for error handling

**Example**:

```typescript
// releases.ts
export const RELEASES_QUERY = `
  query GetReleases($owner: String!, $repo: String!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $repo) {
      releases(first: $first, after: $after, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes { name tagName createdAt publishedAt isPrerelease isDraft }
        pageInfo { hasNextPage endCursor }
      }
    }
    rateLimit { limit cost remaining resetAt }
  }
`;

// OctokitAdapter.ts
async getReleases(owner: string, repo: string, sinceDate?: Date): Promise<Result<Release[]>> {
  const releases: Release[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    await this.rateLimiter.waitIfNeeded();
    const response = await this.graphqlWithAuth<ReleasesResponse>(RELEASES_QUERY, {
      owner, repo, first: 100, after: cursor
    });

    releases.push(...response.repository.releases.nodes.map(mapRelease));
    hasNextPage = response.repository.releases.pageInfo.hasNextPage;
    cursor = response.repository.releases.pageInfo.endCursor;
    this.rateLimiter.updateRateLimit(response.rateLimit);
  }

  return ok(releases);
}
```

### Phase 3: Application Layer (2-3 hours)

**Files to Create**:

- `src/application/use-cases/CalculateDeploymentFrequency.ts`
- `src/application/dto/DeploymentFrequencyResult.ts`

**Files to Modify**:

- `src/application/use-cases/AnalyzeRepository.ts` (optional: add deployment analysis)

**Key Points**:

- Fetch all three sources in parallel (`Promise.all`)
- Deduplicate by normalized tag name
- Aggregate by week/month
- Calculate DORA level

**Example**:

```typescript
export class CalculateDeploymentFrequency {
  constructor(private githubRepo: IGitHubRepository) {}

  async execute(
    owner: string,
    repo: string,
    sinceDate?: Date,
  ): Promise<Result<DeploymentFrequencyResult>> {
    // 1. Fetch all sources in parallel
    const [releasesResult, deploymentsResult, tagsResult] = await Promise.all([
      this.githubRepo.getReleases(owner, repo, sinceDate),
      this.githubRepo.getDeployments(owner, repo, sinceDate),
      this.githubRepo.getTags(owner, repo, sinceDate),
    ]);

    // 2. Create deployment events
    const events = [
      ...(releasesResult.ok
        ? releasesResult.value.map(DeploymentEvent.fromRelease)
        : []),
      ...(deploymentsResult.ok
        ? deploymentsResult.value.map(DeploymentEvent.fromDeployment)
        : []),
      ...(tagsResult.ok ? tagsResult.value.map(DeploymentEvent.fromTag) : []),
    ];

    // 3. Deduplicate
    const uniqueEvents = deduplicateByTagName(events);

    // 4. Aggregate
    const frequency = DeploymentFrequency.create(uniqueEvents);

    // 5. Calculate DORA level
    const doraLevel = DORAPerformanceLevel.fromDeploymentFrequency(frequency);

    return ok(DeploymentFrequencyResult.from(frequency, doraLevel));
  }
}
```

### Phase 4: Presentation Layer (4-5 hours)

**Files to Create**:

- `src/presentation/components/analysis/DeploymentFrequencyTab.tsx`
- `src/presentation/components/analysis/DeploymentFrequencyChart.tsx`
- `src/presentation/components/analysis/DeploymentBarChart.tsx`
- `src/presentation/components/analysis/DORABenchmarkCard.tsx`
- `src/presentation/components/analysis/DeploymentSummaryCards.tsx`

**Files to Modify**:

- `src/presentation/components/analysis/AnalysisTabs.tsx` (add new tab)
- `src/app/actions/analyzeRepository.ts` (optional: include deployment data)

**Key Points**:

- Use Recharts for visualizations (follow existing patterns)
- Implement responsive design for mobile
- Add loading states and error handling
- Use existing UI components (Card, Badge, etc.)

**Example**:

```typescript
export function DeploymentFrequencyTab({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <DeploymentSummaryCards
        totalDeployments={data.totalDeployments}
        averagePerWeek={data.averagePerWeek}
        averagePerMonth={data.averagePerMonth}
        periodDays={data.periodDays}
      />

      {/* DORA benchmark indicator */}
      <DORABenchmarkCard doraLevel={data.doraLevel} />

      {/* Weekly trend chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Deployment Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <DeploymentFrequencyChart data={data.weeklyData} />
        </CardContent>
      </Card>

      {/* Monthly bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Deployment Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <DeploymentBarChart data={data.monthlyData} />
        </CardContent>
      </Card>
    </div>
  );
}
```

### Phase 5: Testing (4-6 hours)

**Test Files to Create**:

- `src/domain/value-objects/__tests__/DeploymentEvent.test.ts`
- `src/domain/value-objects/__tests__/DeploymentFrequency.test.ts`
- `src/domain/value-objects/__tests__/DORAPerformanceLevel.test.ts`
- `src/application/use-cases/__tests__/CalculateDeploymentFrequency.test.ts`
- `tests/e2e/deployment-frequency.spec.ts`

**Test Coverage Goals**:

- Domain: 80%+ (mandatory)
- Application: 70%+ (recommended)
- E2E: Critical path only (navigate to tab → see data)

**Example Test**:

```typescript
describe("DeploymentFrequency", () => {
  it("should aggregate events by week correctly", () => {
    const events = [
      DeploymentEvent.fromRelease({ tagName: "v1.0.0", publishedAt: "2024-01-15T10:00:00Z", ... }),
      DeploymentEvent.fromRelease({ tagName: "v1.0.1", publishedAt: "2024-01-16T10:00:00Z", ... }),
      DeploymentEvent.fromRelease({ tagName: "v1.0.2", publishedAt: "2024-01-22T10:00:00Z", ... }),
    ];

    const frequency = DeploymentFrequency.create(events);

    expect(frequency.getWeeklyCount("2024-W03")).toBe(2); // Jan 15-16
    expect(frequency.getWeeklyCount("2024-W04")).toBe(1); // Jan 22
  });

  it("should calculate DORA level correctly", () => {
    const events = createEventsForYear(800); // 800 deployments in 365 days
    const frequency = DeploymentFrequency.create(events);
    const doraLevel = frequency.calculateDORALevel();

    expect(doraLevel.level).toBe(DORALevel.ELITE);
    expect(doraLevel.deploymentsPerYear).toBeGreaterThanOrEqual(730);
  });
});
```

---

## Key Implementation Notes

### 1. Deduplication Algorithm

**Priority**: Releases > Deployments > Tags

```typescript
function deduplicateByTagName(events: DeploymentEvent[]): DeploymentEvent[] {
  const eventMap = new Map<string, DeploymentEvent>();

  // Process releases first (highest priority)
  events
    .filter((e) => e.source === "release")
    .forEach((e) => {
      if (e.tagName) eventMap.set(e.tagName, e);
    });

  // Add deployments (only if no matching release)
  events
    .filter((e) => e.source === "deployment")
    .forEach((e) => {
      if (e.tagName && !eventMap.has(e.tagName)) eventMap.set(e.tagName, e);
    });

  // Add tags (only if no release/deployment)
  events
    .filter((e) => e.source === "tag")
    .forEach((e) => {
      if (e.tagName && !eventMap.has(e.tagName)) eventMap.set(e.tagName, e);
    });

  return Array.from(eventMap.values()).sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );
}
```

### 2. DORA Level Thresholds

```typescript
export const DORALevel = {
  ELITE: "elite", // ≥730 per year (2+ per day)
  HIGH: "high", // 52-729 per year
  MEDIUM: "medium", // 12-51 per year
  LOW: "low", // 1-11 per year
  INSUFFICIENT_DATA: "insufficient_data", // 0 deployments
} as const;
```

### 3. Week/Month Aggregation

**Use `date-fns` for ISO week calculations**:

```typescript
import { startOfISOWeek, format } from "date-fns";

getWeekKey(): string {
  const weekStart = startOfISOWeek(this.timestamp);
  return format(weekStart, "'W'II-yyyy"); // "W03-2024"
}

getMonthKey(): string {
  return format(this.timestamp, "yyyy-MM"); // "2024-01"
}
```

---

## Common Pitfalls

### ❌ Mistake 1: Not Handling Null Timestamps

```typescript
// BAD
const timestamp = new Date(release.publishedAt);

// GOOD
const timestamp = new Date(release.publishedAt ?? release.createdAt);
```

### ❌ Mistake 2: Forgetting Tag Normalization

```typescript
// BAD
eventMap.set(release.tagName, event); // "v1.0.0" != "1.0.0"

// GOOD
eventMap.set(normalizeTagName(release.tagName), event);

function normalizeTagName(tagName: string): string {
  return tagName
    .replace(/^refs\/tags\//, "")
    .replace(/^v/, "")
    .toLowerCase();
}
```

### ❌ Mistake 3: Not Filtering Drafts

```typescript
// BAD
releases.map(DeploymentEvent.fromRelease);

// GOOD
releases.filter((r) => !r.isDraft).map(DeploymentEvent.fromRelease);
```

### ❌ Mistake 4: Incorrect Annualization

```typescript
// BAD
const perYear = (count / periodDays) * 12; // Wrong! This assumes months

// GOOD
const perYear = (count / periodDays) * 365;
```

---

## Testing Checklist

- [ ] Domain value objects have 80%+ test coverage
- [ ] Use case has unit tests with mocked dependencies
- [ ] Deduplication logic tested with overlapping data
- [ ] DORA level classification tested for all thresholds
- [ ] Weekly/monthly aggregation tested across year boundaries
- [ ] E2E test navigates to tab and verifies data display
- [ ] Edge case: No deployment data (shows "Insufficient Data" message)
- [ ] Edge case: Short data period (<90 days) shows warning
- [ ] Performance: Handles 500 deployments without degradation

---

## Success Criteria Verification

| Criterion                     | How to Verify                                            |
| ----------------------------- | -------------------------------------------------------- |
| SC-001: Load time <2s         | Use browser DevTools Network tab                         |
| SC-002: Support 500 events    | Test with large repository (e.g., kubernetes/kubernetes) |
| SC-003: DORA level visible    | Check UI without reading documentation                   |
| SC-004: 95% accuracy          | Manually count releases and compare                      |
| SC-005: Trends understandable | User testing with non-technical stakeholders             |
| SC-006: Handle no data        | Test with repository without releases/tags               |

---

## Deployment Checklist

- [ ] All tests passing (`pnpm test`)
- [ ] Type check passing (`pnpm type-check`)
- [ ] Linter passing (`pnpm lint`)
- [ ] E2E tests passing (`pnpm test:e2e`)
- [ ] Manual testing on 3+ repositories (small, medium, large)
- [ ] Mobile responsive design verified
- [ ] Dark mode styling verified
- [ ] Performance tested (no timeouts, <2s load)
- [ ] CLAUDE.md updated with new feature documentation
- [ ] PR created with clear description and screenshots

---

## Useful Commands

```bash
# Run domain tests only
pnpm test src/domain/value-objects/__tests__/Deployment*.test.ts

# Run application tests only
pnpm test src/application/use-cases/__tests__/CalculateDeploymentFrequency.test.ts

# Run E2E tests
pnpm test:e2e tests/e2e/deployment-frequency.spec.ts

# Type check
pnpm type-check

# Lint and fix
pnpm lint:fix

# Run dev server
pnpm dev
```

---

## References

- **Spec**: [spec.md](./spec.md)
- **Plan**: [plan.md](./plan.md)
- **Research**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **Contracts**: [contracts/](./contracts/)
- **DORA Guide**: https://dora.dev/guides/dora-metrics/
- **GitHub GraphQL Docs**: https://docs.github.com/en/graphql

---

**Estimated Timeline**:

- Day 1: Domain + Infrastructure (Phases 1-2)
- Day 2: Application + Presentation (Phases 3-4)
- Day 3: Testing + Polish (Phase 5)

**Ready to start? Begin with Phase 1 (Domain Layer)!**
