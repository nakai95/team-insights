# Feature Specification: GitHub API GraphQL Migration

**Feature Branch**: `004-github-api-graphql`
**Created**: 2026-01-01
**Status**: Draft
**Input**: User description: "GitHub APIをREST APIからGraphQLに移行したい。

目的：

- 複数リクエストを1回のクエリに統合して速度改善
- PR Throughput機能で必要なデータを効率取得

技術要件：

- Octokitのgraphql()メソッドを使用
- OctokitAdapter.tsの実装変更（インターフェースは維持）
- ページネーション対応
- 既存テストの互換性維持

期待効果：

- PR取得処理を15秒→1秒以下に短縮"

## User Scenarios & Testing

### User Story 1 - Fast PR Data Retrieval (Priority: P1)

As a developer using the PR Throughput Analysis dashboard, I need to see PR data load quickly so that I can analyze team performance without waiting for slow data fetches.

**Why this priority**: This is the core performance improvement that delivers immediate user value. The 15-second wait time currently degrades user experience significantly, and reducing it to under 1 second provides substantial value.

**Independent Test**: Can be fully tested by navigating to the PR Throughput Analysis page, authenticating with GitHub, and measuring the time from request to data display. Delivers immediate value by making the existing feature usable.

**Acceptance Scenarios**:

1. **Given** a repository with 100+ pull requests, **When** a user loads the PR Throughput Analysis page, **Then** the PR data should load and display within 1 second
2. **Given** a user accessing multiple repositories in succession, **When** switching between repositories, **Then** each repository's PR data should load within 1 second
3. **Given** large repositories with 1000+ pull requests, **When** loading PR data, **Then** the system should handle pagination efficiently without blocking the UI

---

### User Story 2 - Comprehensive PR Data in Single Request (Priority: P2)

As a developer analyzing PR metrics, I need all relevant PR information retrieved in a single request so that I can see complete data without delays from multiple sequential API calls.

**Why this priority**: This improves data consistency and reduces API rate limit consumption. While related to performance, it's secondary to the speed improvement itself.

**Independent Test**: Can be tested by monitoring network requests during PR data fetch and verifying that PR details (author, review comments, merge status, timelines) are retrieved in one GraphQL query instead of multiple REST calls.

**Acceptance Scenarios**:

1. **Given** a PR with reviews and comments, **When** loading PR data, **Then** all PR metadata (author, reviewers, comments, merge status, timestamps) should be retrieved in a single API call
2. **Given** multiple PRs in a repository, **When** fetching PR list data, **Then** batch queries should retrieve all PR details in one request
3. **Given** PRs with complex review threads, **When** loading PR data, **Then** nested review comments and conversation threads should be included in the initial query

---

### User Story 3 - Seamless Migration Experience (Priority: P3)

As a user of the existing PR Throughput feature, I need the system to work exactly as before so that the performance improvement doesn't disrupt my workflow or break existing functionality.

**Why this priority**: Ensures backward compatibility and prevents regressions. This is important for maintaining trust and avoiding breaking changes, but can be verified through existing tests.

**Independent Test**: Can be tested by running the existing test suite and verifying all tests pass without modification. Additionally, perform side-by-side comparison of REST vs GraphQL output for identical repositories.

**Acceptance Scenarios**:

1. **Given** existing unit tests for PR data fetching, **When** running the test suite after migration, **Then** all tests should pass without modification
2. **Given** a repository previously analyzed with REST API, **When** analyzing the same repository with GraphQL API, **Then** the displayed metrics and data should be identical
3. **Given** authenticated users with various permission levels, **When** accessing PR data, **Then** GitHub authentication and authorization should work unchanged

---

### User Story 4 - Fast Commit Data Retrieval (Priority: P1)

As a developer using the Dev Activity Dashboard, I need to see commit data load quickly so that I can analyze developer activity without waiting for slow data fetches.

**Why this priority**: Commit fetching also suffers from the same sequential REST API performance issues as PR fetching. Migrating to GraphQL provides consistent performance improvements across all features.

**Independent Test**: Can be tested by navigating to the Dev Activity Dashboard, authenticating with GitHub, and measuring the time from request to commit data display. Monitor network requests to verify GraphQL queries replace multiple REST calls.

**Acceptance Scenarios**:

1. **Given** a repository with 100+ commits, **When** a user loads the Dev Activity Dashboard, **Then** the commit data should load within 1 second
2. **Given** a date range filter (sinceDate/untilDate), **When** fetching commits, **Then** the GraphQL query should apply date filters efficiently without client-side filtering
3. **Given** large repositories with 1000+ commits, **When** loading commit data, **Then** the system should handle pagination efficiently and exclude merge commits

---

### Edge Cases

- What happens when GitHub GraphQL API rate limits are exceeded?
- How does the system handle repositories with no pull requests or commits?
- What happens when a repository has PRs with incomplete or missing data (deleted users, private forks)?
- What happens when commits have null author data (deleted users)?
- How does pagination handle very large repositories (10,000+ PRs or commits)?
- What happens when GitHub API returns partial data or timeouts during a GraphQL query?
- How does the system handle repositories where the user has limited access permissions?
- How does the system handle empty repositories with no default branch?

## Requirements

### Functional Requirements

#### Pull Request Data (PR Throughput Analysis)

- **FR-001**: System MUST fetch all PR data required for Throughput Analysis in a single GraphQL query (or minimum number of queries for pagination)
- **FR-002**: System MUST complete PR data retrieval within 1 second for repositories with up to 100 pull requests
- **FR-003**: System MUST handle pagination for repositories exceeding the GraphQL query result limit (typically 100 items per page)
- **FR-004**: System MUST retrieve all PR fields currently used by the Throughput Analysis feature: PR number, title, author, created date, merged date, review count, comment count, changed files count, additions, deletions, and merge status
- **FR-005**: System MUST support parallel batch processing for review comments (batch size: 15 PRs per batch) to improve performance while respecting rate limits

#### Commit Data (Dev Activity Dashboard)

- **FR-006**: System MUST fetch all commit data required for Dev Activity Dashboard in a single GraphQL query (or minimum number of queries for pagination)
- **FR-007**: System MUST complete commit data retrieval within 1 second for repositories with up to 1000 commits
- **FR-008**: System MUST retrieve all commit fields: hash, author, email, date, message, filesChanged, linesAdded, linesDeleted
- **FR-009**: System MUST exclude merge commits (commits with multiple parents) automatically
- **FR-010**: System MUST support date range filtering (sinceDate/untilDate) via GraphQL query parameters
- **FR-011**: System MUST handle repositories with no default branch gracefully (empty repositories)

#### General Requirements

- **FR-012**: System MUST maintain the existing interface contract so that calling code requires no modifications
- **FR-013**: System MUST pass all existing unit and integration tests without modification
- **FR-014**: System MUST handle GitHub API errors gracefully with the same error handling behavior as the REST implementation
- **FR-015**: System MUST respect GitHub API rate limits and provide appropriate error messages when limits are exceeded
- **FR-016**: System MUST support the same authentication mechanisms as the current REST implementation (OAuth tokens)
- **FR-017**: System MUST handle null author data (deleted users) with "unknown" fallback for both PRs and commits

### Key Entities

- **Pull Request**: Represents a GitHub pull request with metadata including author, timestamps, review activity, code changes, and merge status. Required for calculating throughput metrics.
- **Commit**: Represents a GitHub commit with metadata including hash, author, email, date, message, and code change statistics. Required for calculating developer activity metrics. Excludes merge commits.
- **Review Comment**: Represents a comment on a pull request, including author, body, creation date, and associated PR number. Fetched in parallel batches for performance.
- **Repository**: Represents a GitHub repository containing pull requests and commits. Used to scope queries and manage pagination.
- **GraphQL Query Result**: Represents the response from GitHub GraphQL API, including paginated data and cursor information for fetching additional pages.

## Success Criteria

### Measurable Outcomes

- **SC-001**: PR and commit data retrieval completes in under 1 second for repositories with up to 1000 items (improvement from current 15 seconds for PRs)
- **SC-002**: Number of API requests reduced by at least 90% compared to REST implementation (from 100+ sequential requests to 1-3 GraphQL queries)
- **SC-003**: All existing functionality remains unchanged - 100% of current test suite passes without modification
- **SC-004**: System handles repositories of any size without timeout errors or performance degradation
- **SC-005**: API rate limit consumption reduced by at least 80% for typical repository analysis workflows
- **SC-006**: Commit fetching completes within 1 second for repositories with up to 1000 commits, excluding merge commits automatically
- **SC-007**: Review comments batch processing achieves sub-second retrieval for up to 100 PRs with parallel batches of 15 PRs

## Assumptions

- GitHub GraphQL API provides all necessary PR and commit fields available in REST API
- Octokit library's graphql() method is stable and production-ready
- Current GitHub OAuth authentication tokens are compatible with GraphQL API
- Existing error handling patterns are sufficient for GraphQL-specific errors
- GraphQL pagination using cursor-based approach is suitable for large result sets
- No changes are needed to the domain layer or use case interfaces
- Parallel batch processing (15 PRs per batch) provides optimal balance between performance and rate limit consumption
- Merge commits can be reliably identified by checking parent count (>1)

## Out of Scope

- Changes to the PR Throughput Analysis or Dev Activity Dashboard UI
- Performance optimizations unrelated to API migration (e.g., client-side caching, memoization)
- Caching strategies (should be handled separately if needed)
- Real-time data updates or webhooks
- Changes to authentication or authorization mechanisms
- Migration of other GitHub operations beyond data fetching (e.g., creating PRs, adding comments)

## Dependencies

- Octokit library (GraphQL support is built-in, no additional packages required)
- GitHub GraphQL API availability and stability
- Current GitHub OAuth token permissions must include necessary scopes for GraphQL queries
- Existing test suite must be compatible with mocked GraphQL responses

## Open Questions

None - all requirements are sufficiently specified for planning and implementation.
