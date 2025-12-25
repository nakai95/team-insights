# Quickstart: PR Throughput Analysis Implementation

**Feature**: 003-pr-throughput-analysis
**Date**: 2025-12-25
**Prerequisites**: Read [spec.md](./spec.md), [data-model.md](./data-model.md), and [research.md](./research.md)

## Implementation Sequence

This feature follows a **bottom-up implementation strategy**: domain → application → infrastructure → presentation. This ensures that business logic is tested before integration with external dependencies.

### Phase A: Domain Layer (1-2 hours)

### Phase B: Application Layer (1-2 hours)

### Phase C: Infrastructure Layer (1-2 hours)

### Phase D: Presentation Layer (2-3 hours)

### Phase E: Integration & Testing (1-2 hours)

**Total Estimated Time**: 6-11 hours

---

## Phase A: Domain Layer

**Objective**: Create domain entities and value objects with comprehensive unit tests.

### A1. Create PRThroughputData Value Object

**File**: `src/domain/value-objects/PRThroughputData.ts`

**Key Methods**:

```typescript
class PRThroughputData {
  static create(pr: PullRequest): PRThroughputData;
  get size(): number;
  get leadTimeHours(): number;
  get leadTimeDays(): number;
  get sizeBucket(): "S" | "M" | "L" | "XL";
}
```

**Test File**: `src/domain/value-objects/__tests__/PRThroughputData.test.ts`

**Test Cases**:

- ✅ Create from valid PR data
- ✅ Calculate size (additions + deletions)
- ✅ Calculate lead time in hours and days
- ✅ Categorize into correct size bucket (S/M/L/XL)
- ✅ Handle same-day merge (fractional days)
- ✅ Handle zero line changes (size = 0 → bucket S)
- ✅ Validate mergedAt >= createdAt
- ✅ Reject negative additions/deletions

**Dependencies**: None (pure domain logic)

---

### A2. Create SizeBucket Value Object

**File**: `src/domain/value-objects/SizeBucket.ts`

**Key Methods**:

```typescript
class SizeBucket {
  static fromPRs(
    bucket: "S" | "M" | "L" | "XL",
    prs: PRThroughputData[],
    totalPRCount: number,
  ): SizeBucket;

  get averageLeadTimeDays(): number;
}
```

**Test File**: `src/domain/value-objects/__tests__/SizeBucket.test.ts`

**Test Cases**:

- ✅ Calculate average lead time correctly
- ✅ Calculate PR count
- ✅ Calculate percentage distribution
- ✅ Handle empty bucket (prCount = 0)
- ✅ Return correct line range for each bucket type

**Dependencies**: PRThroughputData (from A1)

---

### A3. Create ThroughputInsight Value Object

**File**: `src/domain/value-objects/ThroughputInsight.ts`

**Key Methods**:

```typescript
class ThroughputInsight {
  static generate(
    buckets: SizeBucket[],
    totalPRCount: number,
  ): ThroughputInsight;
}
```

**Test File**: `src/domain/value-objects/__tests__/ThroughputInsight.test.ts`

**Test Cases**:

- ✅ Return 'insufficient_data' for < 10 PRs
- ✅ Return 'optimal' when clear winner exists (>20% difference)
- ✅ Return 'no_difference' when all buckets within 20%
- ✅ Identify correct optimal bucket
- ✅ Generate appropriate message for each type

**Dependencies**: SizeBucket (from A2)

---

### A4. Create PRThroughput Entity

**File**: `src/domain/entities/PRThroughput.ts`

**Key Methods**:

```typescript
class PRThroughput {
  static create(
    repositoryUrl: string,
    pullRequests: PullRequest[],
    dateRange: { start: Date; end: Date },
  ): PRThroughput;

  get totalMergedPRs(): number;
  get averageLeadTimeHours(): number;
  get medianLeadTimeHours(): number;
}
```

**Test File**: `src/domain/entities/__tests__/PRThroughput.test.ts`

**Test Cases**:

- ✅ Create from pull request list
- ✅ Filter only merged PRs
- ✅ Group PRs by size bucket
- ✅ Calculate summary statistics (average, median)
- ✅ Generate size bucket analysis
- ✅ Generate insight
- ✅ Always return 4 size buckets (S, M, L, XL)
- ✅ Handle empty PR list

**Dependencies**: PRThroughputData, SizeBucket, ThroughputInsight (from A1-A3)

---

## Phase B: Application Layer

**Objective**: Create use case and DTOs to orchestrate domain logic.

### B1. Create ThroughputResult DTO

**File**: `src/application/dto/ThroughputResult.ts`

**Key Methods**:

```typescript
class ThroughputResult {
  static fromDomain(throughput: PRThroughput): ThroughputResult;
}
```

**Test**: Not required (simple data transfer object)

**Dependencies**: PRThroughput entity (from A4)

---

### B2. Create CalculateThroughputMetrics Use Case

**File**: `src/application/use-cases/CalculateThroughputMetrics.ts`

**Key Methods**:

```typescript
class CalculateThroughputMetrics {
  async execute(
    request: CalculateThroughputMetricsRequest,
  ): Promise<Result<ThroughputResult>>;
}
```

**Test File**: `src/application/use-cases/__tests__/CalculateThroughputMetrics.test.ts`

**Test Cases**:

- ✅ Calculate metrics for valid PR list
- ✅ Return error for invalid date range
- ✅ Return success with insufficient_data for empty list
- ✅ Validate required fields present (mergedAt, additions, deletions)
- ✅ Handle large dataset (1000+ PRs)

**Dependencies**: PRThroughput, ThroughputResult (from A4, B1)

---

### B3. Extend AnalyzeRepository Use Case

**File**: `src/application/use-cases/AnalyzeRepository.ts` (existing)

**Changes**:

1. Import CalculateThroughputMetrics
2. After fetching PR data, call throughput calculation
3. Add throughput field to AnalysisResult

**Test Updates**: Add test case for throughput field in result

**Dependencies**: CalculateThroughputMetrics (from B2)

---

### B4. Extend AnalysisResult DTO

**File**: `src/application/dto/AnalysisResult.ts` (existing)

**Changes**:

```typescript
export interface AnalysisResult {
  // ... existing fields ...
  throughput?: ThroughputResult | null;
}
```

**Test**: Not required (type definition only)

---

## Phase C: Infrastructure Layer

**Objective**: Extend OctokitAdapter to fetch PR details including throughput fields.

### C1. Extend PullRequest Interface

**File**: `src/domain/interfaces/IGitHubRepository.ts` (existing)

**Changes**:

```typescript
export interface PullRequest {
  // ... existing fields ...
  mergedAt?: Date;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
}
```

**Test**: Type checking only

---

### C2. Update OctokitAdapter.getPullRequests()

**File**: `src/infrastructure/github/OctokitAdapter.ts` (existing)

**Changes** (around line 164):

```typescript
// When PR is merged, fetch detailed statistics
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

**Test File**: `src/infrastructure/github/__tests__/OctokitAdapter.test.ts` (extend existing)

**Test Updates**:

- ✅ Verify mergedAt is populated for merged PRs
- ✅ Verify additions/deletions are fetched via pulls.get()
- ✅ Verify rate limiting is applied between requests
- ✅ Mock pulls.get() endpoint in tests

**Dependencies**: None (external API call)

---

## Phase D: Presentation Layer

**Objective**: Create React components to visualize throughput analysis.

### D1. Create PRScatterChart Component

**File**: `src/presentation/components/PRScatterChart.tsx`

**Key Features**:

- Recharts ScatterChart with X=size, Y=leadTime
- Custom tooltip showing PR number, size, lead time
- Memoized with React.memo
- Disable animations for 500+ points

**Test**: Manual testing in Storybook (optional) or E2E test

**Dependencies**: Recharts library (already installed)

---

### D2. Create SizeBucketTable Component

**File**: `src/presentation/components/SizeBucketTable.tsx`

**Columns**:

1. Size Bucket
2. Line Range
3. Average Lead Time
4. PR Count
5. Percentage

**Test**: Manual testing or E2E test

---

### D3. Create SizeBucketBarChart Component

**File**: `src/presentation/components/SizeBucketBarChart.tsx`

**Key Features**:

- Recharts BarChart with X=bucket, Y=averageLeadTime
- Highlight optimal bucket (if available)

**Test**: Manual testing or E2E test

---

### D4. Create PRThroughputSection Component

**File**: `src/presentation/components/PRThroughputSection.tsx`

**Responsibilities**:

- Display summary statistics (average, median, count)
- Render PRScatterChart
- Render SizeBucketTable and SizeBucketBarChart
- Display ThroughputInsight message
- Handle empty state

**Test**: E2E test in Phase E

**Dependencies**: PRScatterChart, SizeBucketTable, SizeBucketBarChart (from D1-D3)

---

### D5. Integrate into Dashboard

**File**: `src/app/[locale]/components/Dashboard.tsx` (existing)

**Changes** (after Review Activity section):

```typescript
{/* Charts */}
<div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
  <ImplementationActivityChart ... />
  <Card>Review Activity</Card>
</div>

{/* NEW: PR Throughput Analysis */}
{result.throughput && (
  <PRThroughputSection throughput={result.throughput} />
)}

{/* Contributor List */}
<ContributorList contributors={contributors} />
```

**Test**: E2E test in Phase E

---

## Phase E: Integration & Testing

**Objective**: Verify end-to-end functionality and edge cases.

### E1. E2E Test: Happy Path

**File**: `tests/e2e/pr-throughput.spec.ts` (new)

**Test Steps**:

1. Navigate to dashboard
2. Trigger analysis for repository with merged PRs
3. Verify PR Throughput section is visible
4. Verify scatter plot renders
5. Verify size bucket table displays
6. Verify insight message displays

**Expected Result**: All elements render correctly

---

### E2. E2E Test: Empty State

**Test Steps**:

1. Navigate to dashboard
2. Trigger analysis for repository with NO merged PRs
3. Verify empty state message displays

**Expected Result**: "No merged PRs available for throughput analysis"

---

### E3. Performance Test: 1000+ PRs

**Test Steps**:

1. Trigger analysis for large repository (e.g., facebook/react)
2. Verify dashboard loads within 3 seconds
3. Verify scatter chart renders smoothly
4. Check React DevTools Profiler for render times

**Expected Result**: No performance degradation

---

### E4. Manual Testing Checklist

- [ ] Scatter plot displays correct data points
- [ ] Tooltip shows PR number, size, lead time
- [ ] Size bucket table shows correct aggregates
- [ ] Bar chart highlights optimal bucket
- [ ] Insight message is appropriate for data
- [ ] Empty state displays when no merged PRs
- [ ] Mobile responsive layout works
- [ ] Accessibility: keyboard navigation, screen reader

---

## Implementation Tips

### Domain Layer Best Practices

1. **Start with tests**: Write tests before implementation (TDD)
2. **Pure functions**: Domain logic should have no side effects
3. **Immutability**: Use readonly fields where possible
4. **Validation**: Validate at construction time

### Application Layer Best Practices

1. **Result types**: Use Result<T> for error handling
2. **Single responsibility**: One use case = one business operation
3. **Dependency injection**: Pass dependencies via constructor

### Infrastructure Layer Best Practices

1. **Rate limiting**: Always call `waitIfNeeded()` before API requests
2. **Error handling**: Transform technical errors to domain errors
3. **Testing**: Mock external dependencies (Octokit)

### Presentation Layer Best Practices

1. **Memoization**: Use React.memo and useMemo for expensive operations
2. **Performance**: Disable animations for large datasets
3. **Accessibility**: Add ARIA labels and keyboard navigation
4. **Loading states**: Show skeleton or spinner during data load

---

## Rollback Plan

If issues arise during implementation:

1. **Domain/Application Layer Issues**:
   - Revert commits
   - Fix tests first, then implementation
   - No external dependencies, safe to iterate

2. **Infrastructure Layer Issues**:
   - GitHub API changes: Check API documentation
   - Rate limit errors: Verify RateLimiter logic
   - Can roll back OctokitAdapter changes without affecting other features

3. **Presentation Layer Issues**:
   - Recharts rendering issues: Check data structure
   - Performance issues: Add more memoization
   - Can temporarily hide PR Throughput section if critical bugs

---

## Verification Checklist

Before marking this feature as complete:

### Code Quality

- [ ] All TypeScript strict mode checks pass
- [ ] No `any` types used
- [ ] No committed `console.log` statements
- [ ] ESLint and Prettier formatting applied

### Testing

- [ ] Domain layer: 80%+ test coverage
- [ ] Application layer: Use case tests pass
- [ ] E2E test: Happy path passes
- [ ] E2E test: Empty state passes

### Functionality

- [ ] Scatter plot renders correctly
- [ ] Size bucket analysis displays
- [ ] Insight message is appropriate
- [ ] Empty state handled gracefully
- [ ] Performance acceptable for 1000+ PRs

### Documentation

- [ ] Code comments for complex logic
- [ ] README updated (if needed)
- [ ] CLAUDE.md updated via agent context script

### Deployment

- [ ] Feature works in development environment
- [ ] Build succeeds (`pnpm build`)
- [ ] Tests pass (`pnpm test`)
- [ ] Type check passes (`pnpm type-check`)

---

## Next Steps

After completing this implementation:

1. **Phase 2: Generate tasks.md** using `/speckit.tasks` command
2. **Review**: Have another developer review the plan
3. **Implement**: Follow the phases in order
4. **Test**: Run all tests at each phase
5. **Deploy**: Merge to main after all checks pass

---

## Support

- **Design Questions**: Refer to [data-model.md](./data-model.md)
- **Technical Questions**: Refer to [research.md](./research.md)
- **Requirements Questions**: Refer to [spec.md](./spec.md)
- **Constitution Compliance**: Refer to [plan.md](./plan.md) Constitution Check section
