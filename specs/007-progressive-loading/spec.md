# Feature Specification: Analytics Dashboard with Widget-based Progressive Loading

**Feature Branch**: `007-progressive-loading`
**Created**: 2026-02-06
**Updated**: 2026-02-08
**Status**: Implemented
**Route**: `/analytics`

**Original Input**: "Team Insightsのデータ取得を段階的ロードに変更したい。

- 初回は直近30日を高速表示
- バックグラウンドで過去データ取得
- ユーザーが期間変更可能
- クライアントサイドキャッシング（IndexedDB）
- GitHub GraphQLのページネーション活用
  目標：初回表示5秒以内、インタラクティブなUX実現"

**Implemented Solution**: Google Analytics風のウィジェットベースダッシュボード with Server Component streaming

## Implementation Philosophy

The implemented solution takes a **radically simpler approach** than the original specification:

### Original Plan (Not Implemented)

- Complex IndexedDB caching with stale-while-revalidate
- Client Component hooks (useTransition, useBackgroundLoader)
- Background historical data loading
- Global state management
- Multi-phase data loading coordination

### Actual Implementation (Simpler & Better)

- **Pure Server Components** - No client-side state management needed
- **Suspense-based streaming** - React 18's native progressive rendering
- **Widget independence** - Each metric loads separately without coordination
- **Request-scoped caching** - React 19 `cache()` prevents duplicate API calls within same request
- **No persistent caching** - Always fresh data on page reload (simpler, no stale data issues)
- **Graceful degradation** - Failed widgets don't break the page

**Rationale**: The original specification over-engineered the solution. Real-world Google Analytics demonstrates that independent widget streaming with Suspense provides excellent UX without complex caching or background loading coordination.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Independent Widget Progressive Loading (Priority: P1) 🎯 IMPLEMENTED

As a developer using Team Insights, I want to see individual metrics load independently as soon as their data is ready, so that I can start viewing available metrics immediately without waiting for all data to load.

**Why this priority**: This is the core UX improvement. Users see instant skeleton feedback, then metrics populate progressively as API calls complete. No blocking, no complex coordination needed.

**Independent Test**: Navigate to `/analytics?repo=owner/repo&range=30d` and verify that:

1. Skeleton cards appear immediately (<100ms)
2. Individual metric widgets populate as data arrives (staggered, 1-5 seconds each)
3. Failed widgets show error state without breaking other widgets
4. Page remains interactive throughout loading

**Acceptance Scenarios**:

1. **Given** a user navigates to `/analytics?repo=facebook/react&range=30d`, **When** the page loads, **Then** they see 4 skeleton metric cards immediately, followed by each widget populating independently as data arrives
2. **Given** a widget is loading, **When** the user views the page, **Then** they see a skeleton placeholder via React Suspense fallback
3. **Given** a widget API call fails, **When** the error occurs, **Then** that widget displays MetricCardError with error message, while other widgets continue loading normally
4. **Given** all widgets have loaded successfully, **When** displayed, **Then** the user sees PR count, deployment count, commit count, and contributor count for the selected date range

---

### User Story 2 - Date Range Selection (Priority: P2) 🎯 IMPLEMENTED

As a developer analyzing trends, I want to select different date ranges (7 days, 30 days, 90 days, custom), so that I can analyze metrics for specific time periods relevant to my team's reporting cycles.

**Why this priority**: Flexibility for different analysis needs. Builds on US1 by adding temporal control.

**Independent Test**: Click date range selector in AnalyticsHeader, choose different presets, verify URL updates and widgets reload with new date range.

**Acceptance Scenarios**:

1. **Given** a user views `/analytics?repo=owner/repo&range=30d`, **When** they change the range to `7d`, **Then** the URL updates and all widgets reload with 7-day data
2. **Given** a user selects "Custom range", **When** they choose start and end dates, **Then** the URL updates with `start` and `end` parameters and widgets reload accordingly
3. **Given** an invalid date range is provided in URL, **When** the page loads, **Then** it defaults to 30 days gracefully

---

### Edge Cases

- What happens when GitHub API rate limit is exhausted during widget loading?
  - **Answer**: Individual widgets show MetricCardError, other widgets continue loading
- How does the system handle very large repositories with 1000+ PRs in the date range?
  - **Answer**: GitHub API pagination handles large datasets, widgets may take longer to load but page remains responsive
- What happens when a user provides an invalid repository URL?
  - **Answer**: Empty state with helpful message: "Repository URL required. Example: /analytics?repo=owner/repo&range=30d"
- How does the system handle network interruptions during widget loading?
  - **Answer**: Affected widgets show MetricCardError, user can refresh to retry
- What happens when repository access is revoked mid-session?
  - **Answer**: Widgets show authentication error via MetricCardError

## Requirements _(mandatory)_

### Functional Requirements

#### Widget Architecture

- **FR-001**: System MUST implement each metric (PRs, Deployments, Commits, Contributors) as an independent async Server Component widget
- **FR-002**: System MUST wrap each widget in individual Suspense boundary with MetricCardSkeleton fallback
- **FR-003**: System MUST display widgets in 4-column grid layout (responsive: 1 col mobile, 2 cols tablet, 4 cols desktop)
- **FR-004**: System MUST allow widgets to load independently without blocking each other

#### Data Fetching

- **FR-005**: System MUST fetch data directly from GitHub GraphQL API using GitHubGraphQLAdapter for each widget
- **FR-006**: System MUST filter data by date range (DateRange value object) passed as prop to each widget
- **FR-007**: System MUST handle API errors gracefully using MetricCardError component without breaking page layout

#### Date Range Handling

- **FR-008**: System MUST parse date range from URL query parameters (`range=7d|30d|90d` or `start=YYYY-MM-DD&end=YYYY-MM-DD`)
- **FR-009**: System MUST default to 30 days when no date range specified
- **FR-010**: System MUST validate date ranges and fall back to default on invalid input

#### Loading States

- **FR-011**: System MUST display MetricCardSkeleton immediately via Suspense fallback during widget loading
- **FR-012**: System MUST maintain consistent card dimensions between skeleton, loaded, and error states

#### Error Handling

- **FR-013**: System MUST display MetricCardError for widgets that fail to load, showing error message and maintaining layout
- **FR-014**: System MUST allow other widgets to continue loading when one widget fails
- **FR-015**: System MUST display empty state with helpful message when no repository URL provided

#### UI/UX

- **FR-016**: System MUST use Google Analytics-inspired card-based layout with icons (GitPullRequest, Rocket, GitCommit, Users from lucide-react)
- **FR-017**: System MUST display primary metric value prominently (2xl font) with supporting detail below (xs font)
- **FR-018**: System MUST support dark mode via next-themes integration

### Key Components (Implemented)

#### Server Components

- **AnalyticsPage** (`/app/[locale]/analytics/page.tsx`): Main page with URL param parsing and widget layout
- **AnalyticsHeader**: Static header showing repository and date range
- **AnalyticsControls**: Date range selector and repository input (Client Component)
- **data-fetchers.ts**: React 19 `cache()` wrappers ⭐
  - `getCachedPRs()` - Used by PRCountWidget
  - `getCachedDeployments()` - Used by DeploymentCountWidget
  - `getCachedCommits()` - Shared by CommitCountWidget + ContributorCountWidget (prevents duplicate API calls)
- **PRCountWidget**: Displays total PRs and merge rate
- **DeploymentCountWidget**: Displays total deployments
- **CommitCountWidget**: Displays total commits and active days
- **ContributorCountWidget**: Displays unique contributor count

#### UI Components

- **MetricCardSkeleton**: Skeleton placeholder for loading widgets
- **MetricCardError**: Error state display for failed widgets
- **SkeletonChart**: Placeholder for future chart components

#### Domain/Value Objects

- **DateRange**: Date range validation and factory methods (last7Days, last30Days, etc.)

#### Infrastructure

- **GitHubGraphQLAdapter**: Extended with DateRange filtering for fetchPRs, fetchDeployments, fetchCommits

### Architecture Simplifications (vs Original Spec)

**Removed Complexity (Not Needed)**:

- ❌ IndexedDB caching layer (CachedDataEntry, ICacheRepository, IndexedDBAdapter)
- ❌ Client Component hooks (useTransition, useBackgroundLoader, useCache)
- ❌ Background historical data loading coordination
- ❌ Stale-while-revalidate cache strategy
- ❌ LRU cache eviction
- ❌ In-memory cache fallback
- ❌ Global state management (Zustand removed from plan)
- ❌ Complex loading state coordination (LoadingState entity)

**What We DID Implement (Smart Optimizations)**:

- ✅ React 19 `cache()` for request-scoped memoization (prevents duplicate API calls)
- ✅ Shared data fetchers: CommitCountWidget + ContributorCountWidget both use `getCachedCommits()`
- ✅ Zero complexity: Native React feature, no custom caching logic

**Why Simpler is Better**:

- React Server Components + Suspense handle progressive rendering natively
- React 19 `cache()` eliminates duplicate API calls within requests (e.g., commits fetched once, shared by 2 widgets)
- No client-side serialization complexity
- Always fresh data on page reload (cache cleared between requests)
- Fewer moving parts = fewer bugs
- Easier to understand and maintain

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Skeleton UI displays within 100ms of navigation to `/analytics`
- **SC-002**: Individual widgets populate within 1-5 seconds as data arrives (varies by API response time)
- **SC-003**: Page remains interactive throughout loading (no blocking, thanks to Suspense streaming)
- **SC-004**: Failed widgets display error state without breaking page layout or blocking other widgets
- **SC-005**: Date range changes trigger full page refresh with new data (acceptable tradeoff for simplicity)
- **SC-006**: Zero client-side state management needed (pure Server Components)
- **SC-007**: Empty state displays helpful message when repository URL missing
- **SC-008**: Responsive layout works on mobile (1 col), tablet (2 cols), desktop (4 cols)

### User Experience Validation

- ✅ Users see instant skeleton feedback (perceived performance)
- ✅ Users can view metrics as they become available (progressive enhancement)
- ✅ Users are not blocked by slow API calls (Suspense streaming)
- ✅ Users get clear error messages when widgets fail (graceful degradation)
- ✅ Users can change date ranges easily via URL parameters (shareable links)

## Implementation Notes

### Technology Stack

- **Next.js 15 App Router** with React Server Components
- **Suspense** for progressive streaming
- **shadcn/ui** for Card, Skeleton components
- **lucide-react** for icons
- **next-intl** for internationalization
- **GitHubGraphQLAdapter** for GitHub API integration

### URL Parameters

```
/analytics?repo=owner/repo&range=30d
/analytics?repo=owner/repo&start=2024-01-01&end=2024-02-01
```

### File Structure

```
src/
├── app/[locale]/analytics/
│   ├── page.tsx                    # Main analytics page (Server Component)
│   ├── AnalyticsHeader.tsx         # Static header (Server Component)
│   ├── AnalyticsControls.tsx       # Date range selector (Client Component)
│   └── data-fetchers.ts            # React 19 cache() wrappers ⭐
├── presentation/components/analytics/
│   ├── widgets/
│   │   ├── PRCountWidget.tsx       # PR metrics widget (Server Component)
│   │   ├── DeploymentCountWidget.tsx
│   │   ├── CommitCountWidget.tsx
│   │   └── ContributorCountWidget.tsx
│   ├── skeletons/
│   │   └── MetricCardSkeleton.tsx  # Loading placeholder
│   └── shared/
│       └── MetricCardError.tsx     # Error state display
```

### Design Decisions

1. **Server Components Only**: No client-side JavaScript for widgets = faster initial load, simpler architecture
2. **Request-Scoped Caching (React 19)**: Use `cache()` to prevent duplicate API calls within request, always fresh on reload = optimal performance without complexity
3. **Suspense Streaming**: Native React progressive rendering = no custom loading coordination needed
4. **Independent Widgets**: Each widget owns its data fetching = no shared state, easier debugging
5. **URL-based Date Range**: Shareable links, no global state = better UX, simpler state management

### Future Enhancements (Out of Scope)

- Chart widgets below metric cards (SkeletonChart placeholders exist)
- Comparison views (current period vs previous period)
- Export functionality (CSV, PDF)
- Real-time updates (WebSocket or polling)
- Client-side caching (if performance becomes an issue with frequent refreshes)

## Summary

This implementation demonstrates that **simpler is often better**. By leveraging React Server Components and Suspense, we achieved excellent progressive loading UX without the complexity of IndexedDB caching, background loading coordination, or client-side state management.

**Key Insight**: The original specification over-engineered the solution. Real-world Google Analytics proves that independent widget streaming provides great UX without complex caching strategies.
