"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBackgroundLoader } from "@/presentation/hooks/useBackgroundLoader";
import { LoadingIndicator } from "@/presentation/components/shared/LoadingIndicator";
import { DateRange } from "@/domain/value-objects/DateRange";
import { DataType } from "@/domain/types/DataType";
import { GitHubGraphQLAdapter } from "@/infrastructure/github/GitHubGraphQLAdapter";
import { createSessionProvider } from "@/infrastructure/auth/SessionProviderFactory";
import { initializeCache } from "@/infrastructure/storage/initializeCache";
import type { PullRequest } from "@/domain/interfaces/IGitHubRepository";
import type { ICacheRepository } from "@/domain/interfaces/ICacheRepository";

/**
 * Serializable PR data for Client Component
 * (Date objects cannot be passed from Server to Client)
 */
export interface SerializablePullRequest {
  number: number;
  title: string;
  author: string;
  createdAt: string; // ISO string instead of Date
  state: "open" | "closed" | "merged";
  reviewCommentCount: number;
  mergedAt?: string; // ISO string instead of Date
  additions?: number;
  deletions?: number;
  changedFiles?: number;
}

export interface PRAnalysisClientProps {
  /** Initial PR data from Server Component (serialized) */
  initialData: SerializablePullRequest[];
  /** Repository identifier (owner/repo) */
  repositoryId: string;
  /** Date range of initial data (for calculating historical range) */
  dateRange?: { start: string; end: string };
}

/**
 * Deserialize PR data (convert ISO strings back to Date objects)
 */
function deserializePullRequest(pr: SerializablePullRequest): PullRequest {
  return {
    number: pr.number,
    title: pr.title,
    author: pr.author,
    createdAt: new Date(pr.createdAt),
    state: pr.state,
    reviewCommentCount: pr.reviewCommentCount,
    mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : undefined,
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changedFiles,
  };
}

/**
 * PR Analysis Client Component
 *
 * This component receives initial PR data from a Server Component and displays it.
 * Phase 4: Loads historical data in the background using useTransition.
 *
 * Progressive loading strategy:
 * - Phase 3: Display initial data passed from Server Component
 * - Phase 4: Load historical data (31-365 days) in background using useTransition
 *
 * Performance targets:
 * - Initial render: <100ms (data already loaded by Server Component)
 * - Background loading: Non-blocking, doesn't freeze UI
 * - Historical load: <30s for 1 year of data (chunked batches)
 */
export function PRAnalysisClient({
  initialData,
  repositoryId,
  dateRange,
}: PRAnalysisClientProps) {
  const t = useTranslations("progressiveLoading");
  const [cacheRepository, setCacheRepository] =
    useState<ICacheRepository | null>(null);
  const [cacheInitialized, setCacheInitialized] = useState(false);

  // Deserialize initial data
  const deserializedInitialData = useMemo(
    () => initialData.map(deserializePullRequest),
    [initialData],
  );

  // Calculate historical range (31 days ago to 1 year ago)
  const historicalRange = useMemo(() => {
    if (dateRange) {
      // If we have the initial range, calculate historical from before it
      const initialEnd = new Date(dateRange.end);
      const historicalEnd = new Date(initialEnd);
      historicalEnd.setDate(historicalEnd.getDate() - 1); // Day before initial range

      const historicalStart = new Date(initialEnd);
      historicalStart.setDate(historicalStart.getDate() - 365); // 1 year before

      const result = DateRange.create(historicalStart, historicalEnd);
      return result.ok ? result.value : null;
    } else {
      // Fallback: assume initial data is last 30 days, load 31-365 days
      const now = new Date();
      const thirtyOneDaysAgo = new Date(now);
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const oneYearAgo = new Date(now);
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);

      const result = DateRange.create(oneYearAgo, thirtyOneDaysAgo);
      return result.ok ? result.value : null;
    }
  }, [dateRange]);

  // Initialize cache on mount
  useEffect(() => {
    let mounted = true;

    async function initCache() {
      const result = await initializeCache();

      if (mounted) {
        const cache = result.success ? result.adapter : result.fallback;
        setCacheRepository(cache);
        setCacheInitialized(true);

        if (!result.success) {
          console.warn(
            `Cache initialization warning: ${result.reason}, using fallback`,
          );
        }
      }
    }

    initCache();

    return () => {
      mounted = false;
    };
  }, []);

  // Create data loader (client-side session provider)
  const dataLoader = useMemo(() => {
    const sessionProvider = createSessionProvider();
    return new GitHubGraphQLAdapter(sessionProvider);
  }, []);

  // Use background loader hook
  const { data, state } = useBackgroundLoader<PullRequest>({
    repositoryId,
    dataType: DataType.PULL_REQUESTS,
    historicalRange: historicalRange ?? DateRange.last90Days(),
    initialData: deserializedInitialData,
    dataLoader,
    cacheRepository: cacheRepository ?? undefined,
    autoStart: cacheInitialized && historicalRange !== null,
  });

  // Calculate stats from combined data
  const totalPRs = data.length;
  const mergedPRs = data.filter((pr) => pr.state === "merged").length;
  const openPRs = data.filter((pr) => pr.state === "open").length;

  // Sort PRs by creation date (newest first) for display
  const sortedPRs = useMemo(
    () =>
      [...data].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [data],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pull Requests Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Phase 4 Status */}
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-900 dark:text-green-100">
                <strong>✓ {t("phase4.active")}</strong>
              </p>
            </div>

            {/* Loading Indicator */}
            {state.isLoading && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <LoadingIndicator
                  progress={state.progress}
                  showProgress={true}
                />
              </div>
            )}

            {/* Success Indicator */}
            {state.isComplete && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-emerald-900 dark:text-emerald-100">
                  <strong>
                    ✓{" "}
                    {t("phase4.successIndicator.loaded", {
                      total: data.length,
                      dataType: t("phase4.successIndicator.dataType.prs"),
                      initial: initialData.length,
                    })}
                  </strong>
                </p>
              </div>
            )}

            {/* Error Display */}
            {state.error && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-900 dark:text-red-100">
                  <strong>{t("error")}:</strong> {state.error}
                </p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium mb-2">
                  {t("stats.totalPRs")}
                </h3>
                <p className="text-2xl font-bold">{totalPRs}</p>
                {state.isComplete && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("phase4.successIndicator.additional", {
                      count: totalPRs - initialData.length,
                    })}
                  </p>
                )}
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium mb-2">
                  {t("stats.mergedPRs")}
                </h3>
                <p className="text-2xl font-bold">{mergedPRs}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium mb-2">
                  {t("stats.openPRs")}
                </h3>
                <p className="text-2xl font-bold">{openPRs}</p>
              </div>
            </div>

            {/* Repository Info */}
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="text-sm font-medium mb-2">{t("repository")}</h3>
              <p className="text-sm text-muted-foreground">{repositoryId}</p>
            </div>

            {/* Recent PRs */}
            {sortedPRs.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium mb-2">{t("recentPRs")}</h3>
                <ul className="space-y-2">
                  {sortedPRs.slice(0, 5).map((pr) => (
                    <li
                      key={pr.number}
                      className="text-sm p-2 bg-background rounded"
                    >
                      <span className="font-medium">#{pr.number}</span> -{" "}
                      {pr.title}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({pr.state})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
