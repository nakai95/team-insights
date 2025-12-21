"use client";

import { useState, useCallback } from "react";
import { analyzeRepository } from "@/app/actions/analyzeRepository";
import { AnalysisRequest } from "@/application/dto/AnalysisRequest";
import {
  AnalysisResult,
  AnalysisError,
} from "@/application/dto/AnalysisResult";

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

/**
 * React hook for managing repository analysis state
 * Provides a simple interface to call the analyzeRepository Server Action
 */
export function useAnalysis(): UseAnalysisReturn {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });

  const analyze = useCallback(async (request: AnalysisRequest) => {
    setState({ status: "loading" });

    try {
      const result = await analyzeRepository(request);

      if (result.ok) {
        setState({
          status: "success",
          data: result.value,
        });
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
  }, []);

  return {
    state,
    analyze,
    reset,
  };
}
