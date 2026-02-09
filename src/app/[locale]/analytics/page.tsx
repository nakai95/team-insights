import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { DateRange } from "@/domain/value-objects/DateRange";
import { AppLayout, AppFooter } from "@/presentation/components/layout";
import { HeroMetrics } from "@/presentation/components/analytics/HeroMetrics";
import { HeroMetricsSkeleton } from "@/presentation/components/analytics/skeletons/HeroMetricsSkeleton";
import { OverviewTab } from "@/presentation/components/analytics/tabs/OverviewTab";
import { TeamTab } from "@/presentation/components/analytics/tabs/TeamTab";

/**
 * Analytics Page
 *
 * Purpose: Google Analytics-style dashboard with progressive widget loading
 *
 * Architecture:
 * - Server Component with async data fetching per widget
 * - Each widget wrapped in individual Suspense boundary
 * - Independent loading states via skeletons
 * - Failed widgets don't break the page
 * - No client-side serialization needed (pure Server Components)
 * - Hero metrics always visible, content switched by sidebar navigation
 *
 * URL Parameters:
 * - repo: Repository URL (required)
 * - start: Start date ISO string (optional)
 * - end: End date ISO string (optional)
 * - range: Preset range like "7d", "30d", "90d" (optional)
 * - tab: Section to display - "overview" (default) or "team"
 *
 * Navigation:
 * - Sidebar controls tab switching (no in-page tabs)
 * - Hero metrics shown only on Overview tab
 * - Overview: Main analytics widgets and charts with hero metrics
 * - Team: Detailed contributor analysis without hero metrics
 *
 * Example URLs:
 * - /analytics?repo=facebook/react&range=30d (defaults to overview)
 * - /analytics?repo=facebook/react&range=30d&tab=overview
 * - /analytics?repo=facebook/react&range=30d&tab=team
 */

interface AnalyticsPageProps {
  searchParams: Promise<{
    repo?: string;
    start?: string;
    end?: string;
    range?: string;
    tab?: string;
  }>;
}

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const t = await getTranslations("analytics");
  const params = await searchParams;

  // Check if repository URL is provided
  if (!params.repo) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">{t("emptyState.title")}</h1>
          <p className="text-muted-foreground">{t("emptyState.description")}</p>
          <p className="text-sm text-muted-foreground">
            {t("emptyState.placeholder")}
          </p>
        </div>
      </div>
    );
  }

  // Parse date range from URL parameters
  const dateRange = parseDateRangeFromParams(params);

  // Parse repository URL to extract owner and repo
  const { owner, repo } = parseRepositoryUrl(params.repo);
  const repositoryId = `${owner}/${repo}`;

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Metrics - Only on Overview Tab */}
        {params.tab !== "team" && (
          <Suspense fallback={<HeroMetricsSkeleton />}>
            <HeroMetrics repositoryId={repositoryId} dateRange={dateRange} />
          </Suspense>
        )}

        {/* Content - Switched by sidebar navigation */}
        {params.tab === "team" ? (
          <Suspense fallback={<div className="text-center py-12">Loading team data...</div>}>
            <TeamTab repositoryId={repositoryId} dateRange={dateRange} />
          </Suspense>
        ) : (
          <OverviewTab repositoryId={repositoryId} dateRange={dateRange} />
        )}
        </div>
      </div>
      <AppFooter />
    </AppLayout>
  );
}

/**
 * Parse date range from URL parameters
 * Supports both explicit start/end dates and preset ranges
 */
function parseDateRangeFromParams(params: {
  start?: string;
  end?: string;
  range?: string;
}): DateRange {
  const end = new Date();

  // If explicit dates provided
  if (params.start && params.end) {
    const start = new Date(params.start);
    const endDate = new Date(params.end);
    const result = DateRange.create(start, endDate);
    if (result.ok) {
      return result.value;
    }
  }

  // If preset range provided
  if (params.range) {
    const days = parseInt(params.range.replace("d", ""));
    if (!isNaN(days)) {
      const start = new Date();
      start.setDate(start.getDate() - days);
      const result = DateRange.create(start, end);
      if (result.ok) {
        return result.value;
      }
    }
  }

  // Default to 30 days
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const result = DateRange.create(start, end);
  if (result.ok) {
    return result.value;
  }

  // Fallback (should never reach here)
  throw new Error("Failed to create date range");
}

/**
 * Parse repository URL to extract owner and repo
 *
 * Supports formats:
 * - https://github.com/owner/repo
 * - github.com/owner/repo
 * - owner/repo
 */
function parseRepositoryUrl(url: string): { owner: string; repo: string } {
  // Remove protocol and domain if present
  const cleanUrl = url
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "");

  // Extract owner and repo
  const parts = cleanUrl.split("/");
  if (parts.length < 2) {
    throw new Error(`Invalid repository URL: ${url}`);
  }

  return {
    owner: parts[0]!,
    repo: parts[1]!.replace(/\.git$/, ""), // Remove .git suffix if present
  };
}
