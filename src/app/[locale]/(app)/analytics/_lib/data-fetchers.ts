import { cache } from "react";
import { createAnalyticsDataService } from "@/application/services/analytics";
import type { DateRange } from "@/domain/value-objects/DateRange";

/**
 * Cached Data Fetchers for Analytics Page
 *
 * Purpose: Prevent duplicate API calls during Server Component rendering
 *
 * How it works:
 * - React's cache() memoizes function results based on arguments
 * - Multiple widgets requesting the same data will share the cached result
 * - Cache is cleared after each request (per-request caching)
 *
 * Architecture:
 * - Thin adapters to application service layer (AnalyticsDataService)
 * - Route-specific utilities (used only within analytics route)
 * - Maintains clean architecture (no imports from other routes)
 *
 * Benefits:
 * - Reduces GitHub API calls
 * - Faster page load (data fetched only once)
 * - Lower rate limit consumption
 *
 * Example:
 * - HeroMetrics calls getCachedCommits("owner/repo", dateRange)
 * - Multiple widgets call getCachedPRs("owner/repo", dateRange)
 * - Only ONE actual API call is made per unique function+args, result is shared
 */

/**
 * Cached PR fetcher
 * Used by: HeroMetrics, PRTrendsWidget
 */
export const getCachedPRs = cache(
  async (repositoryId: string, dateRange: DateRange) => {
    const service = createAnalyticsDataService();
    return await service.getPRs(repositoryId, dateRange);
  },
);

/**
 * Cached Deployment fetcher
 * Used by: HeroMetrics, DORAMetricsWidget, DeploymentFrequencyWidget
 */
export const getCachedDeployments = cache(
  async (repositoryId: string, dateRange: DateRange) => {
    const service = createAnalyticsDataService();
    return await service.getDeployments(repositoryId, dateRange);
  },
);

/**
 * Cached Commit fetcher
 * Used by: HeroMetrics
 *
 * IMPORTANT: This function is called by multiple components
 * Without cache(), this would result in duplicate API calls
 */
export const getCachedCommits = cache(
  async (repositoryId: string, dateRange: DateRange) => {
    const service = createAnalyticsDataService();
    return await service.getCommits(repositoryId, dateRange);
  },
);
