# Feature Specification: PR Throughput Analysis

**Feature Branch**: `003-pr-throughput-analysis`
**Created**: 2025-12-23
**Status**: Draft
**Input**: User description: "PR Throughput Analysis（PRスループット分析）機能を実装する。開発チームの生産性を把握するため、PRのスループット（処理能力）を可視化したい。具体的には、PRのサイズとマージまでの時間の関係を分析し、最も効率的なPRサイズを特定できるようにする。"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View PR Lead Time Summary (Priority: P1)

A development team lead wants to understand how quickly their team merges pull requests to identify bottlenecks in their review process.

**Why this priority**: This provides the foundation for all throughput analysis - without basic lead time metrics, no further analysis is possible. This is the minimum viable feature that delivers immediate value.

**Independent Test**: Can be fully tested by accessing the dashboard and verifying that average lead time, median lead time, and total merged PR count are displayed. Delivers immediate value by showing team velocity at a glance.

**Acceptance Scenarios**:

1. **Given** a repository with merged PRs, **When** the user views the PR Throughput section, **Then** they see average lead time displayed in days and hours
2. **Given** a repository with merged PRs, **When** the user views the PR Throughput section, **Then** they see median lead time displayed in days and hours
3. **Given** a repository with merged PRs, **When** the user views the PR Throughput section, **Then** they see the total count of merged PRs
4. **Given** a repository with only open or rejected PRs, **When** the user views the PR Throughput section, **Then** they see a message indicating no merged PRs are available for analysis

---

### User Story 2 - Analyze PR Size vs Lead Time Relationship (Priority: P2)

A development team lead wants to understand whether smaller PRs are merged faster than larger ones to guide their team's PR sizing practices.

**Why this priority**: This enables data-driven decision-making about optimal PR sizes. Builds on P1 by adding the core analytical insight.

**Independent Test**: Can be tested by viewing the scatter plot visualization and verifying that each point represents a PR with its size (x-axis) and lead time (y-axis). Delivers value by revealing patterns in the data.

**Acceptance Scenarios**:

1. **Given** a repository with merged PRs of various sizes, **When** the user views the scatter plot, **Then** each point represents one PR with X-axis showing total line changes and Y-axis showing lead time in hours
2. **Given** the user hovers over a point in the scatter plot, **When** the tooltip appears, **Then** it displays PR number, size, and lead time
3. **Given** a repository with more than 1000 merged PRs, **When** the user views the scatter plot, **Then** the chart renders smoothly without performance degradation

---

### User Story 3 - Compare Lead Times Across Size Categories (Priority: P3)

A development manager wants to compare average lead times across different PR size categories (S, M, L, XL) to establish team guidelines for optimal PR sizing.

**Why this priority**: This provides actionable insights by categorizing the data. Most valuable when combined with P1 and P2, but can stand alone to guide PR sizing policies.

**Independent Test**: Can be tested by viewing the size bucket analysis table and bar chart, verifying that each bucket shows average lead time, PR count, and percentage. Delivers value by providing clear benchmarks for PR sizing.

**Acceptance Scenarios**:

1. **Given** a repository with merged PRs, **When** the user views the size bucket analysis, **Then** they see a table with columns: Size Bucket (S/M/L/XL), Line Range, Average Lead Time, PR Count, Percentage
2. **Given** size buckets are defined as S (1-50), M (51-200), L (201-500), XL (501+), **When** a PR has 150 lines changed, **Then** it is categorized as M
3. **Given** the user views the bar chart, **When** comparing buckets, **Then** the X-axis shows size buckets and Y-axis shows average lead time in hours
4. **Given** a size bucket has no PRs, **When** viewing the analysis, **Then** that bucket shows "0 PRs" and no average lead time

---

### User Story 4 - Receive Optimal PR Size Recommendation (Priority: P4)

A development team wants to see an automated recommendation for the most efficient PR size range based on their actual data to guide future work.

**Why this priority**: This provides the ultimate actionable insight but depends on P1-P3 data. Nice to have but not essential for initial value delivery.

**Independent Test**: Can be tested by viewing the insight message and verifying it identifies the size bucket with the lowest average lead time. Delivers value by providing clear, actionable guidance.

**Acceptance Scenarios**:

1. **Given** the system has calculated average lead times for all size buckets, **When** the S bucket (1-50 lines) has the lowest average lead time, **Then** the insight message displays "Small PRs are most efficient"
2. **Given** all size buckets have similar lead times (within 20% of each other), **When** viewing the insight, **Then** it displays "No clear difference based on PR size"
3. **Given** insufficient data (fewer than 10 merged PRs), **When** viewing the insight, **Then** it displays "Insufficient data: More merged PRs needed"

---

### Edge Cases

- What happens when a repository has zero merged PRs? Display a message: "No merged PRs available for throughput analysis. This analysis requires at least 1 merged PR."
- What happens when a PR has zero line changes (e.g., merge commit)? Include in count but categorize as size "S" (1-50 lines), treating 0 as minimum value.
- What happens when a PR has an extremely long lead time (e.g., 365+ days)? Include in calculations but may appear as outlier in scatter plot. No special handling needed.
- What happens when a PR was created and merged on the same day? Calculate as fractional days (e.g., 0.5 days = 12 hours). Display both hours and days for clarity.
- What happens when date ranges are filtered to exclude all merged PRs? Display the same "No merged PRs available" message as the zero merged PRs case.
- What happens with very large PRs (10,000+ lines)? Include in XL bucket without upper limit. Scatter plot should auto-scale axes appropriately.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST fetch merged PR data including creation date, merge date, and size (additions + deletions)
- **FR-002**: System MUST calculate lead time as the duration between PR creation date and merge date in calendar days and hours
- **FR-003**: System MUST display summary statistics: average lead time, median lead time, and total merged PR count
- **FR-004**: System MUST categorize PRs into size buckets: S (1-50 lines), M (51-200 lines), L (201-500 lines), XL (501+ lines)
- **FR-005**: System MUST display a table showing each size bucket with average lead time, PR count, and percentage distribution
- **FR-006**: System MUST render a scatter plot with PR size on X-axis and lead time on Y-axis
- **FR-007**: System MUST render a bar chart comparing average lead times across size buckets
- **FR-008**: System MUST generate an insight message recommending the most efficient PR size range based on lowest average lead time
- **FR-009**: System MUST only include PRs with a merged status (excluding open and closed-but-not-merged PRs)
- **FR-010**: System MUST handle repositories with 1000+ merged PRs without performance degradation
- **FR-011**: System MUST display the PR Throughput section after the Implementation Activity and Review Activity sections on the dashboard
- **FR-012**: System MUST calculate lead time using calendar days (not business days)

### Key Entities _(include if feature involves data)_

- **Pull Request Throughput Data**: Represents a merged PR with its creation date, merge date, size (total line changes), changed files count, and calculated lead time in hours/days
- **Size Bucket**: Represents a category of PRs grouped by size range (S/M/L/XL) with aggregate metrics including average lead time, PR count, and percentage of total
- **Throughput Insight**: Represents the automated recommendation identifying the most efficient PR size range based on analysis of all merged PRs

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Team leads can view PR lead time metrics (average, median, count) within 3 seconds of dashboard load for repositories with up to 1000 merged PRs
- **SC-002**: Users can identify the relationship between PR size and merge time by viewing the scatter plot without requiring additional filtering or configuration
- **SC-003**: System accurately categorizes 100% of merged PRs into the correct size buckets (S/M/L/XL) based on line changes
- **SC-004**: Users receive an actionable PR sizing recommendation based on their repository's actual data, enabling them to establish team guidelines
- **SC-005**: Dashboard displays PR Throughput analysis alongside existing Implementation and Review Activity sections with consistent visual design and user experience
- **SC-006**: System handles edge cases (zero merged PRs, same-day merges, zero line changes) gracefully with clear user messaging

## Assumptions

- GitHub API provides `merged_at` timestamp for merged PRs (needs verification - current implementation only captures `createdAt`)
- PR size is best measured as `additions + deletions` (total line changes) rather than net changes
- Calendar days are acceptable for lead time calculation; business day calculation is not required for initial version
- Recharts library supports scatter plots with sufficient customization for this use case
- The existing OctokitAdapter will need enhancement to capture `merged_at` and line change data
- Performance is acceptable if all PR data is loaded at once during the initial repository analysis
- Users understand that only merged PRs are included (closed-but-not-merged PRs are excluded)
- The "most efficient" PR size is defined as the size bucket with the lowest average lead time

## Dependencies

- Existing OctokitAdapter must be enhanced to fetch `merged_at` timestamp and line change data (`additions`, `deletions`, `changed_files`) from GitHub API
- Dashboard component structure must support adding a new section after Review Activity
- Recharts library must be compatible with scatter plot and bar chart requirements
- Existing repository analysis workflow (AnalyzeRepository use case) must be extended to include PR throughput calculations

## Out of Scope

- Business day calculation for lead time (only calendar days)
- Filtering or drill-down by specific time periods (e.g., last month vs last quarter)
- Individual contributor-level PR throughput analysis (focus is on repository-wide metrics)
- Comparison across multiple repositories
- Export of throughput data to CSV or other formats
- Real-time updates or notifications based on throughput changes
- Analysis of rejected PRs (closed but not merged)
- Cycle time analysis (time from first commit to merge) vs lead time (PR open to merge)
