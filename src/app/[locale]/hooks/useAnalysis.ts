"use client";

import { useState, useCallback, useEffect } from "react";
import { analyzeRepository } from "@/app/actions/analyzeRepository";
import { AnalysisRequest } from "@/application/dto/AnalysisRequest";
import {
  AnalysisResult,
  AnalysisError,
} from "@/application/dto/AnalysisResult";
import { logger } from "@/lib/utils/logger";

export type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
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
 */
export function useAnalysis(): UseAnalysisReturn {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });

  // Restore cached analysis state on mount
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

  const analyze = useCallback(async (request: AnalysisRequest) => {
    setState({ status: "loading" });

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
  }, []);

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
