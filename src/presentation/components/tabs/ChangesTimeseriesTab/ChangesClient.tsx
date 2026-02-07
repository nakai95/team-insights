"use client";

import { useMemo, useState, useEffect } from "react";
import { TimeseriesResult } from "@/application/dto/TimeseriesResult";
import { ChangesTimeseriesTab } from "./ChangesTimeseriesTab";
import { useBackgroundLoader } from "@/presentation/hooks/useBackgroundLoader";
import { LoadingIndicator } from "@/presentation/components/shared/LoadingIndicator";
import { DateRange } from "@/domain/value-objects/DateRange";
import { DataType } from "@/domain/types/DataType";
import { GitHubGraphQLAdapter } from "@/infrastructure/github/GitHubGraphQLAdapter";
import { createSessionProvider } from "@/infrastructure/auth/SessionProviderFactory";
import { initializeCache } from "@/infrastructure/storage/initializeCache";
import type { PullRequest } from "@/domain/interfaces/IGitHubRepository";
import type { ICacheRepository } from "@/domain/interfaces/ICacheRepository";

export interface ChangesClientProps {
  timeseriesData?: TimeseriesResult | null;
  repositoryUrl: string;
  dateRange: { start: string; end: string };
  repositoryId?: string;
  enableProgressiveLoading?: boolean;
}

export function ChangesClient({
  timeseriesData,
  repositoryUrl,
  dateRange,
  repositoryId,
  enableProgressiveLoading = false,
}: ChangesClientProps) {
  const [cacheRepository, setCacheRepository] =
    useState<ICacheRepository | null>(null);
  const [cacheInitialized, setCacheInitialized] = useState(false);

  useEffect(() => {
    if (!enableProgressiveLoading) return;
    let mounted = true;
    async function initCache() {
      const result = await initializeCache();
      if (mounted) {
        setCacheRepository(result.success ? result.adapter : result.fallback);
        setCacheInitialized(true);
      }
    }
    initCache();
    return () => {
      mounted = false;
    };
  }, [enableProgressiveLoading]);

  const historicalRange = useMemo(() => {
    if (!dateRange) return DateRange.last90Days();
    const initialEnd = new Date(dateRange.end);
    const historicalEnd = new Date(initialEnd);
    historicalEnd.setDate(historicalEnd.getDate() - 1);
    const historicalStart = new Date(initialEnd);
    historicalStart.setDate(historicalStart.getDate() - 365);
    const result = DateRange.create(historicalStart, historicalEnd);
    return result.ok ? result.value : DateRange.last90Days();
  }, [dateRange]);

  const dataLoader = useMemo(() => {
    if (!enableProgressiveLoading) return null;
    return new GitHubGraphQLAdapter(createSessionProvider());
  }, [enableProgressiveLoading]);

  const { data: prs, state } = useBackgroundLoader<PullRequest>({
    repositoryId: repositoryId ?? "",
    dataType: DataType.PULL_REQUESTS,
    historicalRange,
    initialData: [],
    dataLoader: dataLoader!,
    cacheRepository: cacheRepository ?? undefined,
    autoStart:
      enableProgressiveLoading &&
      cacheInitialized &&
      !!repositoryId &&
      !!dataLoader,
  });

  if (!enableProgressiveLoading) {
    return (
      <ChangesTimeseriesTab
        timeseriesData={timeseriesData}
        repositoryUrl={repositoryUrl}
        dateRange={dateRange}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Progressive Mode Active Badge */}
      <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
        <p className="text-sm text-green-900 dark:text-green-100">
          <strong>✓ Progressive Loading Active</strong>
        </p>
      </div>

      {/* Loading Indicator */}
      {state.isLoading && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <LoadingIndicator progress={state.progress} showProgress={true} />
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-900 dark:text-red-100">
            <strong>Error:</strong> {state.error}
          </p>
        </div>
      )}

      {/* Success Indicator */}
      {state.isComplete && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <p className="text-sm text-emerald-900 dark:text-emerald-100">
            <strong>✓ Loaded {prs.length} pull requests</strong>
            {prs.length > 0 && (
              <span className="ml-2">
                ({prs.length} historical PRs loaded from cache/API)
              </span>
            )}
          </p>
        </div>
      )}

      <ChangesTimeseriesTab
        timeseriesData={timeseriesData}
        repositoryUrl={repositoryUrl}
        dateRange={dateRange}
      />
    </div>
  );
}
