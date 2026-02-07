"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

/**
 * RefreshButton Component
 *
 * Manual cache invalidation button that triggers fresh data fetch.
 * Shows loading spinner during refresh operation.
 *
 * Features:
 * - Animated refresh icon on click
 * - Loading state with spinner
 * - Disabled state during refresh
 * - Accessible with ARIA labels
 * - Dark mode support
 *
 * Usage:
 * ```tsx
 * <RefreshButton
 *   onRefresh={async () => {
 *     await loadInitialData.revalidate(repositoryId, dateRange);
 *   }}
 * />
 * ```
 */

interface RefreshButtonProps {
  /**
   * Callback to execute when refresh is triggered
   * Should return a Promise that resolves when refresh completes
   */
  onRefresh: () => Promise<void>;

  /**
   * Optional label for the button (default: "Refresh")
   */
  label?: string;

  /**
   * Size variant (default: "default")
   */
  size?: "sm" | "default" | "lg";

  /**
   * Button variant (default: "outline")
   */
  variant?: "outline" | "ghost" | "default";
}

export function RefreshButton({
  onRefresh,
  label = "Refresh",
  size = "default",
  variant = "outline",
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleClick = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: "h-8 px-2 text-xs",
    default: "h-9 px-3 text-sm",
    lg: "h-10 px-4 text-base",
  };

  // Variant classes
  const variantClasses = {
    outline:
      "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
    ghost:
      "hover:bg-gray-100 text-gray-700 dark:text-gray-200 dark:hover:bg-gray-800",
    default:
      "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600",
  };

  return (
    <button
      onClick={handleClick}
      disabled={isRefreshing}
      className={`
        inline-flex items-center justify-center gap-2 rounded-md font-medium
        transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
        disabled:pointer-events-none disabled:opacity-50
        ${sizeClasses[size]}
        ${variantClasses[variant]}
      `}
      aria-label={isRefreshing ? "Refreshing data..." : label}
      aria-busy={isRefreshing}
    >
      <RefreshCw
        className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      <span>{isRefreshing ? "Refreshing..." : label}</span>
    </button>
  );
}
