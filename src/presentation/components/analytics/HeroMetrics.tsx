import { getTranslations } from "next-intl/server";
import { HeroMetricCard } from "./HeroMetricCard";
import { TrendIndicator } from "@/domain/value-objects/TrendIndicator";
import { DateRange } from "@/domain/value-objects/DateRange";
import { Rocket, GitPullRequest, Activity, Users } from "lucide-react";
import {
  getCachedPRs,
  getCachedCommits,
  getCachedDeployments,
} from "@/app/[locale]/analytics/data-fetchers";

/**
 * HeroMetrics Component
 *
 * Purpose: Display 4 key metrics prominently at top of analytics page
 *
 * Metrics:
 * 1. Deployment Frequency (DORA metric)
 * 2. PR Throughput (merged PRs with merge rate)
 * 3. Team Velocity (commits + PRs per week)
 * 4. Active Contributors
 *
 * Features:
 * - Async Server Component
 * - Calculates trends vs previous equal period
 * - Color-coded trend indicators
 * - Responsive grid layout
 *
 * Usage:
 * ```tsx
 * <Suspense fallback={<HeroMetricsSkeleton />}>
 *   <HeroMetrics repositoryId="owner/repo" dateRange={dateRange} />
 * </Suspense>
 * ```
 */

interface HeroMetricsProps {
  repositoryId: string;
  dateRange: DateRange;
}

export async function HeroMetrics({
  repositoryId,
  dateRange,
}: HeroMetricsProps) {
  const t = await getTranslations("analytics.heroMetrics");

  try {
    // Calculate previous period (same duration, shifted back)
    const durationMs = dateRange.end.getTime() - dateRange.start.getTime();
    const previousStart = new Date(dateRange.start.getTime() - durationMs);
    const previousEnd = new Date(dateRange.start.getTime());
    const previousPeriodResult = DateRange.create(previousStart, previousEnd);

    if (!previousPeriodResult.ok) {
      throw new Error("Failed to create previous period range");
    }
    const previousPeriod = previousPeriodResult.value;

    // Fetch data for both current and previous periods
    const [
      currentPrsResult,
      currentCommitsResult,
      currentDeploymentsResult,
      previousPrsResult,
      previousCommitsResult,
      previousDeploymentsResult,
    ] = await Promise.all([
      getCachedPRs(repositoryId, dateRange),
      getCachedCommits(repositoryId, dateRange),
      getCachedDeployments(repositoryId, dateRange),
      getCachedPRs(repositoryId, previousPeriod),
      getCachedCommits(repositoryId, previousPeriod),
      getCachedDeployments(repositoryId, previousPeriod),
    ]);

    // Handle errors
    if (
      !currentPrsResult.ok ||
      !currentCommitsResult.ok ||
      !currentDeploymentsResult.ok
    ) {
      // Return empty state or error - for now, show zeros
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <HeroMetricCard
            title={t("deployments.title")}
            value="—"
            subtitle={t("deployments.subtitle")}
            icon={Rocket}
            accentColor="primary"
          />
          <HeroMetricCard
            title={t("prThroughput.title")}
            value="—"
            subtitle={t("prThroughput.subtitle")}
            icon={GitPullRequest}
            accentColor="success"
          />
          <HeroMetricCard
            title={t("teamVelocity.title")}
            value="—"
            subtitle={t("teamVelocity.subtitle")}
            icon={Activity}
            accentColor="info"
          />
          <HeroMetricCard
            title={t("contributors.title")}
            value="—"
            subtitle={t("contributors.subtitle")}
            icon={Users}
            accentColor="warning"
          />
        </div>
      );
    }

    const currentPrs = currentPrsResult.value;
    const currentCommits = currentCommitsResult.value;
    const currentDeployments = currentDeploymentsResult.value;

    // Calculate current period metrics
    const totalDeployments = currentDeployments.length;
    const mergedPRs = currentPrs.filter((pr) => pr.state === "merged").length;
    const mergeRate =
      currentPrs.length > 0
        ? Math.round((mergedPRs / currentPrs.length) * 100)
        : 0;
    const totalActivity = currentCommits.length + currentPrs.length;
    const uniqueContributors = new Set([
      ...currentPrs.map((pr) => pr.author),
      ...currentCommits.map((c) => c.author),
    ]).size;

    // Calculate per week rates
    const durationDays = Math.max(
      1,
      Math.ceil(
        (dateRange.end.getTime() - dateRange.start.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    const weeks = Math.max(1, durationDays / 7);
    const deploymentsPerWeek = Math.round((totalDeployments / weeks) * 10) / 10;
    const activityPerWeek = Math.round((totalActivity / weeks) * 10) / 10;

    // Calculate previous period metrics (if data available)
    let deploymentTrend = undefined;
    let prThroughputTrend = undefined;
    let velocityTrend = undefined;
    let contributorsTrend = undefined;

    if (
      previousPrsResult.ok &&
      previousCommitsResult.ok &&
      previousDeploymentsResult.ok
    ) {
      const previousPrs = previousPrsResult.value;
      const previousCommits = previousCommitsResult.value;
      const previousDeployments = previousDeploymentsResult.value;

      // Previous period calculations
      const prevMergedPRs = previousPrs.filter(
        (pr) => pr.state === "merged",
      ).length;
      const prevActivity = previousCommits.length + previousPrs.length;
      const prevContributors = new Set([
        ...previousPrs.map((pr) => pr.author),
        ...previousCommits.map((c) => c.author),
      ]).size;
      const prevDeploymentsPerWeek =
        Math.round((previousDeployments.length / weeks) * 10) / 10;
      const prevActivityPerWeek = Math.round((prevActivity / weeks) * 10) / 10;

      // Create trends
      const deploymentTrendResult = TrendIndicator.fromValues(
        deploymentsPerWeek,
        prevDeploymentsPerWeek,
        t("trend.comparison"),
      );
      if (deploymentTrendResult.ok) {
        deploymentTrend = deploymentTrendResult.value;
      }

      const prTrendResult = TrendIndicator.fromValues(
        mergedPRs,
        prevMergedPRs,
        t("trend.comparison"),
      );
      if (prTrendResult.ok) {
        prThroughputTrend = prTrendResult.value;
      }

      const velocityTrendResult = TrendIndicator.fromValues(
        activityPerWeek,
        prevActivityPerWeek,
        t("trend.comparison"),
      );
      if (velocityTrendResult.ok) {
        velocityTrend = velocityTrendResult.value;
      }

      const contributorsTrendResult = TrendIndicator.fromValues(
        uniqueContributors,
        prevContributors,
        t("trend.comparison"),
      );
      if (contributorsTrendResult.ok) {
        contributorsTrend = contributorsTrendResult.value;
      }
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Deployment Frequency */}
        <HeroMetricCard
          title={t("deployments.title")}
          value={`${deploymentsPerWeek}/week`}
          subtitle={`${totalDeployments} ${t("deployments.total")}`}
          trend={deploymentTrend}
          icon={Rocket}
          accentColor="primary"
        />

        {/* PR Throughput */}
        <HeroMetricCard
          title={t("prThroughput.title")}
          value={mergedPRs}
          subtitle={`${mergeRate}% ${t("prThroughput.mergeRate")}`}
          trend={prThroughputTrend}
          icon={GitPullRequest}
          accentColor="success"
        />

        {/* Team Velocity */}
        <HeroMetricCard
          title={t("teamVelocity.title")}
          value={`${activityPerWeek}/week`}
          subtitle={`${totalActivity} ${t("teamVelocity.total")}`}
          trend={velocityTrend}
          icon={Activity}
          accentColor="info"
        />

        {/* Active Contributors */}
        <HeroMetricCard
          title={t("contributors.title")}
          value={uniqueContributors}
          subtitle={t("contributors.subtitle")}
          trend={contributorsTrend}
          icon={Users}
          accentColor="warning"
        />
      </div>
    );
  } catch (error) {
    console.error("Error loading hero metrics:", error);

    // Return empty state on error
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroMetricCard
          title={t("deployments.title")}
          value="—"
          subtitle={t("deployments.subtitle")}
          icon={Rocket}
          accentColor="primary"
        />
        <HeroMetricCard
          title={t("prThroughput.title")}
          value="—"
          subtitle={t("prThroughput.subtitle")}
          icon={GitPullRequest}
          accentColor="success"
        />
        <HeroMetricCard
          title={t("teamVelocity.title")}
          value="—"
          subtitle={t("teamVelocity.subtitle")}
          icon={Activity}
          accentColor="info"
        />
        <HeroMetricCard
          title={t("contributors.title")}
          value="—"
          subtitle={t("contributors.subtitle")}
          icon={Users}
          accentColor="warning"
        />
      </div>
    );
  }
}
