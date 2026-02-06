# DORA Deployment Frequency - Implementation Research

**Date**: 2026-02-06
**Feature**: DORA Metrics - Deployment Frequency
**Purpose**: Document technical decisions and research findings for implementation

## Executive Summary

This feature retrieves deployment data from three GitHub sources (Releases, Deployments, Tags) via GraphQL API, deduplicates events using tag-based matching, aggregates by ISO 8601 weeks/calendar months, and classifies performance against DORA benchmarks (Elite: 730+/year, High: 52-365/year, Medium: 12-52/year, Low: <12/year).

**Key Decisions**:

1. **Data Sources**: All three (Releases, Deployments, Tags) for maximum coverage
2. **Deduplication**: Tag name as primary key, prefer Releases > Deployments > Tags
3. **Filtering**: Include all deployment events (no environment filtering per FR-005)
4. **DORA Thresholds**: Elite: 730+/year (2+ per day), High: 52-365/year, Medium: 12-52/year, Low: <12/year

---

## 1. GitHub GraphQL API Design

### 1.1 Releases Query

**Query**: `src/infrastructure/github/graphql/releases.ts`

```graphql
query GetReleases(
  $owner: String!
  $repo: String!
  $first: Int!
  $after: String
) {
  repository(owner: $owner, name: $repo) {
    releases(
      first: $first
      after: $after
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      nodes {
        name
        tagName
        createdAt
        publishedAt
        isPrerelease
        isDraft
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
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

**TypeScript Interface**:

```typescript
export interface GitHubGraphQLRelease {
  name: string | null;
  tagName: string;
  createdAt: string;
  publishedAt: string | null;
  isPrerelease: boolean;
  isDraft: boolean;
}
```

**Date Field**: Use `publishedAt` (when released to users), fallback to `createdAt` if null
**Rate Cost**: ~1 point per 100 releases

### 1.2 Deployments Query

**Query**: `src/infrastructure/github/graphql/deployments.ts`

```graphql
query GetDeployments(
  $owner: String!
  $repo: String!
  $first: Int!
  $after: String
) {
  repository(owner: $owner, name: $repo) {
    deployments(
      first: $first
      after: $after
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      nodes {
        id
        createdAt
        updatedAt
        environment
        state
        description
        ref {
          name
          target {
            ... on Commit {
              oid
              committedDate
            }
          }
        }
        latestStatus {
          state
          createdAt
          description
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
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

**TypeScript Interface**:

```typescript
export interface GitHubGraphQLDeployment {
  id: string;
  createdAt: string;
  updatedAt: string;
  environment: string;
  state: DeploymentState;
  description: string | null;
  ref: {
    name: string;
    target: { oid: string; committedDate: string } | null;
  } | null;
  latestStatus: {
    state: DeploymentStatusState;
    createdAt: string;
    description: string | null;
  } | null;
}
```

**Date Field**: Use `createdAt` (deployment initiation time)
**Rate Cost**: ~2-3 points per 100 deployments (nested queries)

### 1.3 Tags Query

**Query**: `src/infrastructure/github/graphql/tags.ts`

```graphql
query GetTags($owner: String!, $repo: String!, $first: Int!, $after: String) {
  repository(owner: $owner, name: $repo) {
    refs(
      refPrefix: "refs/tags/"
      first: $first
      after: $after
      orderBy: { field: TAG_COMMIT_DATE, direction: DESC }
    ) {
      nodes {
        name
        target {
          ... on Tag {
            name
            tagger {
              name
              email
              date
            }
            target {
              ... on Commit {
                oid
                committedDate
                message
              }
            }
          }
          ... on Commit {
            oid
            committedDate
            message
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
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

**TypeScript Interface**:

```typescript
export interface GitHubGraphQLTag {
  name: string;
  target: GitHubGraphQLAnnotatedTag | GitHubGraphQLLightweightTag;
}

export interface GitHubGraphQLAnnotatedTag {
  __typename: "Tag";
  name: string;
  tagger: { name: string; email: string; date: string } | null;
  target: { oid: string; committedDate: string; message: string };
}

export interface GitHubGraphQLLightweightTag {
  __typename: "Commit";
  oid: string;
  committedDate: string;
  message: string;
}
```

**Date Field**: Annotated tags use `tagger.date`, lightweight tags use `committedDate`
**Rate Cost**: ~1-2 points per 100 tags

---

## 2. Deduplication Strategy

### Decision: Tag-Based Deduplication

**Primary Key**: Normalized tag name (e.g., "v1.0.0" → "1.0.0")
**Priority Order**: Releases > Deployments > Tags (prefer highest fidelity source)

**Algorithm**:

```typescript
function deduplicateDeployments(
  releases,
  deployments,
  tags,
): DeploymentEvent[] {
  const eventMap = new Map<string, DeploymentEvent>();

  // 1. Add releases (highest priority)
  for (const release of releases) {
    if (release.isDraft) continue; // Skip drafts
    const tagName = normalizeTagName(release.tagName); // "v1.0.0" -> "1.0.0"
    eventMap.set(tagName, {
      tagName,
      timestamp: new Date(release.publishedAt ?? release.createdAt),
      source: "release",
    });
  }

  // 2. Add deployments (only if no matching release)
  for (const deployment of deployments) {
    const tagName = extractTagFromDeployment(deployment);
    if (!tagName || eventMap.has(normalizeTagName(tagName))) continue;

    eventMap.set(normalizeTagName(tagName), {
      tagName: normalizeTagName(tagName),
      timestamp: new Date(deployment.createdAt),
      source: "deployment",
      environment: deployment.environment,
    });
  }

  // 3. Add tags (only if no release/deployment exists)
  for (const tag of tags) {
    const tagName = normalizeTagName(tag.name);
    if (eventMap.has(tagName)) continue;

    eventMap.set(tagName, {
      tagName,
      timestamp: extractTagDate(tag), // Handle annotated vs lightweight
      source: "tag",
    });
  }

  return Array.from(eventMap.values()).sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );
}

function normalizeTagName(tagName: string): string {
  return tagName
    .replace(/^refs\/tags\//, "") // Remove "refs/tags/" prefix
    .replace(/^v/, "") // Remove leading "v"
    .toLowerCase()
    .trim();
}
```

**Rationale**: Tag names are the most reliable unique identifier across all three sources. Releases and deployments both reference tags, making tag name the natural deduplication key.

---

## 3. DORA Performance Levels

### Definitions (2024 DORA Report)

| Level      | Frequency                       | Annual Deployments |
| ---------- | ------------------------------- | ------------------ |
| **Elite**  | Multiple per day                | 730+ (≥2/day)      |
| **High**   | Once per day to once per week   | 52-365             |
| **Medium** | Once per week to once per month | 12-52              |
| **Low**    | Less than once per month        | <12                |

**Implementation**:

```typescript
export const DORALevel = {
  ELITE: "elite",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INSUFFICIENT_DATA: "insufficient_data",
} as const;
export type DORALevel = (typeof DORALevel)[keyof typeof DORALevel];

function calculateDORALevel(deploymentsPerYear: number): DORALevel {
  if (deploymentsPerYear >= 730) return DORALevel.ELITE;
  if (deploymentsPerYear >= 52) return DORALevel.HIGH;
  if (deploymentsPerYear >= 12) return DORALevel.MEDIUM;
  if (deploymentsPerYear > 0) return DORALevel.LOW;
  return DORALevel.INSUFFICIENT_DATA;
}

function annualizeDeploymentFrequency(
  count: number,
  periodDays: number,
): number {
  if (periodDays === 0) return 0;
  return (count / periodDays) * 365;
}
```

---

## 4. Weekly/Monthly Aggregation

### ISO 8601 Week Calculation

**Existing Pattern**: Reuse `WeeklyAggregate` from PR Changes Timeseries feature

```typescript
import { startOfISOWeek, endOfISOWeek, formatISO } from "date-fns";

function aggregateByWeek(events: DeploymentEvent[]): Map<string, number> {
  const weekMap = new Map<string, number>();

  for (const event of events) {
    const weekStart = startOfISOWeek(event.timestamp);
    const weekKey = formatISO(weekStart, { representation: "date" }); // "2024-01-15"

    weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + 1);
  }

  return weekMap;
}
```

### Calendar Month Aggregation

```typescript
function aggregateByMonth(events: DeploymentEvent[]): Map<string, number> {
  const monthMap = new Map<string, number>();

  for (const event of events) {
    const monthKey = event.timestamp.toISOString().slice(0, 7); // "2024-01"
    monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + 1);
  }

  return monthMap;
}
```

---

## 5. Filtering Decisions

### FR-005 Resolution: Include All Deployment Events

**Per Spec FR-005**: "System MUST include all deployment events (releases, deployments, tags) without filtering by environment or pre-release status"

**Implementation**:

- **Releases**: Include ALL (including pre-releases), exclude only drafts
- **Deployments**: Include ALL environments (production, staging, etc.), exclude only failed deployments
- **Tags**: Include ALL semantic version tags

**Rationale**:

- Captures full deployment activity regardless of workflow
- Simplest implementation (no configuration needed)
- Most inclusive - works for teams without strict environment labeling

**Code**:

```typescript
function shouldIncludeRelease(release: GitHubGraphQLRelease): boolean {
  return !release.isDraft; // Only exclude drafts (not visible to users)
}

function shouldIncludeDeployment(deployment: GitHubGraphQLDeployment): boolean {
  // Include all environments, but exclude failed/error states
  return (
    deployment.latestStatus?.state === "SUCCESS" ||
    deployment.state === "ACTIVE"
  );
}

function shouldIncludeTag(tag: GitHubGraphQLTag): boolean {
  return isSemanticVersionTag(tag.name); // v1.0.0, 1.0.0, etc.
}

function isSemanticVersionTag(tagName: string): boolean {
  return /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(tagName);
}
```

---

## 6. Performance Considerations

### Rate Limit Budget

**Total Cost per Repository**:

- Releases: ~1 point per 100 items = ~10 points for 1000 releases
- Deployments: ~3 points per 100 items = ~30 points for 1000 deployments
- Tags: ~2 points per 100 items = ~20 points for 1000 tags
- **Total**: ~60 points for large repo (well within 5000/hour limit)

### Pagination Strategy

**Existing Pattern**: Follow `OctokitAdapter.ts` pagination approach

```typescript
async function fetchAllReleases(
  owner: string,
  repo: string,
): Promise<GitHubGraphQLRelease[]> {
  const releases: GitHubGraphQLRelease[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    await this.rateLimiter.waitIfNeeded(); // Reuse existing rate limiter

    const response = await graphqlWithAuth<ReleasesResponse>(RELEASES_QUERY, {
      owner,
      repo,
      first: 100,
      after: cursor,
    });

    releases.push(...response.repository.releases.nodes);
    hasNextPage = response.repository.releases.pageInfo.hasNextPage;
    cursor = response.repository.releases.pageInfo.endCursor;

    this.rateLimiter.updateRateLimit(response.rateLimit);
  }

  return releases;
}
```

### Caching Strategy

**Decision**: No caching for MVP
**Rationale**:

- Deployment data changes infrequently (deploys are not real-time)
- Fetching 500 deployments takes <2 seconds (within SC-001 requirement)
- Can add caching in future if performance becomes issue

---

## 7. Domain Model

### Value Objects

**DeploymentEvent** (Single deployment)

- Properties: `tagName`, `timestamp`, `source`, `environment?`
- Validation: timestamp must be valid date, source must be enum
- Methods: `getWeekKey()`, `getMonthKey()`

**DeploymentFrequency** (Aggregated metrics)

- Properties: `weeklyData`, `monthlyData`, `totalCount`, `averagePerWeek`, `averagePerMonth`
- Methods: `calculateDORALevel()`, `getWeeklyCounts()`, `getMonthlyCounts()`

**DORAPerformanceLevel** (Classification)

- Properties: `level`, `deploymentsPerYear`, `description`
- Methods: `getDisplayColor()`, `getBenchmarkRange()`, `getImprovementSuggestions()`

### Use Case

**CalculateDeploymentFrequency**

- Input: `IGitHubRepository`, `owner`, `repo`, `sinceDate?`
- Output: `DeploymentFrequencyResult` DTO
- Logic:
  1. Fetch releases, deployments, tags (parallel)
  2. Deduplicate deployment events
  3. Aggregate by week/month
  4. Calculate DORA level
  5. Return result with insights

---

## 8. UI Design Decisions

### Visualization Components

**DeploymentFrequencyChart** (Weekly trend line)

- Library: Recharts `<LineChart>`
- X-axis: ISO 8601 week start dates
- Y-axis: Deployment count
- Features: Hover tooltips, responsive sizing

**DeploymentBarChart** (Monthly bar chart)

- Library: Recharts `<BarChart>`
- X-axis: Calendar months (Jan 2024, Feb 2024, etc.)
- Y-axis: Deployment count
- Color: Gradient based on frequency (low=red, high=green)

**DORABenchmarkCard** (Performance level indicator)

- Display: Large badge with color (Elite=gold, High=green, Medium=orange, Low=red)
- Content: Level name, annual frequency, benchmark range
- Tooltip: Explanation of DORA levels

**DeploymentSummaryCards** (Statistics)

- Total deployments
- Average per week
- Average per month
- Time period covered

### Tab Integration

**Extend AnalysisTabs.tsx**:

```typescript
const tabs = [
  { id: "overview", label: "Overview" },
  { id: "throughput", label: "PR Throughput" },
  { id: "changes", label: "PR Changes" },
  { id: "deployment", label: "Deployment Frequency" }, // NEW
];
```

---

## 9. Alternative Approaches Considered

### Alternative 1: GitHub Actions Workflow Runs

**Rejected**: Workflow runs are not standardized across repositories. Many repos don't use GitHub Actions, and those that do may have multiple workflows (test, lint, deploy). Too complex to reliably identify "deployment" workflows.

### Alternative 2: Commit Message Parsing

**Rejected**: Unreliable. Commit messages are unstructured and vary widely ("Deploy v1.0.0", "Release", "prod push", etc.). Would require NLP or extensive regex patterns with high false positive/negative rates.

### Alternative 3: Environment-Specific Filtering

**Rejected (per FR-005)**: While more accurate for teams with proper environment labels, it would exclude teams that don't use this convention. The spec explicitly chooses inclusivity over precision.

---

## 10. Dependencies

**Existing Dependencies** (no new packages needed):

- `@octokit/graphql` 9.0.3 - GraphQL API client
- `date-fns` (check if already installed) - ISO week calculations
- `recharts` 3.5.0 - Chart components
- `zod` 4.1.13 - Response validation

**New Files** (to create):

- `src/infrastructure/github/graphql/releases.ts`
- `src/infrastructure/github/graphql/deployments.ts`
- `src/domain/value-objects/DeploymentEvent.ts`
- `src/domain/value-objects/DeploymentFrequency.ts`
- `src/domain/value-objects/DORAPerformanceLevel.ts`
- `src/application/use-cases/CalculateDeploymentFrequency.ts`

---

## Sources

- [GitHub GraphQL API Objects Documentation](https://docs.github.com/en/graphql/reference/objects)
- [2024 DORA State of DevOps Report](https://dora.dev/research/2024/dora-report/)
- [DORA Metrics Guide](https://dora.dev/guides/dora-metrics/)
- [Deployment Frequency Best Practices - Cortex](https://www.cortex.io/post/deployment-frequency-why-and-how-to-measure-it)
- [GitHub Tags vs Releases Comparison - MetriDev](https://www.metridev.com/en/metrics/github-tags-vs-releases-a-comprehensive-comparison/)
