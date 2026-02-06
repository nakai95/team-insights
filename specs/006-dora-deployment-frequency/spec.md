# Feature Specification: DORA Metrics - Deployment Frequency

**Feature Branch**: `006-dora-deployment-frequency`
**Created**: 2026-02-06
**Status**: Draft
**Input**: User description: "Feature: DORA Metrics - Deployment Frequency

目的:

- GitHub Releases, Deployments, Tagsから本番デプロイ頻度を計算
- DORA 4 Keysの1つ目の指標を実装
- 週次・月次のデプロイ頻度を可視化

技術要件:

- GitHub GraphQL APIで以下を取得:
  1. Releases (リリース履歴)
  2. Deployments (デプロイメント履歴)
  3. Tags (semantic versioningタグ)
- 新規GraphQLクエリファイル作成:
  - src/infrastructure/github/graphql/releases.ts
  - src/infrastructure/github/graphql/deployments.ts
- ドメイン層に新規Value Object追加:
  - DeploymentFrequency (週次/月次集計)
  - Release (リリース情報)
- OctokitAdapterにメソッド追加:
  - getReleases()
  - getDeployments()
- 既存のIGitHubRepositoryインターフェース拡張

UI要件:

- Deployment Frequency専用タブ追加
- 週次デプロイ頻度の折れ線グラフ
- 月次デプロイ頻度の棒グラフ
- 平均デプロイ頻度のサマリーカード
- DORAベンチマーク比較表示 (Elite/High/Medium/Low)

期待効果:

- DORA 4 Keys対応開始
- デプロイ頻度の可視化によるリリースサイクル改善
- 業界標準メトリクスとの比較可能"

## User Scenarios & Testing

### User Story 1 - View Deployment Frequency Dashboard (Priority: P1)

As a team lead analyzing delivery performance, I need to see how often my team deploys to production so that I can understand our release cadence and identify opportunities to improve our delivery speed.

**Why this priority**: This is the core value proposition of the feature - enabling teams to track their deployment frequency, which is the most fundamental DORA metric. Without this visualization, the feature provides no user value.

**Independent Test**: Can be fully tested by navigating to the analysis dashboard, selecting the Deployment Frequency tab, and verifying that deployment counts are displayed for the selected time period. Delivers immediate value by showing current deployment patterns.

**Acceptance Scenarios**:

1. **Given** a repository with 10 releases in the past 3 months, **When** I navigate to the Deployment Frequency tab, **Then** I should see a visualization showing all 10 deployments aggregated by week and month
2. **Given** I am viewing the deployment frequency data, **When** the data loads, **Then** I should see the average deployments per week and per month displayed clearly
3. **Given** multiple deployment sources exist (releases, tags, deployments), **When** I view the dashboard, **Then** all deployment events should be aggregated and deduplicated to show an accurate count

---

### User Story 2 - Compare Against DORA Benchmarks (Priority: P2)

As a team lead evaluating our performance, I need to see how our deployment frequency compares to industry benchmarks (Elite/High/Medium/Low) so that I can understand where we stand and set improvement goals.

**Why this priority**: Provides context for the raw metrics by showing industry standards. While valuable, teams can still benefit from seeing their own trends without benchmarks.

**Independent Test**: Can be tested by viewing the deployment frequency dashboard and verifying that the DORA performance level (Elite/High/Medium/Low) is clearly displayed based on the calculated deployment frequency.

**Acceptance Scenarios**:

1. **Given** my team deploys multiple times per day, **When** I view the deployment frequency, **Then** I should see my team classified as "Elite" performer
2. **Given** my team deploys once per week, **When** I view the deployment frequency, **Then** I should see my team classified as "High" performer
3. **Given** my team deploys once per month, **When** I view the deployment frequency, **Then** I should see my team classified as "Medium" performer
4. **Given** my team deploys less than once per month, **When** I view the deployment frequency, **Then** I should see my team classified as "Low" performer

---

### User Story 3 - Analyze Deployment Trends Over Time (Priority: P3)

As a team lead tracking improvement efforts, I need to see how our deployment frequency has changed over time so that I can evaluate whether our process improvements are having an impact.

**Why this priority**: Enables trend analysis and long-term tracking, which is valuable for continuous improvement but not essential for the initial understanding of deployment frequency.

**Independent Test**: Can be tested by viewing deployment frequency data over different time ranges and verifying that weekly and monthly trends are visible in chart visualizations.

**Acceptance Scenarios**:

1. **Given** deployment frequency data over 6 months, **When** I view the weekly trend chart, **Then** I should see a line graph showing deployments per week over time
2. **Given** deployment frequency has increased from 2 to 8 deployments per week, **When** I view the trend, **Then** I should see a clear upward trend in the visualization
3. **Given** I want to analyze different time periods, **When** I change the date range filter, **Then** the deployment frequency visualizations should update to show only deployments within the selected range

---

### Edge Cases

- What happens when a repository has no releases, deployments, or version tags?
- How does the system handle repositories that use non-standard tagging conventions (e.g., not semantic versioning)?
- What happens when multiple deployment events occur on the same day (releases, deployments, tags)?
- How does the system handle very old repositories with thousands of historical deployments?
- What happens when deployment data sources conflict (e.g., a release without a corresponding tag)?
- How does the system distinguish between production deployments and pre-release/staging deployments?

## Requirements

### Functional Requirements

- **FR-001**: System MUST retrieve all GitHub Releases from the repository with their creation dates
- **FR-002**: System MUST retrieve all GitHub Deployments from the repository with their creation dates and environment information
- **FR-003**: System MUST retrieve all Git tags from the repository with their creation dates
- **FR-004**: System MUST aggregate deployment events from multiple sources (releases, deployments, tags) and deduplicate based on timestamps
- **FR-005**: System MUST include all deployment events (releases, deployments, tags) without filtering by environment or pre-release status, capturing all deployment activity regardless of workflow
- **FR-006**: System MUST calculate weekly deployment frequency by grouping deployments into ISO 8601 weeks
- **FR-007**: System MUST calculate monthly deployment frequency by grouping deployments by calendar month
- **FR-008**: System MUST calculate the average deployment frequency (deployments per week and per month)
- **FR-009**: System MUST classify deployment frequency performance according to DORA benchmarks: Elite (multiple per day), High (once per week to once per month), Medium (once per month to once per 6 months), Low (less than once per 6 months)
- **FR-010**: System MUST display deployment frequency data in a dedicated dashboard tab
- **FR-011**: System MUST provide a time-series visualization showing weekly deployment counts
- **FR-012**: System MUST provide a bar chart visualization showing monthly deployment counts
- **FR-013**: System MUST display summary statistics including total deployments, average per week, and average per month
- **FR-014**: System MUST display the current DORA performance classification with an explanation of the criteria
- **FR-015**: System MUST handle repositories with no deployment data gracefully by displaying an appropriate message

### Key Entities

- **Deployment Event**: Represents a single deployment to production, including timestamp, source (release/deployment/tag), name/version, and environment. Multiple sources may represent the same logical deployment.
- **Deployment Frequency Metric**: Aggregated deployment count for a specific time period (week or month), including the time period identifier, deployment count, and period type.
- **DORA Performance Level**: Classification of deployment frequency (Elite/High/Medium/Low) based on industry benchmarks, including the level name, deployment frequency range, and descriptive criteria.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can view their team's deployment frequency within 2 seconds of navigating to the Deployment Frequency tab
- **SC-002**: System accurately aggregates and displays deployment frequency for repositories with up to 500 deployment events without performance degradation
- **SC-003**: Users can identify their DORA performance level (Elite/High/Medium/Low) at a glance without reading documentation
- **SC-004**: Deployment frequency calculations match manual counting of releases/deployments within 5% accuracy
- **SC-005**: Users can understand deployment trends over time by viewing the weekly and monthly visualizations without additional explanation
- **SC-006**: System handles repositories with no deployment data by displaying clear guidance on how to start tracking deployments
