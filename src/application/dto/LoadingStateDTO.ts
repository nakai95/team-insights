import { DataType } from "@/domain/types/DataType";
import { DataLoadErrorType } from "@/domain/interfaces/IDataLoader";

/**
 * Loading phase for progressive data loading
 */
export const LoadingPhase = {
  IDLE: "idle",
  INITIAL: "initial", // Loading initial 30-day data
  BACKGROUND: "background", // Loading historical data in background
  REVALIDATING: "revalidating", // Refreshing stale cached data
  COMPLETE: "complete",
  ERROR: "error",
} as const;

export type LoadingPhase = (typeof LoadingPhase)[keyof typeof LoadingPhase];

/**
 * Data Transfer Object for loading state
 *
 * Used to communicate loading progress and status from application layer
 * to presentation layer components.
 */
export interface LoadingStateDTO {
  /**
   * Current loading phase
   */
  phase: LoadingPhase;

  /**
   * Data type being loaded
   */
  dataType: DataType;

  /**
   * Repository identifier
   */
  repositoryId: string;

  /**
   * Loading progress (0-100)
   * - null if not applicable (e.g., during initial load)
   * - 0-100 during background loading
   */
  progress: number | null;

  /**
   * Whether this is a priority (blocking) load
   * - true for initial 30-day load
   * - false for background historical load
   */
  isPriority: boolean;

  /**
   * Loading metadata
   */
  metadata: {
    /**
     * When loading started
     */
    startedAt: string; // ISO 8601 date string

    /**
     * Expected completion time (estimated)
     */
    estimatedCompletionAt?: string; // ISO 8601 date string

    /**
     * Number of items loaded so far
     */
    itemsLoaded: number;

    /**
     * Total items expected (estimate)
     */
    totalItemsExpected?: number;

    /**
     * Current chunk being loaded (for background loading)
     */
    currentChunk?: {
      index: number; // 0-based chunk index
      total: number; // Total number of chunks
      dateRange: {
        start: string; // ISO 8601 date string
        end: string; // ISO 8601 date string
      };
    };

    /**
     * Whether loading can be cancelled
     */
    cancellable: boolean;
  };

  /**
   * Error information (if phase is ERROR)
   */
  error?: {
    type: DataLoadErrorType;
    message: string;
    rateLimitReset?: string; // ISO 8601 date string
    retryAfter?: number; // milliseconds
    retryable: boolean;
  };
}

/**
 * Simplified loading state for UI components
 */
export interface SimpleLoadingStateDTO {
  /**
   * Whether data is currently loading
   */
  isLoading: boolean;

  /**
   * Whether this is background (non-blocking) loading
   */
  isBackgroundLoading: boolean;

  /**
   * Progress percentage (0-100) or null
   */
  progress: number | null;

  /**
   * User-friendly status message
   */
  statusMessage: string;

  /**
   * Error message if loading failed
   */
  error?: string;
}

/**
 * Multi-data-type loading state
 *
 * Used when loading multiple data types in parallel (e.g., PRs + deployments + commits)
 */
export interface MultiLoadingStateDTO {
  /**
   * Overall loading phase
   */
  phase: LoadingPhase;

  /**
   * Repository identifier
   */
  repositoryId: string;

  /**
   * Individual loading states per data type
   */
  states: {
    prs: LoadingStateDTO;
    deployments: LoadingStateDTO;
    commits: LoadingStateDTO;
  };

  /**
   * Overall progress (0-100)
   * Calculated as average of individual data type progress
   */
  overallProgress: number;

  /**
   * Whether any data type is currently loading
   */
  isLoading: boolean;

  /**
   * Whether any data type has an error
   */
  hasError: boolean;

  /**
   * Combined error messages
   */
  errors: string[];
}
