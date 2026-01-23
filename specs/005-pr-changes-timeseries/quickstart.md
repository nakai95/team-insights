# Quickstart: PR Changes Timeseries Implementation

**Feature**: 005-pr-changes-timeseries
**Date**: 2026-01-23
**Estimated Complexity**: Medium (8-12 hours)

This guide provides a step-by-step implementation plan for the PR Changes Timeseries feature.

---

## Prerequisites

- ✅ All research complete ([research.md](./research.md))
- ✅ Data model defined ([data-model.md](./data-model.md))
- ✅ Contracts documented ([contracts/](./contracts/))
- ✅ Constitutional compliance verified

---

## Implementation Order

Follow this order to minimize dependencies and enable incremental testing:

```
1. Domain Layer (value objects) → Test
2. Application Layer (use case) → Test
3. Application Layer (DTO) → No test needed
4. Presentation Layer (components) → Optional tests
5. Integration (wire everything together)
6. E2E Testing (optional)
```

---

## Step 1: Domain Layer - Value Objects (MANDATORY TESTS)

### 1.1 Create `WeeklyAggregate` Value Object

**File**: `src/domain/value-objects/WeeklyAggregate.ts`

**Implementation**:

```typescript
export class WeeklyAggregate {
  private constructor(
    public readonly weekStart: Date,
    public readonly weekEnd: Date,
    public readonly additions: number,
    public readonly deletions: number,
    public readonly totalChanges: number,
    public readonly netChange: number,
    public readonly prCount: number,
    public readonly averagePRSize: number,
    public readonly changedFilesTotal: number,
  ) {}

  static fromPRs(weekStart: Date, prs: MergedPR[]): WeeklyAggregate {
    // Validate weekStart is Monday
    // Filter PRs to this week
    // Aggregate additions, deletions, changedFiles
    // Calculate derived fields
  }

  static getWeekStart(date: Date): Date {
    // ISO week calculation (Monday start)
  }
}
```

**Tests**: `src/domain/value-objects/__tests__/WeeklyAggregate.test.ts`

- ✅ Creates aggregate from multiple PRs
- ✅ Handles empty PR list (zero values)
- ✅ Calculates averagePRSize correctly (handles division by zero)
- ✅ Filters PRs outside week boundaries
- ✅ Validates weekStart is Monday
- ✅ Handles PRs with missing data fields

**Time Estimate**: 1.5 hours (45 min implementation + 45 min tests)

---

### 1.2 Create `ChangeTrend` Value Object

**File**: `src/domain/value-objects/ChangeTrend.ts`

**Implementation**:

```typescript
export const TrendDirection = {
  INCREASING: "increasing",
  DECREASING: "decreasing",
  STABLE: "stable",
} as const;
export type TrendDirection =
  (typeof TrendDirection)[keyof typeof TrendDirection];

export class ChangeTrend {
  private constructor(
    public readonly direction: TrendDirection,
    public readonly percentChange: number,
    public readonly analyzedWeeks: number,
    public readonly startValue: number,
    public readonly endValue: number,
  ) {}

  static analyze(weeklyTotals: number[]): ChangeTrend {
    // Require >= 4 weeks
    // Compare first half vs second half
    // Classify as increasing/decreasing/stable
  }
}
```

**Tests**: `src/domain/value-objects/__tests__/ChangeTrend.test.ts`

- ✅ Detects increasing trend
- ✅ Detects decreasing trend
- ✅ Detects stable trend (within 10%)
- ✅ Throws error if < 4 weeks
- ✅ Calculates percentChange correctly
- ✅ Handles edge cases (zero values, all identical)

**Time Estimate**: 1 hour (30 min implementation + 30 min tests)

---

### 1.3 Create `OutlierWeek` Value Object

**File**: `src/domain/value-objects/OutlierWeek.ts`

**Implementation**:

```typescript
export class OutlierWeek {
  private constructor(
    public readonly weekStart: Date,
    public readonly totalChanges: number,
    public readonly prCount: number,
    public readonly zScore: number,
    public readonly meanValue: number,
    public readonly stdDeviation: number,
  ) {}

  static detect(
    weeklyData: WeeklyAggregate[],
    threshold: number = 2.0,
  ): OutlierWeek[] {
    // Calculate mean and std dev
    // Flag weeks > mean + threshold * stdDev
    // Return array of OutlierWeek instances
  }
}
```

**Tests**: `src/domain/value-objects/__tests__/OutlierWeek.test.ts`

- ✅ Detects single outlier week
- ✅ Detects multiple outlier weeks
- ✅ Returns empty array if no outliers
- ✅ Returns empty array if < 4 weeks
- ✅ Handles zero variance gracefully
- ✅ Calculates zScore correctly

**Time Estimate**: 1 hour (30 min implementation + 30 min tests)

---

## Step 2: Application Layer - Use Case (RECOMMENDED TESTS)

### 2.1 Create `CalculateChangesTimeseries` Use Case

**File**: `src/application/use-cases/CalculateChangesTimeseries.ts`

**Implementation**:

```typescript
export class CalculateChangesTimeseries {
  execute(mergedPRs: MergedPR[]): TimeseriesResult {
    // 1. Filter PRs with mergedAt !== null
    // 2. Group PRs by week using WeeklyAggregate.fromPRs()
    // 3. Generate weeklyData array (chronological order)
    // 4. Calculate trend (if >= 4 weeks) using ChangeTrend.analyze()
    // 5. Detect outliers using OutlierWeek.detect()
    // 6. Calculate summary statistics
    // 7. Return TimeseriesResult DTO
  }
}
```

**Tests**: `src/application/use-cases/__tests__/CalculateChangesTimeseries.test.ts`

- ✅ Aggregates PRs by week correctly
- ✅ Calculates trend when sufficient data
- ✅ Returns null trend when < 4 weeks
- ✅ Detects outlier weeks correctly
- ✅ Calculates summary statistics correctly
- ✅ Handles empty PR list (empty state)
- ✅ Excludes PRs with missing data

**Time Estimate**: 1.5 hours (45 min implementation + 45 min tests)

---

## Step 3: Application Layer - DTOs

### 3.1 Create `TimeseriesResult` DTO

**File**: `src/application/dto/TimeseriesResult.ts`

**Implementation**:

```typescript
export interface TimeseriesResult {
  weeklyData: WeeklyAggregateDto[];
  trend: ChangeTrendDto | null;
  outlierWeeks: OutlierWeekDto[];
  summary: TimeseriesSummary;
}

// Also define: WeeklyAggregateDto, ChangeTrendDto, OutlierWeekDto, TimeseriesSummary
```

**Time Estimate**: 30 minutes (no tests needed for DTOs)

---

### 3.2 Extend `AnalysisResult` DTO

**File**: `src/application/dto/AnalysisResult.ts`

**Modification**:

```typescript
export interface AnalysisResult {
  analysis: { /* existing fields */ };
  contributors: ContributorDto[];
  summary: { /* existing fields */ };
  throughput?: ThroughputResult;
  timeseries?: TimeseriesResult; // NEW: Add this field
}
```

**Time Estimate**: 5 minutes

---

## Step 4: Presentation Layer - Components (OPTIONAL TESTS)

### 4.1 Create `AnalysisTabs` Component

**File**: `src/presentation/components/AnalysisTabs.tsx`

**Features**:

- Tab navigation UI (Overview, PR Throughput, PR Changes Timeseries)
- URL synchronization with `useSearchParams` and `useRouter`
- Manages shared state (analysisResult)
- Renders active tab component

**Time Estimate**: 1 hour

---

### 4.2 Create `OverviewTab` Component

**File**: `src/presentation/components/OverviewTab.tsx`

**Implementation**:

- Extract existing content from `Dashboard.tsx`
- Display summary cards, activity charts, contributor list
- No new logic, just refactoring

**Time Estimate**: 30 minutes

---

### 4.3 Create `ThroughputTab` Component

**File**: `src/presentation/components/ThroughputTab.tsx`

**Implementation**:

- Wrap existing `PRThroughputSection` component
- Pass throughput data as prop
- Handle null throughput data gracefully

**Time Estimate**: 15 minutes

---

### 4.4 Create `ChangesTimeseriesTab` Component

**File**: `src/presentation/components/ChangesTimeseriesTab.tsx`

**Features**:

- Conditional rendering: EmptyState vs Chart + Insights
- Layout for chart and insights panel

**Time Estimate**: 30 minutes

---

### 4.5 Create `TimeseriesChart` Component

**File**: `src/presentation/components/ChangesTimeseriesTab/TimeseriesChart.tsx`

**Implementation**:

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

export function TimeseriesChart({
  weeklyData,
  outlierWeeks,
  height = 400,
}: TimeseriesChartProps) {
  // Format weeklyData for Recharts
  // Render ComposedChart with stacked areas + bars
  // Highlight outlier weeks visually
  // Custom tooltip with detailed metrics
}
```

**Time Estimate**: 1.5 hours

---

### 4.6 Create `TimeseriesInsights` Component

**File**: `src/presentation/components/ChangesTimeseriesTab/TimeseriesInsights.tsx`

**Features**:

- Display trend direction with icon and percentage
- List outlier weeks with dates and metrics
- Show summary statistics (total PRs, average weekly changes, etc.)

**Time Estimate**: 1 hour

---

### 4.7 Create `EmptyState` Component

**File**: `src/presentation/components/ChangesTimeseriesTab/EmptyState.tsx`

**Implementation**:

- Display friendly message when no merged PRs
- Show repository URL and date range
- Suggest expanding date range

**Time Estimate**: 15 minutes

---

## Step 5: Integration - Wire Everything Together

### 5.1 Modify `analyzeRepository` Server Action

**File**: `src/app/actions/analyzeRepository.ts`

**Changes**:

```typescript
// Import new use case
import { CalculateChangesTimeseries } from "@/application/use-cases/CalculateChangesTimeseries";

export async function analyzeRepository(/* params */) {
  // ... existing code to fetch PRs ...

  // NEW: Calculate timeseries data
  const calculateTimeseries = new CalculateChangesTimeseries();
  const timeseriesResult = calculateTimeseries.execute(mergedPRs);

  // Add to AnalysisResult
  return {
    // ... existing fields ...
    timeseries: timeseriesResult, // NEW
  };
}
```

**Time Estimate**: 15 minutes

---

### 5.2 Modify `DashboardContent` Component

**File**: `src/app/[locale]/dashboard/DashboardContent.tsx`

**Changes**:

```typescript
// Replace <Dashboard /> with <AnalysisTabs />
<AnalysisTabs
  analysisResult={analysisResult}
  initialTab={searchParams.get('tab') || 'overview'}
/>
```

**Time Estimate**: 10 minutes

---

### 5.3 Preserve `Dashboard.tsx` (Optional Refactoring)

**File**: `src/app/[locale]/components/Dashboard.tsx`

**Changes**:

- Move content to `OverviewTab.tsx` (if desired for cleaner architecture)
- OR keep Dashboard.tsx and use it within OverviewTab

**Time Estimate**: 15 minutes

---

## Step 6: E2E Testing (Optional)

### 6.1 Add Playwright Test

**File**: `tests/e2e/timeseries.spec.ts`

**Test Cases**:

- ✅ Navigate to dashboard with ?tab=changes
- ✅ Verify chart renders with weekly data
- ✅ Verify insights panel shows trends and outliers
- ✅ Verify tab switching works (Overview → Changes → Throughput)
- ✅ Verify browser back/forward buttons work
- ✅ Verify empty state displays when no PRs

**Time Estimate**: 1.5 hours

---

## Step 7: Manual Testing Checklist

- [ ] Load dashboard with repository containing merged PRs
- [ ] Switch to "PR Changes Timeseries" tab
- [ ] Verify chart displays weekly data correctly
- [ ] Hover over chart to see tooltip with detailed metrics
- [ ] Verify outlier weeks are highlighted visually
- [ ] Verify insights panel shows trend direction and percentage
- [ ] Verify summary statistics are correct
- [ ] Test with repository having < 4 weeks of data (trend = null, no outliers)
- [ ] Test with repository having no merged PRs (empty state)
- [ ] Test browser refresh preserves tab selection
- [ ] Test direct link to /dashboard?tab=changes
- [ ] Test browser back/forward buttons
- [ ] Test light/dark mode (chart colors should be readable)
- [ ] Test mobile responsive layout

---

## Total Time Estimate

| Step                           | Time            |
| ------------------------------ | --------------- |
| Domain Layer (3 value objects) | 3.5 hours       |
| Application Layer (use case)   | 1.5 hours       |
| Application Layer (DTOs)       | 0.5 hours       |
| Presentation Layer (7 comps)   | 4.75 hours      |
| Integration                    | 0.5 hours       |
| E2E Testing (optional)         | 1.5 hours       |
| **Total**                      | **12.25 hours** |

**Recommended Approach**: Implement in 2-3 sessions:

1. Session 1: Domain + Application layers (5 hours) - Core logic + tests
2. Session 2: Presentation layer (5 hours) - UI components
3. Session 3: Integration + testing (2 hours) - Wire together + verify

---

## Definition of Done

- ✅ All domain layer unit tests pass (80%+ coverage)
- ✅ Application layer use case tested with mocked dependencies
- ✅ Chart displays weekly data correctly
- ✅ Insights panel shows trends and outliers
- ✅ Tab navigation with URL synchronization works
- ✅ Empty state handles repositories with no PRs
- ✅ Browser back/forward/refresh preserves tab state
- ✅ No TypeScript errors (`pnpm type-check`)
- ✅ No ESLint errors (`pnpm lint`)
- ✅ All new code follows constitutional principles
- ✅ No `any` types, no `console.log` statements
- ✅ Manual testing checklist complete

---

## Common Pitfalls to Avoid

1. **Week Boundary Errors**: Ensure `getWeekStart()` correctly identifies Monday (test with various dates)
2. **Division by Zero**: Handle `prCount = 0` gracefully in averagePRSize calculations
3. **Date Parsing**: Use ISO 8601 strings for DTOs, Date objects for domain layer
4. **Recharts Y-Axis Scaling**: Use dual Y-axes (left for lines, right for PR count)
5. **URL Sync Race Conditions**: Use `useEffect` to sync URL params with local state
6. **Empty Data Handling**: Always check `weeklyData.length` before rendering chart

---

## Next Steps After Implementation

1. Run `/speckit.tasks` to generate detailed task breakdown
2. Create GitHub issues from tasks
3. Implement incrementally (domain → application → presentation)
4. Open PR after each major step (domain layer, application layer, UI)
5. Request code review with focus on constitutional compliance

---

**Quickstart Complete**: Ready for implementation phase. See [tasks.md](./tasks.md) (generated by `/speckit.tasks` command) for detailed task list.
