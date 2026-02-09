"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * AnalyticsRedirect Component
 *
 * Purpose: Auto-redirect to last used repository if no repo is selected
 *
 * Features:
 * - Checks localStorage for recently used repositories
 * - Redirects to most recent repository with same date range
 * - Only runs on client-side after mount
 *
 * Usage:
 * ```tsx
 * {!params.repo && <AnalyticsRedirect />}
 * ```
 */

const RECENT_REPOS_KEY = "team-insights:recent-repositories";

interface RecentRepository {
  url: string;
  name: string;
  owner: string;
  lastUsed: string;
}

export function AnalyticsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Get recent repositories from localStorage
    try {
      const stored = localStorage.getItem(RECENT_REPOS_KEY);
      if (!stored) return;

      const recentRepos: RecentRepository[] = JSON.parse(stored);
      if (recentRepos.length === 0) return;

      // Get the most recently used repository
      const mostRecent = recentRepos[0];
      if (!mostRecent) return;

      // Validate URL before redirecting
      const url = mostRecent.url;
      if (!url || typeof url !== "string" || url.trim() === "") {
        console.warn("Invalid repository URL in recent repositories:", url);
        return;
      }

      // Redirect to analytics with the repository
      const redirectUrl = `/analytics?repo=${encodeURIComponent(url)}&range=30d`;
      router.replace(redirectUrl);
    } catch (error) {
      console.error("Failed to auto-redirect to recent repository:", error);
    }
  }, [router]);

  return null;
}
