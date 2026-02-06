"use client";

import { type LoadProgress } from "@/application/use-cases/LoadHistoricalData";

/**
 * LoadingIndicator props
 */
export interface LoadingIndicatorProps {
  /** Current loading progress (optional) */
  progress?: LoadProgress | null;
  /** Custom loading message */
  message?: string;
  /** Whether to show progress details */
  showProgress?: boolean;
  /** CSS class for styling */
  className?: string;
}

/**
 * LoadingIndicator Component
 *
 * Purpose: Display non-intrusive loading indicator during background data loading
 *
 * Features:
 * - Shows "Loading more data..." text
 * - Optional progress tracking (X/Y chunks)
 * - Animated loading dots
 * - Dark mode compatible
 * - Minimal visual footprint (doesn't block content)
 *
 * Usage:
 * ```tsx
 * // Simple usage
 * {state.isLoading && <LoadingIndicator />}
 *
 * // With progress
 * {state.isLoading && (
 *   <LoadingIndicator
 *     progress={state.progress}
 *     showProgress={true}
 *   />
 * )}
 * ```
 */
export function LoadingIndicator({
  progress,
  message,
  showProgress = true,
  className = "",
}: LoadingIndicatorProps) {
  const defaultMessage = "Loading more data";

  return (
    <div
      className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Loading spinner */}
      <svg
        className="animate-spin h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>

      {/* Loading message */}
      <span>{message || defaultMessage}</span>

      {/* Progress indicator */}
      {showProgress && progress && (
        <span className="text-xs">
          ({progress.currentChunk}/{progress.totalChunks})
        </span>
      )}

      {/* Screen reader text */}
      <span className="sr-only">
        {progress
          ? `Loading chunk ${progress.currentChunk} of ${progress.totalChunks}`
          : "Loading historical data in background"}
      </span>
    </div>
  );
}

/**
 * Compact LoadingIndicator variant (icon only)
 *
 * Usage:
 * ```tsx
 * {state.isLoading && <LoadingIndicatorCompact />}
 * ```
 */
export function LoadingIndicatorCompact({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <svg
        className="animate-spin h-3 w-3 text-muted-foreground"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">Loading</span>
    </div>
  );
}

/**
 * LoadingIndicator with progress bar
 *
 * Usage:
 * ```tsx
 * {state.isLoading && (
 *   <LoadingIndicatorWithProgress progress={state.progress} />
 * )}
 * ```
 */
export function LoadingIndicatorWithProgress({
  progress,
  className = "",
}: {
  progress?: LoadProgress | null;
  className?: string;
}) {
  const percentage = progress
    ? Math.round((progress.currentChunk / progress.totalChunks) * 100)
    : 0;

  return (
    <div className={`space-y-2 ${className}`} role="status" aria-live="polite">
      {/* Text indicator */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading historical data</span>
        </div>
        {progress && (
          <span className="text-xs">
            {progress.currentChunk}/{progress.totalChunks}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Additional details */}
      {progress && progress.itemsLoaded > 0 && (
        <div className="text-xs text-muted-foreground">
          Loaded {progress.totalItemsLoaded.toLocaleString()} items
        </div>
      )}

      {/* Screen reader text */}
      <span className="sr-only">
        {progress
          ? `Loading progress: ${percentage}% complete. Chunk ${progress.currentChunk} of ${progress.totalChunks}.`
          : "Loading historical data"}
      </span>
    </div>
  );
}
