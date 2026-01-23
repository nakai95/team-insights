# Feature Specification: PR Changes Timeseries Analysis

**Feature Branch**: `005-pr-changes-timeseries`
**Created**: 2026-01-23
**Status**: Draft
**Input**: User description: "GitHubリポジトリにマージされたPRの変更量（additions/deletions/changedFiles）を時系列で可視化し、コードベースの成長やリファクタリングの傾向を把握する"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Weekly Code Change Trends (Priority: P1)

Development managers and team leads need to visualize how much code is being added and removed over time to understand development velocity, identify large refactoring efforts, and spot unusual patterns in codebase evolution.

**Why this priority**: This is the core value proposition - providing historical visibility into code changes that is currently unavailable in the existing PR Throughput Analysis feature. This alone delivers standalone value.

**Independent Test**: Can be fully tested by selecting a date range for a repository with merged PRs and viewing the weekly aggregated chart showing additions, deletions, and PR counts. Delivers immediate value by revealing historical change patterns.

**Acceptance Scenarios**:

1. **Given** a repository with 50 merged PRs over the past 3 months, **When** the user views the PR Changes Timeseries page, **Then** they see a chart displaying weekly aggregated additions (green) and deletions (red) as stacked areas with PR counts as bars
2. **Given** a week with multiple merged PRs, **When** the user hovers over that week's data point, **Then** they see tooltip showing total additions, deletions, net change, and number of PRs merged that week
3. **Given** the timeseries chart is displayed, **When** the user scrolls through the timeline, **Then** they can identify weeks with unusually high change volumes (potential refactoring or major features)

---

### User Story 2 - Identify Outlier Weeks (Priority: P2)

Users want to quickly spot weeks with abnormally high code changes to investigate major refactoring efforts, large feature merges, or potential code quality issues.

**Why this priority**: Builds on P1 by adding analytical value through automated outlier detection. Helps users focus attention on significant events rather than manually scanning charts.

**Independent Test**: Can be tested by viewing a repository where one week has changes 2+ standard deviations above the mean. The week should be visually highlighted and included in an insights summary panel.

**Acceptance Scenarios**:

1. **Given** a repository where one week had 10,000 line changes while average is 1,500 lines, **When** viewing the chart, **Then** that week is visually highlighted as an outlier
2. **Given** outlier weeks exist in the dataset, **When** viewing the insights summary, **Then** it lists the dates and change volumes of outlier weeks
3. **Given** no outlier weeks exist (consistent change patterns), **When** viewing insights, **Then** it indicates "No unusual change patterns detected"

---

### User Story 3 - Track Trend Direction (Priority: P3)

Users want to understand whether development velocity is increasing, decreasing, or stable over recent weeks to inform capacity planning and project timeline estimates.

**Why this priority**: Adds predictive value by showing trend direction. Lower priority because it requires sufficient historical data and is less immediately actionable than raw visualization and outlier detection.

**Independent Test**: Can be tested by viewing a repository with at least 8 weeks of PR history where the recent 4 weeks show an increasing trend in weekly changes. The insights panel should display "Increasing trend: +25% over last 4 weeks" or similar.

**Acceptance Scenarios**:

1. **Given** the last 4 weeks show increasing weekly change volumes, **When** viewing insights, **Then** it displays "Increasing trend" with percentage change
2. **Given** the last 4 weeks show decreasing weekly change volumes, **When** viewing insights, **Then** it displays "Decreasing trend" with percentage change
3. **Given** the last 4 weeks show stable change volumes (within 10% variance), **When** viewing insights, **Then** it displays "Stable trend"
4. **Given** insufficient data (fewer than 4 weeks of history), **When** viewing insights, **Then** it displays "Insufficient data for trend analysis"

---

### User Story 4 - View Statistical Summary (Priority: P3)

Users want to see aggregate statistics (total PRs, average weekly change volume, average PR size) to quickly understand repository activity levels without examining detailed charts.

**Why this priority**: Provides convenient summary metrics but is supplementary to the main visualization. Users can derive most of this information from the chart itself.

**Independent Test**: Can be tested by viewing any repository with merged PRs and verifying the summary panel displays correct counts and averages calculated from the dataset.

**Acceptance Scenarios**:

1. **Given** a repository with 50 merged PRs totaling 25,000 lines changed over 10 weeks, **When** viewing the summary, **Then** it shows "50 PRs merged", "Average 2,500 lines/week", "Average 500 lines/PR"
2. **Given** a repository with no merged PRs in the selected date range, **When** viewing the summary, **Then** it displays zero values with message "No merged PRs found in selected period"

---

### Edge Cases

- What happens when a repository has no merged PRs in the selected date range? (Display empty state with message)
- How does the system handle extremely large PRs (100,000+ lines changed)? (Chart should scale appropriately, outlier detection should still work)
- What happens when PRs lack additions/deletions/changedFiles data from GitHub API? (Exclude from aggregation, show warning if significant data missing)
- How does the system handle weeks with zero PR merges? (Display as zero values on chart to show gaps in activity)
- What happens when date range spans less than one full week? (Still aggregate by week boundaries, may show partial weeks at start/end)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST retrieve merged PR data including mergedAt timestamp, additions count, deletions count, and changedFiles count from GitHub repository in a single consolidated GraphQL query that serves all analysis tabs
- **FR-002**: System MUST aggregate PR changes by week with weeks starting on Monday
- **FR-003**: System MUST calculate weekly totals for additions, deletions, total changes (additions + deletions), PR count, and average PR size
- **FR-004**: System MUST display a timeseries chart with stacked area visualization showing additions (green) and deletions (red)
- **FR-005**: System MUST overlay weekly PR counts as bars on the same chart
- **FR-006**: System MUST display a 4-week moving average line showing change volume trends
- **FR-007**: System MUST identify weeks with change volumes exceeding 2 standard deviations from the mean
- **FR-008**: System MUST calculate trend direction (increasing/decreasing/stable) based on the most recent 4 weeks of data
- **FR-009**: System MUST display statistical summary including total PR count, average weekly change volume, and average PR size
- **FR-010**: System MUST show interactive tooltips on chart hover displaying detailed metrics for that week
- **FR-011**: System MUST handle repositories with no merged PRs by displaying an appropriate empty state
- **FR-012**: System MUST exclude PRs with missing change data from aggregation and log warnings
- **FR-013**: System MUST display PR Changes Timeseries as a dedicated tab within a shared tab navigation component alongside Overview and PR Throughput Analysis tabs
- **FR-014**: System MUST reflect active tab selection in URL query parameter (e.g., `/dashboard?tab=changes`) to enable bookmarking and browser back/forward navigation
- **FR-015**: System MUST preserve tab selection when users use browser back/forward buttons or refresh the page
- **FR-016**: System MUST organize dashboard content into three independently testable tab components: OverviewTab (summary cards, activity charts, contributor list), ThroughputTab (PR throughput analysis), and ChangesTimeseriesTab (weekly changes visualization)
- **FR-017**: System MUST manage shared state (repository information, analysis results, contributors) in the parent AnalysisTabs component and pass data to tabs via props, while tab-specific UI state (chart zoom, hover states) remains local to each tab

### Key Entities

- **Merged Pull Request**: Represents a merged PR with timestamp (mergedAt), additions count, deletions count, and changed files count
- **Weekly Aggregate**: Represents aggregated metrics for a calendar week (Monday-Sunday), including total additions, total deletions, total change volume, PR count, and average PR size
- **Change Trend**: Represents the directional trend (increasing/decreasing/stable) and percentage change over a 4-week period
- **Outlier Week**: Represents a week identified as having abnormally high change volumes based on statistical thresholds

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can view weekly code change trends for any repository with merged PRs within 3 seconds of page load
- **SC-002**: System accurately aggregates changes by calendar week (Monday start) with 100% correctness for all merged PRs
- **SC-003**: Users can identify large refactoring weeks or major feature merges by visual inspection within 10 seconds
- **SC-004**: Outlier detection correctly identifies weeks exceeding 2 standard deviations from mean in 100% of test cases
- **SC-005**: Chart displays remain readable and performant with up to 52 weeks (1 year) of data
- **SC-006**: Trend analysis provides directional indication (increasing/decreasing/stable) that matches manual calculation in 95%+ of cases
- **SC-007**: Users can understand repository activity patterns without reading documentation (intuitive visualization)
- **SC-008**: Tab switching between Overview, PR Throughput, and PR Changes Timeseries completes within 100ms (instant switching with pre-loaded data)

## Clarifications

### Session 2026-01-23

- Q: At which architectural layer should the tab navigation be implemented to integrate Overview, PR Throughput, and PR Changes Timeseries? → A: Create shared `AnalysisTabs` component in `src/presentation/components/` that wraps all analysis views
- Q: How should data be fetched for the three tabs (Overview, PR Throughput, PR Changes Timeseries)? → A: Fetch all data once in parent component and pass to tabs via props (single consolidated GraphQL query)
- Q: Should tab selection be reflected in the URL for bookmarking and browser history? → A: Use query parameter (`/dashboard?tab=throughput`) to reflect active tab, enabling bookmarking and browser history
- Q: How should the existing Dashboard component be split into tab-specific components? → A: Create three tab components: `OverviewTab` (summary cards + charts + contributor list), `ThroughputTab` (PRThroughputSection), `ChangesTimeseriesTab` (new timeseries feature)
- Q: Where and how should shared state (repository info, analysis result) and tab-specific state be managed? → A: Store shared state in parent AnalysisTabs component and pass via props to child tabs. Tab-specific UI state (zoom, selections) stays local to each tab component

## Integration Architecture _(derived from clarifications)_

### Component Structure

```
src/app/[locale]/dashboard/
  ├── page.tsx                           (route handler)
  └── DashboardContent.tsx               (data fetching, passes to AnalysisTabs)

src/presentation/components/
  ├── AnalysisTabs.tsx                   (tab navigation, shared state management)
  │   ├── OverviewTab.tsx                (summary cards, charts, contributor list)
  │   ├── ThroughputTab.tsx              (wraps existing PRThroughputSection)
  │   └── ChangesTimeseriesTab.tsx       (new timeseries feature)
  └── PRThroughputSection.tsx            (existing, wrapped by ThroughputTab)
```

### Data Flow

1. **Data Fetching**: `DashboardContent.tsx` fetches all analysis data via single consolidated GraphQL query
2. **State Management**: `AnalysisTabs` receives complete `AnalysisResult` including new timeseries data, manages shared state (contributors, repository info)
3. **Tab Rendering**: Each tab receives relevant data subset via props
4. **URL Sync**: Tab selection reflected in query parameter (`/dashboard?tab=overview|throughput|changes`)
5. **Performance**: All data pre-loaded, tab switching <100ms with no additional API calls

### Refactoring Impact

**Files to Create:**

- `src/presentation/components/AnalysisTabs.tsx`
- `src/presentation/components/OverviewTab.tsx`
- `src/presentation/components/ThroughputTab.tsx`
- `src/presentation/components/ChangesTimeseriesTab.tsx`
- New domain/application/infrastructure layers for timeseries feature

**Files to Modify:**

- `src/app/[locale]/components/Dashboard.tsx` → Content moved to `OverviewTab.tsx`
- `src/app/[locale]/dashboard/DashboardContent.tsx` → Integrate `AnalysisTabs` component
- `src/application/dto/AnalysisResult.ts` → Add `timeseriesData` field
- GraphQL query in infrastructure layer → Add timeseries fields

**Files to Preserve:**

- `src/presentation/components/PRThroughputSection.tsx` (wrapped by `ThroughputTab`, minimal changes)
- All existing domain/application logic for PR throughput analysis
