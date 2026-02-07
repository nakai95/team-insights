"use client";

import { useState, useCallback, useEffect } from "react";
import { type CacheStatus } from "@/domain/types/CacheStatus";

/**
 * useCache Hook
 *
 * Purpose: Manage cache operations and status tracking for dashboard components
 *
 * Features:
 * - Track cache status for multiple data types
 * - Manual cache invalidation
 * - Automatic revalidation on stale data detection
 * - Cache statistics (optional)
 *
 * Usage:
 * ```tsx
 * const { cacheStatus, invalidateCache, revalidate } = useCache({
 *   repositoryId: 'facebook/react',
 *   dateRange: DateRange.last30Days(),
 *   onRevalidate: async () => {
 *     const result = await loadInitialData.revalidate(repositoryId, dateRange);
 *     if (result.ok) {
 *       setData(result.value);
 *     }
 *   },
 * });
 *
 * // Show stale data banner
 * {cacheStatus.isStale && <StaleDataBanner />}
 *
 * // Manual refresh
 * <RefreshButton onRefresh={invalidateCache} />
 * ```
 */

interface UseCacheOptions {
  /**
   * Repository identifier (format: "owner/repo")
   */
  repositoryId: string;

  /**
   * Initial cache status for each data type
   */
  initialCacheStatus?: {
    prs: CacheStatus;
    deployments: CacheStatus;
    commits: CacheStatus;
  };

  /**
   * Callback to revalidate data when stale is detected
   * Should fetch fresh data and update component state
   */
  onRevalidate?: () => Promise<void>;

  /**
   * Auto-revalidate when stale data is detected (default: true)
   */
  autoRevalidate?: boolean;
}

interface UseCacheReturn {
  /**
   * Current cache status for all data types
   */
  cacheStatus: {
    prs: CacheStatus;
    deployments: CacheStatus;
    commits: CacheStatus;
  };

  /**
   * Whether any data type is stale
   */
  isStale: boolean;

  /**
   * Whether any data type is currently revalidating
   */
  isRevalidating: boolean;

  /**
   * Manually invalidate cache and trigger refresh
   */
  invalidateCache: () => Promise<void>;

  /**
   * Manually trigger revalidation
   */
  revalidate: () => Promise<void>;

  /**
   * Update cache status (useful when receiving new data from Server Component)
   */
  updateCacheStatus: (status: {
    prs: CacheStatus;
    deployments: CacheStatus;
    commits: CacheStatus;
  }) => void;
}

export function useCache({
  initialCacheStatus = {
    prs: "miss" as CacheStatus,
    deployments: "miss" as CacheStatus,
    commits: "miss" as CacheStatus,
  },
  onRevalidate,
  autoRevalidate = true,
}: UseCacheOptions): UseCacheReturn {
  const [cacheStatus, setCacheStatus] = useState(initialCacheStatus);
  const [isRevalidating, setIsRevalidating] = useState(false);

  // Check if any data is stale
  const isStale =
    cacheStatus.prs === "hit_stale" ||
    cacheStatus.deployments === "hit_stale" ||
    cacheStatus.commits === "hit_stale" ||
    cacheStatus.prs === "revalidating" ||
    cacheStatus.deployments === "revalidating" ||
    cacheStatus.commits === "revalidating";

  // Auto-revalidate on mount if stale data detected
  useEffect(() => {
    if (autoRevalidate && isStale && onRevalidate && !isRevalidating) {
      revalidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  /**
   * Revalidate cache data
   */
  const revalidate = useCallback(async () => {
    if (!onRevalidate || isRevalidating) return;

    setIsRevalidating(true);
    try {
      await onRevalidate();
      // Update cache status to fresh after successful revalidation
      setCacheStatus({
        prs: "hit_fresh",
        deployments: "hit_fresh",
        commits: "hit_fresh",
      });
    } catch (error) {
      console.error("Revalidation failed:", error);
    } finally {
      setIsRevalidating(false);
    }
  }, [onRevalidate, isRevalidating]);

  /**
   * Manually invalidate cache and trigger refresh
   */
  const invalidateCache = useCallback(async () => {
    // Mark all data as stale
    setCacheStatus({
      prs: "revalidating",
      deployments: "revalidating",
      commits: "revalidating",
    });

    // Trigger revalidation
    await revalidate();
  }, [revalidate]);

  /**
   * Update cache status from external source
   */
  const updateCacheStatus = useCallback(
    (status: {
      prs: CacheStatus;
      deployments: CacheStatus;
      commits: CacheStatus;
    }) => {
      setCacheStatus(status);
    },
    [],
  );

  return {
    cacheStatus,
    isStale,
    isRevalidating,
    invalidateCache,
    revalidate,
    updateCacheStatus,
  };
}
