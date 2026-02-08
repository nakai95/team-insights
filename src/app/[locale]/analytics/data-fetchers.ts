import { cache } from "react";
import { GitHubGraphQLAdapter } from "@/infrastructure/github/GitHubGraphQLAdapter";
import { createSessionProvider } from "@/infrastructure/auth/SessionProviderFactory";
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
 * Benefits:
 * - Reduces GitHub API calls
 * - Faster page load (data fetched only once)
 * - Lower rate limit consumption
 *
 * Example:
 * - CommitCountWidget calls getCachedCommits("owner/repo", dateRange)
 * - ContributorCountWidget calls getCachedCommits("owner/repo", dateRange)
 * - Only ONE actual API call is made, result is shared
 */

/**
 * Cached PR fetcher
 * Used by: PRCountWidget
 */
export const getCachedPRs = cache(
  async (repositoryId: string, dateRange: DateRange) => {
    const sessionProvider = createSessionProvider();
    const githubAdapter = new GitHubGraphQLAdapter(sessionProvider);
    return await githubAdapter.fetchPRs(repositoryId, dateRange);
  },
);

/**
 * Cached Deployment fetcher
 * Used by: DeploymentCountWidget
 */
export const getCachedDeployments = cache(
  async (repositoryId: string, dateRange: DateRange) => {
    const sessionProvider = createSessionProvider();
    const githubAdapter = new GitHubGraphQLAdapter(sessionProvider);
    return await githubAdapter.fetchDeployments(repositoryId, dateRange);
  },
);

/**
 * Cached Commit fetcher
 * Used by: CommitCountWidget, ContributorCountWidget
 *
 * IMPORTANT: This function is called by multiple widgets
 * Without cache(), this would result in duplicate API calls
 */
export const getCachedCommits = cache(
  async (repositoryId: string, dateRange: DateRange) => {
    const sessionProvider = createSessionProvider();
    const githubAdapter = new GitHubGraphQLAdapter(sessionProvider);
    return await githubAdapter.fetchCommits(repositoryId, dateRange);
  },
);
