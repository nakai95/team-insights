# Feature Specification: Developer Activity Dashboard

**Feature Branch**: `001-dev-activity-dashboard`
**Created**: 2025-11-27
**Status**: Draft
**Input**: User description: "リポジトリの開発者活動を可視化するWebアプリケーションを作ります。ユーザーがリポジトリURLとGitHubトークンと任意で分析期間を入力すると、サーバー側でgit log解析とgithub apiからデータを取得して、コミット数、コード変更量、PRの回数、PRレビューのコメントの回数などを可視化します。開発者は同じアカウントでもorganizationなどに所属しているとメールアドレスを複数登録していることで別アカウントとしてカウントされる可能性があるため、ユーザー判断による統合ができるような機能が必要です。可視化するダッシュボードでは、実装活動のグラフ、レビュー活動のグラフ、ランキングなどが表示されると良いです。"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Basic Activity Visualization (Priority: P1)

A team lead wants to understand the overall contribution patterns in their repository. They input the repository URL and GitHub token, then view a dashboard showing commit counts, code changes, and contributor activity over the default analysis period.

**Why this priority**: This is the core MVP functionality that delivers immediate value. Without basic visualization, the application has no purpose. This story provides the foundation for all other features.

**Independent Test**: Can be fully tested by entering a repository URL and GitHub token, then verifying that the dashboard displays commit counts, code change metrics, and a list of contributors with their activity levels.

**Acceptance Scenarios**:

1. **Given** the user is on the home page, **When** they enter a valid GitHub repository URL and token, **Then** the system analyzes the repository and displays the activity dashboard
2. **Given** the user has submitted repository details, **When** the analysis completes, **Then** they see commit counts per contributor over the past 6 months (default period)
3. **Given** the dashboard is displayed, **When** the user views the implementation activity section, **Then** they see metrics including total commits and lines of code changed per contributor
4. **Given** the analysis is running, **When** data is being fetched, **Then** the user sees a progress indicator showing the current operation status

---

### User Story 2 - Pull Request and Review Activity (Priority: P2)

A development manager wants to understand not just code contributions, but also review participation. After viewing basic commit data, they can see PR creation counts and review comment activity for each team member.

**Why this priority**: This adds crucial context to code contributions by showing collaboration patterns. It helps identify both active contributors and active reviewers, providing a more complete picture of team dynamics.

**Independent Test**: Can be tested by viewing a repository's dashboard and verifying that PR counts and review comment counts are displayed separately from commit metrics, allowing managers to identify review participation patterns.

**Acceptance Scenarios**:

1. **Given** the user is viewing the activity dashboard, **When** they look at the review activity section, **Then** they see PR creation counts and PR review comment counts per contributor
2. **Given** the dashboard displays review metrics, **When** the user compares contributors, **Then** they can distinguish between implementation activity (commits, code changes) and review activity (PR counts, review comments)
3. **Given** the dashboard shows both types of activities, **When** viewing contributor rankings, **Then** rankings can be sorted by either implementation activity or review activity

---

### User Story 3 - Developer Identity Merging (Priority: P3)

A user notices that the same developer appears multiple times in the rankings because they use different email addresses in different organizations. The user can manually merge these identities to get an accurate view of that developer's total contributions.

**Why this priority**: This addresses a real data quality issue but is not essential for initial value delivery. Users can still gain insights from the raw data, and this feature enhances accuracy rather than enabling core functionality.

**Independent Test**: Can be tested by identifying duplicate developer entries in the dashboard, using the merge function to combine them, and verifying that the merged identity shows combined metrics across all their email addresses.

**Acceptance Scenarios**:

1. **Given** the user views the contributor list, **When** they identify multiple entries that represent the same person, **Then** they can select those entries and initiate a merge operation
2. **Given** the user has selected multiple developer identities to merge, **When** they confirm the merge, **Then** the system combines all commits, code changes, PRs, and review comments under a single unified identity
3. **Given** identities have been merged, **When** the user views rankings and graphs, **Then** the merged identity shows the sum of all activities previously attributed to the separate identities
4. **Given** the user has merged identities, **When** they return to the same repository later, **Then** the merge preferences are preserved for subsequent analyses

---

### User Story 4 - Custom Analysis Period (Priority: P4)

A product manager wants to analyze activity during a specific sprint or project phase. They can specify a custom date range when submitting the repository URL, allowing them to focus on relevant time periods.

**Why this priority**: This adds flexibility but the default 6-month period covers most use cases for initial validation. Custom periods enhance analytical capabilities but are not required for basic insights.

**Independent Test**: Can be tested by entering a repository URL with a custom date range (e.g., last month or last quarter), then verifying that the dashboard only shows activity within that specified period.

**Acceptance Scenarios**:

1. **Given** the user is on the input form, **When** they expand the advanced options, **Then** they can specify custom start and end dates for the analysis period
2. **Given** the user has specified a custom date range, **When** the analysis completes, **Then** all metrics (commits, code changes, PRs, reviews) reflect only the activities within that date range
3. **Given** the user submits without specifying dates, **When** the analysis runs, **Then** the system defaults to the past 6 months
4. **Given** the user specifies a very large date range (e.g., 5 years), **When** processing, **Then** the system handles the data volume efficiently or provides feedback about performance implications

---

### Edge Cases

- What happens when the GitHub token has insufficient permissions to access the repository?
- What happens when the repository URL is invalid or the repository doesn't exist?
- How does the system handle repositories with thousands of contributors?
- What happens when the GitHub API rate limit is reached during analysis?
- How does the system handle repositories with no PR activity (only direct commits)?
- What happens when a developer has made commits but no PRs or reviews?
- How does the system handle very large repositories (e.g., Linux kernel) with millions of commits?
- What happens if the user closes the browser during analysis?
- How does the system handle repositories with protected branches and limited access?
- What happens when analyzing a completely empty repository?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST accept a GitHub repository URL as input
- **FR-002**: System MUST accept a GitHub personal access token as input
- **FR-003**: System MUST validate the repository URL format before processing
- **FR-004**: System MUST validate the GitHub token has sufficient permissions (read access to repository)
- **FR-005**: System MUST allow users to optionally specify a custom analysis period with start and end dates
- **FR-006**: System MUST default to a 6-month analysis period when no custom period is specified
- **FR-007**: System MUST clone or fetch the repository data server-side using the provided credentials
- **FR-008**: System MUST parse git log data to extract commit information including author, date, and code changes
- **FR-009**: System MUST fetch pull request data from the GitHub API including PR author and creation date
- **FR-010**: System MUST fetch pull request review data from the GitHub API including reviewer and comment counts
- **FR-011**: System MUST calculate and display commit counts per contributor
- **FR-012**: System MUST calculate and display code change metrics (lines added/deleted/modified) per contributor
- **FR-013**: System MUST calculate and display pull request counts per contributor
- **FR-014**: System MUST calculate and display pull request review comment counts per contributor
- **FR-015**: System MUST display a progress indicator during data collection and analysis
- **FR-016**: System MUST display implementation activity metrics (commits, code changes) separately from review activity metrics (PRs, review comments)
- **FR-017**: System MUST generate visual graphs for implementation activity trends over time
- **FR-018**: System MUST generate visual graphs for review activity trends over time
- **FR-019**: System MUST display contributor rankings sortable by different metrics
- **FR-020**: System MUST allow users to select multiple developer identities for merging
- **FR-021**: System MUST combine all metrics when developer identities are merged
- **FR-022**: System MUST persist developer identity merge preferences for subsequent analyses of the same repository
- **FR-023**: System MUST handle GitHub API rate limiting gracefully with appropriate user feedback
- **FR-024**: System MUST clean up temporary repository data after analysis completion
- **FR-025**: System MUST NOT store or log the GitHub token in any persistent storage
- **FR-026**: System MUST display clear error messages when repository access fails
- **FR-027**: System MUST display clear error messages when invalid input is provided

### Key Entities

- **Repository Analysis**: Represents a single analysis session for a GitHub repository, containing the repository URL, analysis period, and timestamp
- **Contributor**: Represents a developer who has contributed to the repository, identified by name and email address(es), with associated activity metrics
- **Implementation Activity**: Metrics related to code contribution including commit count, lines added, lines deleted, and lines modified
- **Review Activity**: Metrics related to code review participation including PR count, review comment count
- **Identity Merge**: Represents the user's decision to combine multiple email addresses/identities into a single contributor view, persisted for future analyses
- **Activity Snapshot**: Time-series data point containing activity metrics for a specific time period, used for trend visualization

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can submit repository details and see the activity dashboard within 2 minutes for repositories with fewer than 1000 commits in the analysis period
- **SC-002**: The dashboard displays at least 4 distinct metrics: commit counts, code change volume, PR counts, and review comment counts
- **SC-003**: Users can identify the top 5 contributors by implementation activity within 10 seconds of viewing the dashboard
- **SC-004**: Users can identify the top 5 contributors by review activity within 10 seconds of viewing the dashboard
- **SC-005**: When multiple identities exist for the same person, users can merge them and see updated metrics within 5 seconds
- **SC-006**: 90% of valid repository URLs with proper tokens complete analysis successfully without errors
- **SC-007**: System provides actionable error messages for at least 95% of failure scenarios (invalid URL, insufficient permissions, API limits, etc.)
- **SC-008**: Users can distinguish between implementation activity and review activity without confusion (measured by user testing)
- **SC-009**: Analysis completes successfully for repositories with up to 5 years of history and 100 contributors
- **SC-010**: Progress indicators update at least every 5 seconds during analysis to maintain user confidence

## Assumptions

- GitHub personal access tokens are the standard authentication method (no OAuth flow required for MVP)
- Most repositories will have fewer than 100 active contributors in any 6-month period
- Default 6-month analysis period is sufficient for most use cases
- Users running the analysis have legitimate access to the repositories they analyze
- Git log data combined with GitHub API data provides sufficient information for meaningful insights
- Line count changes (additions/deletions) are a reasonable proxy for "code change volume"
- Server-side processing is acceptable even if it takes 1-2 minutes for large repositories
- Users understand that GitHub API rate limits may affect analysis of very large repositories
- Browser remains open during analysis (no background job processing for MVP)
- Identity merging is repository-specific (same merge doesn't automatically apply across different repositories)
