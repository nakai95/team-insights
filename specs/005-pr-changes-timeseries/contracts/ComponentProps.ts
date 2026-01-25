/**
 * Component Props Contracts for PR Changes Timeseries Feature
 *
 * This file defines React component prop interfaces for the timeseries UI.
 * These contracts document the data flow from parent to child components.
 *
 * NOTE: This is a documentation-only file (excluded from compilation).
 * Actual implementation lives in src/presentation/components/
 */

import type {
  TimeseriesResult,
  WeeklyAggregateDto,
  ChangeTrendDto,
  OutlierWeekDto,
  TimeseriesSummary,
} from "./TimeseriesTypes";

/**
 * Tab Selection Type
 * Supported tab identifiers for dashboard navigation
 */
export type TabSelection = "overview" | "throughput" | "changes";

/**
 * AnalysisTabs Component Props
 * Top-level tab navigation component that manages shared state
 */
export interface AnalysisTabsProps {
  /** Complete analysis result including all tab data */
  analysisResult: {
    analysis: {
      id: string;
      repositoryUrl: string;
      analyzedAt: string;
      dateRange: {
        start: string;
        end: string;
      };
      status: "completed";
    };
    contributors: unknown[]; // ContributorDto[]
    summary: {
      totalContributors: number;
      totalCommits: number;
      totalPullRequests: number;
      totalReviewComments: number;
      analysisTimeMs: number;
    };
    throughput?: unknown; // ThroughputResult
    timeseries?: TimeseriesResult;
  };

  /** Initial tab selection (defaults to 'overview' if not specified) */
  initialTab?: TabSelection;
}

/**
 * OverviewTab Component Props
 * First tab: summary cards, activity charts, contributor list
 */
export interface OverviewTabProps {
  /** Repository analysis metadata */
  analysis: {
    id: string;
    repositoryUrl: string;
    analyzedAt: string;
    dateRange: {
      start: string;
      end: string;
    };
  };

  /** Contributors list for display */
  contributors: unknown[]; // ContributorDto[]

  /** Summary statistics for cards */
  summary: {
    totalContributors: number;
    totalCommits: number;
    totalPullRequests: number;
    totalReviewComments: number;
    analysisTimeMs: number;
  };
}

/**
 * ThroughputTab Component Props
 * Second tab: PR throughput analysis (wraps existing PRThroughputSection)
 */
export interface ThroughputTabProps {
  /** PR throughput analysis data (optional, null if not available) */
  throughputData: unknown | null; // ThroughputResult | null
}

/**
 * ChangesTimeseriesTab Component Props
 * Third tab: NEW timeseries visualization and insights
 */
export interface ChangesTimeseriesTabProps {
  /** Timeseries analysis data (optional, null if not available) */
  timeseriesData: TimeseriesResult | null;

  /** Repository URL for context display */
  repositoryUrl: string;

  /** Date range for context display */
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * TimeseriesChart Component Props
 * Recharts visualization: stacked areas (additions/deletions) + bars (PR count)
 */
export interface TimeseriesChartProps {
  /** Weekly aggregated data for chart display */
  weeklyData: WeeklyAggregateDto[];

  /** Outlier weeks for visual highlighting */
  outlierWeeks: OutlierWeekDto[];

  /** Chart height in pixels (default: 400) */
  height?: number;

  /** Whether to show 4-week moving average line (default: true) */
  showMovingAverage?: boolean;
}

/**
 * TimeseriesInsights Component Props
 * Insights panel: outliers, trends, summary statistics
 */
export interface TimeseriesInsightsProps {
  /** Trend analysis (null if insufficient data) */
  trend: ChangeTrendDto | null;

  /** Outlier weeks (empty array if none detected) */
  outlierWeeks: OutlierWeekDto[];

  /** Summary statistics */
  summary: TimeseriesSummary;
}

/**
 * EmptyState Component Props
 * Displayed when no merged PRs exist in date range
 */
export interface EmptyStateProps {
  /** Repository URL for display */
  repositoryUrl: string;

  /** Date range that was analyzed */
  dateRange: {
    start: string;
    end: string;
  };

  /** Optional custom message */
  message?: string;
}

/**
 * Custom Tooltip Props
 * Recharts custom tooltip for chart hover interactions
 */
export interface CustomTooltipProps {
  /** Whether tooltip is active (hovered over chart) */
  active?: boolean;

  /** Payload data from Recharts */
  payload?: Array<{
    name: string;
    value: number;
    dataKey: string;
    payload: WeeklyAggregateDto;
  }>;

  /** Label (week start date) */
  label?: string;
}

/**
 * Component Hierarchy
 *
 * DashboardContent (fetches data)
 *   └─ AnalysisTabs (manages tab state + URL sync)
 *       ├─ OverviewTab (summary cards, charts, contributors)
 *       ├─ ThroughputTab (wraps existing PRThroughputSection)
 *       └─ ChangesTimeseriesTab
 *           ├─ TimeseriesChart (Recharts visualization)
 *           ├─ TimeseriesInsights (outliers, trends, summary)
 *           └─ EmptyState (shown if no data)
 */

/**
 * State Management Strategy
 *
 * Shared State (in AnalysisTabs):
 * - analysisResult (complete data for all tabs)
 * - activeTab (synchronized with URL query param)
 *
 * Local State (in each tab):
 * - Chart zoom level (ChangesTimeseriesTab)
 * - Hover state (TimeseriesChart)
 * - Expanded/collapsed insights (TimeseriesInsights)
 *
 * URL Synchronization:
 * - Active tab reflected in ?tab= query parameter
 * - Browser back/forward buttons update active tab
 * - Page refresh preserves tab selection
 * - Direct links to specific tabs work (e.g., /dashboard?tab=changes)
 */

/**
 * Data Flow Example
 *
 * 1. User navigates to /dashboard?tab=changes
 * 2. DashboardContent fetches complete AnalysisResult (includes timeseries)
 * 3. AnalysisTabs receives analysisResult + reads ?tab=changes from URL
 * 4. AnalysisTabs renders ChangesTimeseriesTab with timeseriesData prop
 * 5. ChangesTimeseriesTab conditionally renders:
 *    - EmptyState if timeseriesData.weeklyData.length === 0
 *    - TimeseriesChart + TimeseriesInsights otherwise
 * 6. User clicks 'Overview' tab
 * 7. AnalysisTabs updates URL to ?tab=overview (no data refetch)
 * 8. AnalysisTabs renders OverviewTab with existing data
 */

/**
 * Performance Considerations
 *
 * - All data fetched once in DashboardContent (single GraphQL query)
 * - Tab switching <100ms (no API calls, instant UI update)
 * - Chart rendering optimized with Recharts virtualization
 * - Weekly aggregation happens server-side (not in browser)
 * - Maximum 52 weeks (1 year) displayed to prevent performance issues
 */
