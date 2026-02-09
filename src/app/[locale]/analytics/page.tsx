import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { DateRange } from "@/domain/value-objects/DateRange";
import { AppLayout } from "@/presentation/components/layout";
import { HeroMetrics } from "@/presentation/components/analytics/HeroMetrics";
import { HeroMetricsSkeleton } from "@/presentation/components/analytics/skeletons/HeroMetricsSkeleton";
import { MetricCardSkeleton } from "@/presentation/components/analytics/skeletons/MetricCardSkeleton";
import { SkeletonChart } from "@/presentation/components/shared/SkeletonChart";
import { PRCountWidget } from "@/presentation/components/analytics/widgets/PRCountWidget";
import { DeploymentCountWidget } from "@/presentation/components/analytics/widgets/DeploymentCountWidget";
import { CommitCountWidget } from "@/presentation/components/analytics/widgets/CommitCountWidget";
import { ContributorCountWidget } from "@/presentation/components/analytics/widgets/ContributorCountWidget";
import { PRTrendsWidget } from "@/presentation/components/analytics/widgets/PRTrendsWidget";
import { ThroughputWidget } from "@/presentation/components/analytics/widgets/ThroughputWidget";
import { TopContributorsWidget } from "@/presentation/components/analytics/widgets/TopContributorsWidget";
import { DORAMetricsWidget } from "@/presentation/components/analytics/widgets/DORAMetricsWidget";
import { DeploymentFrequencyWidget } from "@/presentation/components/analytics/widgets/DeploymentFrequencyWidget";

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
 *
 * URL Parameters:
 * - repo: Repository URL (required)
 * - start: Start date ISO string (optional)
 * - end: End date ISO string (optional)
 * - range: Preset range like "7d", "30d", "90d" (optional)
 *
 * Example URLs:
 * - /analytics?repo=facebook/react&range=30d
 * - /analytics?repo=vercel/next.js&start=2024-01-01&end=2024-02-01
 */

interface AnalyticsPageProps {
  searchParams: Promise<{
    repo?: string;
    start?: string;
    end?: string;
    range?: string;
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
        {/* Hero Metrics */}
        <Suspense fallback={<HeroMetricsSkeleton />}>
          <HeroMetrics repositoryId={repositoryId} dateRange={dateRange} />
        </Suspense>

        {/* Row 1: Overview Metrics (4 cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Suspense fallback={<MetricCardSkeleton />}>
            <PRCountWidget repositoryId={repositoryId} dateRange={dateRange} />
          </Suspense>

          <Suspense fallback={<MetricCardSkeleton />}>
            <DeploymentCountWidget
              repositoryId={repositoryId}
              dateRange={dateRange}
            />
          </Suspense>

          <Suspense fallback={<MetricCardSkeleton />}>
            <CommitCountWidget
              repositoryId={repositoryId}
              dateRange={dateRange}
            />
          </Suspense>

          <Suspense fallback={<MetricCardSkeleton />}>
            <ContributorCountWidget
              repositoryId={repositoryId}
              dateRange={dateRange}
            />
          </Suspense>
        </div>

        {/* Row 2: Main Analytics (2 columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            <Suspense fallback={<SkeletonChart height="h-96" />}>
              <PRTrendsWidget
                repositoryId={repositoryId}
                dateRange={dateRange}
              />
            </Suspense>

            <Suspense fallback={<SkeletonChart height="h-80" />}>
              <ThroughputWidget
                repositoryId={repositoryId}
                dateRange={dateRange}
              />
            </Suspense>
          </div>

          {/* Right column - 1/3 width */}
          <div className="space-y-6">
            <Suspense fallback={<SkeletonChart height="h-64" />}>
              <TopContributorsWidget
                repositoryId={repositoryId}
                dateRange={dateRange}
              />
            </Suspense>

            <Suspense fallback={<SkeletonChart height="h-64" />}>
              <DORAMetricsWidget
                repositoryId={repositoryId}
                dateRange={dateRange}
              />
            </Suspense>
          </div>
        </div>

        {/* Row 3: Full Width */}
        <Suspense fallback={<SkeletonChart height="h-96" />}>
          <DeploymentFrequencyWidget
            repositoryId={repositoryId}
            dateRange={dateRange}
          />
        </Suspense>
        </div>
      </div>
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
