"use client";

import { AlertCircle } from "lucide-react";

/**
 * StaleDataBanner Component
 *
 * Displays a banner to indicate when cached data is stale and being refreshed in the background.
 * Shows during stale-while-revalidate scenarios where old data is displayed while fresh data loads.
 *
 * Features:
 * - Yellow warning banner with icon
 * - Clear messaging about data staleness
 * - Dismissible (optional)
 * - Dark mode support via Tailwind CSS
 *
 * Usage:
 * ```tsx
 * {cacheStatus === CacheStatus.REVALIDATING && (
 *   <StaleDataBanner onDismiss={() => setShowBanner(false)} />
 * )}
 * ```
 */

interface StaleDataBannerProps {
  /**
   * Optional callback when banner is dismissed
   */
  onDismiss?: () => void;
  /**
   * Custom message to display (default: "Data may be outdated. Refreshing...")
   */
  message?: string;
  /**
   * Show dismissible close button (default: false)
   */
  dismissible?: boolean;
}

export function StaleDataBanner({
  onDismiss,
  message = "Data may be outdated. Refreshing in the background...",
  dismissible = false,
}: StaleDataBannerProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>

      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-auto flex-shrink-0 text-yellow-800 hover:text-yellow-900 dark:text-yellow-200 dark:hover:text-yellow-100"
          aria-label="Dismiss notification"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
