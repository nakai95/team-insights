"use client";

import { useMemo, useState, useEffect } from "react";
import { ThroughputResult } from "@/application/dto/ThroughputResult";
import { PRThroughputSection } from "./components";
import { useBackgroundLoader } from "@/presentation/hooks/useBackgroundLoader";
import { LoadingIndicator } from "@/presentation/components/shared/LoadingIndicator";
import { DateRange } from "@/domain/value-objects/DateRange";
import { DataType } from "@/domain/types/DataType";
import { GitHubGraphQLAdapter } from "@/infrastructure/github/GitHubGraphQLAdapter";
import { createSessionProvider } from "@/infrastructure/auth/SessionProviderFactory";
import { initializeCache } from "@/infrastructure/storage/initializeCache";
import type { PullRequest } from "@/domain/interfaces/IGitHubRepository";
import type { ICacheRepository } from "@/domain/interfaces/ICacheRepository";

export interface ThroughputClientProps {
  /** Initial PR throughput data from Server Component or existing analysis */
  throughputData?: ThroughputResult | null;
  /** Repository identifier for background loading (format: "owner/repo") */
  repositoryId?: string;
  /** Date range for initial data (used to calculate historical range) */
  dateRange?: { start: string; end: string };
  /** Enable progressive loading (defaults to false) */
  enableProgressiveLoading?: boolean;
}

/**
 * Throughput Client Component with Progressive Loading
 *
 * Two modes:
 * 1. Legacy mode (enableProgressiveLoading=false): Display static throughputData
 * 2. Progressive mode (enableProgressiveLoading=true): Load historical PRs in background
 *
 * Progressive loading strategy:
 * - Display initial throughput data immediately
 * - Fetch historical PRs (31-365 days) in background using useTransition
 * - Recalculate throughput metrics as new data arrives
 * - Show loading indicator without blocking UI
 */
export function ThroughputClient({
  throughputData,
  repositoryId,
  dateRange,
  enableProgressiveLoading = false,
}: ThroughputClientProps) {
  const [cacheRepository, setCacheRepository] =
    useState<ICacheRepository | null>(null);
  const [cacheInitialized, setCacheInitialized] = useState(false);

  // Initialize cache on mount (progressive mode only)
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

  // Extract initial PR data from throughputData
  const initialPRs = useMemo<PullRequest[]>(() => {
    // TODO: Extract PRs from throughputData if available
    // For now, return empty array (will be populated by background loader)
    return [];
  }, [throughputData]);

  // Calculate historical date range (31-365 days ago)
  const historicalRange = useMemo(() => {
    if (!dateRange) return DateRange.last90Days();

    const initialEnd = new Date(dateRange.end);
    const historicalEnd = new Date(initialEnd);
    historicalEnd.setDate(historicalEnd.getDate() - 1); // Day before initial range

    const historicalStart = new Date(initialEnd);
    historicalStart.setDate(historicalStart.getDate() - 365); // 1 year before

    const result = DateRange.create(historicalStart, historicalEnd);
    return result.ok ? result.value : DateRange.last90Days();
  }, [dateRange]);

  // Create data loader (progressive mode only)
  const dataLoader = useMemo(() => {
    if (!enableProgressiveLoading) return null;
    const sessionProvider = createSessionProvider();
    return new GitHubGraphQLAdapter(sessionProvider);
  }, [enableProgressiveLoading]);

  // Use background loader for progressive mode
  const { data: prs, state } = useBackgroundLoader<PullRequest>({
    repositoryId: repositoryId ?? "",
    dataType: DataType.PULL_REQUESTS,
    historicalRange,
    initialData: initialPRs,
    dataLoader: dataLoader!,
    cacheRepository: cacheRepository ?? undefined,
    autoStart:
      enableProgressiveLoading &&
      cacheInitialized &&
      !!repositoryId &&
      !!dataLoader,
  });

  // Legacy mode: render static data
  if (!enableProgressiveLoading) {
    return <PRThroughputSection throughput={throughputData} />;
  }

  // Progressive mode: show loading indicator and dynamic data
  return (
    <div className="space-y-4">
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
            <strong>✓ Loaded {prs.length} PRs</strong>
          </p>
        </div>
      )}

      {/* Throughput Section - will be recalculated with new PRs */}
      <PRThroughputSection throughput={throughputData} />
    </div>
  );
}
