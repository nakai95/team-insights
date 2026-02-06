"use client";

import { useState, useEffect, useTransition, useCallback, useRef } from "react";
import {
  LoadHistoricalData,
  type LoadProgress,
} from "@/application/use-cases/LoadHistoricalData";
import { IDataLoader } from "@/domain/interfaces/IDataLoader";
import { ICacheRepository } from "@/domain/interfaces/ICacheRepository";
import { DateRange } from "@/domain/value-objects/DateRange";
import { DataType } from "@/domain/types/DataType";
import { PullRequest } from "@/domain/interfaces/IGitHubRepository";
import { DeploymentEvent } from "@/domain/value-objects/DeploymentEvent";
import { Commit } from "@/domain/interfaces/IDataLoader";
import { logger } from "@/lib/utils/logger";

/**
 * Background loading state
 */
export interface BackgroundLoadingState {
  /** Whether background loading is in progress */
  isLoading: boolean;
  /** Current loading progress */
  progress: LoadProgress | null;
  /** Error message if loading failed */
  error: string | null;
  /** Whether loading was completed successfully */
  isComplete: boolean;
}

/**
 * useBackgroundLoader hook options
 */
export interface UseBackgroundLoaderOptions<T> {
  /** Repository identifier (format: "owner/repo") */
  repositoryId: string;
  /** Type of data to load */
  dataType: DataType;
  /** Historical date range to load (beyond initial data) */
  historicalRange: DateRange;
  /** Initial data from Server Component */
  initialData: T[];
  /** Data loader instance */
  dataLoader: IDataLoader;
  /** Optional cache repository instance */
  cacheRepository?: ICacheRepository;
  /** Whether to start loading automatically on mount */
  autoStart?: boolean;
  /** Callback when new data is loaded */
  onDataLoaded?: (newData: T[], allData: T[]) => void;
}

/**
 * useBackgroundLoader return type
 */
export interface UseBackgroundLoaderResult<T> {
  /** Combined data (initial + historical) */
  data: T[];
  /** Loading state */
  state: BackgroundLoadingState;
  /** Manually start background loading */
  startLoading: () => void;
  /** Cancel ongoing loading */
  cancelLoading: () => void;
}

/**
 * useBackgroundLoader Hook
 *
 * Purpose: Load historical data in background using React 18 useTransition
 * for non-blocking state updates that don't interrupt user interactions
 *
 * Features:
 * - Non-blocking updates with useTransition (UI remains responsive)
 * - Automatic AbortController cleanup on unmount
 * - Progressive data updates as chunks load
 * - Progress tracking for UI indicators
 * - Error handling with retry capability
 *
 * Performance:
 * - Doesn't block user interactions during loading
 * - Updates state progressively (not all at once)
 * - Respects rate limits via LoadHistoricalData use case
 *
 * Usage:
 * ```typescript
 * const { data, state, startLoading, cancelLoading } = useBackgroundLoader({
 *   repositoryId: 'facebook/react',
 *   dataType: DataType.PULL_REQUESTS,
 *   historicalRange: DateRange.create(thirtyOneDaysAgo, oneYearAgo).value,
 *   initialData: serverData,
 *   dataLoader,
 *   cacheRepository,
 *   autoStart: true, // Start loading automatically
 * });
 *
 * return (
 *   <div>
 *     {state.isLoading && <LoadingIndicator progress={state.progress} />}
 *     <PRChart data={data} />
 *   </div>
 * );
 * ```
 */
export function useBackgroundLoader<
  T extends PullRequest | DeploymentEvent | Commit,
>(options: UseBackgroundLoaderOptions<T>): UseBackgroundLoaderResult<T> {
  const {
    repositoryId,
    dataType,
    historicalRange,
    initialData,
    dataLoader,
    cacheRepository,
    autoStart = false,
    onDataLoaded,
  } = options;

  // State management
  const [data, setData] = useState<T[]>(initialData);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Refs for cleanup and tracking
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedRef = useRef(false);
  const isMountedRef = useRef(true);

  /**
   * Cancel ongoing loading operation
   */
  const cancelLoading = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      logger.info("useBackgroundLoader", "Loading cancelled by user");
    }
  }, []);

  /**
   * Start background loading
   */
  const startLoading = useCallback(() => {
    // Prevent duplicate loads
    if (hasLoadedRef.current || !isMountedRef.current) {
      return;
    }

    hasLoadedRef.current = true;
    setError(null);
    setProgress(null);
    setIsComplete(false);

    // Create new AbortController for this load operation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    logger.info("useBackgroundLoader", "Starting background load", {
      repositoryId,
      dataType,
      historicalRange: {
        start: historicalRange.start.toISOString(),
        end: historicalRange.end.toISOString(),
      },
    });

    // Use startTransition for non-blocking updates
    startTransition(async () => {
      try {
        const useCase = new LoadHistoricalData(dataLoader, cacheRepository);

        const result = await useCase.execute(
          repositoryId,
          dataType,
          historicalRange,
          signal,
          (progressUpdate) => {
            // Update progress in non-blocking way
            if (isMountedRef.current) {
              setProgress(progressUpdate);

              logger.debug("useBackgroundLoader", "Progress update", {
                chunk: progressUpdate.currentChunk,
                totalChunks: progressUpdate.totalChunks,
                itemsLoaded: progressUpdate.itemsLoaded,
              });
            }
          },
        );

        // Check if component is still mounted and not aborted
        if (!isMountedRef.current || signal.aborted) {
          logger.info("useBackgroundLoader", "Load aborted or unmounted");
          return;
        }

        if (result.ok) {
          const historicalItems = result.value.items as T[];

          // Combine initial data with historical data
          // Remove duplicates based on id (PRs) or sha (commits) or id (deployments)
          const combinedData = [...initialData];
          const existingIds = new Set(
            initialData.map((item) => {
              if ("number" in item) return (item as PullRequest).number;
              if ("sha" in item) return (item as Commit).sha;
              if ("id" in item) return (item as DeploymentEvent).id;
              return null;
            }),
          );

          for (const item of historicalItems) {
            const itemId =
              "number" in item
                ? (item as PullRequest).number
                : "sha" in item
                  ? (item as Commit).sha
                  : "id" in item
                    ? (item as DeploymentEvent).id
                    : null;

            if (itemId && !existingIds.has(itemId)) {
              combinedData.push(item);
              existingIds.add(itemId);
            }
          }

          setData(combinedData);
          setIsComplete(true);

          logger.info("useBackgroundLoader", "Background load complete", {
            initialCount: initialData.length,
            historicalCount: historicalItems.length,
            totalCount: combinedData.length,
            chunksLoaded: result.value.chunksLoaded,
          });

          // Notify parent component
          if (onDataLoaded) {
            onDataLoaded(historicalItems, combinedData);
          }
        } else {
          logger.error("useBackgroundLoader: Background load failed", {
            error: result.error.message,
          });
          setError(result.error.message);
        }
      } catch (err) {
        if (!isMountedRef.current || signal.aborted) {
          return; // Ignore errors if unmounted or aborted
        }

        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("useBackgroundLoader: Unexpected error", {
          error: errorMessage,
        });
        setError(errorMessage);
      }
    });
  }, [
    repositoryId,
    dataType,
    historicalRange,
    initialData,
    dataLoader,
    cacheRepository,
    onDataLoaded,
  ]);

  /**
   * Auto-start loading on mount if enabled
   */
  useEffect(() => {
    if (autoStart) {
      startLoading();
    }
  }, [autoStart, startLoading]);

  /**
   * Cleanup on unmount: abort ongoing requests
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // Abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        logger.info("useBackgroundLoader", "Aborted on unmount");
      }
    };
  }, []);

  return {
    data,
    state: {
      isLoading: isPending,
      progress,
      error,
      isComplete,
    },
    startLoading,
    cancelLoading,
  };
}
