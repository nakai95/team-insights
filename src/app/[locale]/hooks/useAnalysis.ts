"use client";

import { useState, useCallback, useEffect } from "react";
import { analyzeRepository } from "@/app/actions/analyzeRepository";
import { AnalysisRequest } from "@/application/dto/AnalysisRequest";
import {
  AnalysisResult,
  AnalysisError,
} from "@/application/dto/AnalysisResult";
import { logger } from "@/lib/utils/logger";
import { initializeCache } from "@/infrastructure/storage/initializeCache";
import type { ICacheRepository } from "@/domain/interfaces/ICacheRepository";

export type AnalysisState =
  | { status: "idle" }
  | {
      status: "loading";
      dateRange?: { start: string; end: string };
    }
  | { status: "success"; data: AnalysisResult }
  | { status: "error"; error: AnalysisError };

export interface UseAnalysisReturn {
  state: AnalysisState;
  analyze: (request: AnalysisRequest) => Promise<void>;
  reset: () => void;
}

const STORAGE_KEY = "dashboard-analysis-cache";

interface AnalysisCache {
  state: AnalysisState;
  request: AnalysisRequest;
  timestamp: number;
}

/**
 * React hook for managing repository analysis state
 * Provides a simple interface to call the analyzeRepository Server Action
 *
 * Progressive loading integration:
 * - Checks IndexedDB cache before Server Action (cache-first strategy)
 * - Shows stale cached data immediately, refreshes in background (stale-while-revalidate)
 * - Stores results in both sessionStorage (fast) and IndexedDB (persistent)
 */
export function useAnalysis(): UseAnalysisReturn {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [cacheRepository, setCacheRepository] =
    useState<ICacheRepository | null>(null);
  const [cacheInitialized, setCacheInitialized] = useState(false);

  // Initialize IndexedDB cache on mount
  useEffect(() => {
    let mounted = true;

    async function initCache() {
      const result = await initializeCache();

      if (mounted) {
        const cache = result.success ? result.adapter : result.fallback;
        setCacheRepository(cache);
        setCacheInitialized(true);

        if (!result.success) {
          logger.warn(
            `IndexedDB cache unavailable: ${result.reason}, using in-memory fallback`,
          );
        }
      }
    }

    initCache();

    return () => {
      mounted = false;
    };
  }, []);

  // Restore cached analysis state on mount from sessionStorage (fast)
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) {
        const { state: cachedState } = JSON.parse(cached) as AnalysisCache;
        // Only restore success state
        if (cachedState.status === "success") {
          setState(cachedState);
        }
      }
    } catch (error) {
      // Ignore errors (e.g., JSON parse errors, private mode)
      logger.debug("Failed to restore analysis cache", error);
    }
  }, []);

  const analyze = useCallback(
    async (request: AnalysisRequest) => {
      // Calculate effective date range (apply default if not provided)
      let effectiveDateRange: { start: string; end: string };

      if (request.dateRange) {
        // If dateRange is provided, fill in missing values with defaults
        const startValue: string =
          request.dateRange.start ||
          (new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0] as string);
        const endValue: string =
          request.dateRange.end ||
          (new Date().toISOString().split("T")[0] as string);

        effectiveDateRange = {
          start: startValue,
          end: endValue,
        };
      } else {
        // No dateRange provided, use default 6 months
        effectiveDateRange = {
          start: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0] as string,
          end: new Date().toISOString().split("T")[0] as string,
        };
      }

      // TODO: IndexedDB cache check for full AnalysisResult
      // Currently, IndexedDB is used for individual data types (PRs, Deployments, Commits)
      // in background loading hooks. Full AnalysisResult caching uses sessionStorage (see below).
      //
      // Future enhancement: Add DataType.ANALYSIS_RESULT and implement full result caching
      // with stale-while-revalidate pattern here.
      if (cacheInitialized && cacheRepository) {
        logger.debug(
          "IndexedDB cache available for background loading (individual data types)",
        );
      }

      setState({
        status: "loading",
        dateRange: effectiveDateRange,
      });

      try {
        const result = await analyzeRepository(request);

        if (result.ok) {
          const successState: AnalysisState = {
            status: "success",
            data: result.value,
          };
          setState(successState);

          // Cache the analysis result
          try {
            const cache: AnalysisCache = {
              state: successState,
              request,
              timestamp: Date.now(),
            };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
          } catch (error) {
            // Ignore storage errors (e.g., quota exceeded, private mode)
            logger.debug("Failed to cache analysis", error);
          }
        } else {
          setState({
            status: "error",
            error: result.error,
          });
        }
      } catch (error) {
        // Handle unexpected errors
        setState({
          status: "error",
          error: {
            code: "INTERNAL_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred",
          },
        });
      }
    },
    [cacheInitialized, cacheRepository],
  );

  const reset = useCallback(() => {
    setState({ status: "idle" });
    // Clear the cache
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      logger.debug("Failed to clear cache", error);
    }
  }, []);

  return {
    state,
    analyze,
    reset,
  };
}
