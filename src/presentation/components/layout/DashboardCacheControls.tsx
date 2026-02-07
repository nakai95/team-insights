"use client";

import { useState, useCallback } from "react";
import { StaleDataBanner } from "@/presentation/components/shared/StaleDataBanner";
import { RefreshButton } from "@/presentation/components/shared/RefreshButton";
import { useRouter } from "next/navigation";

/**
 * DashboardCacheControls
 *
 * Client Component that provides cache control UI:
 * - StaleDataBanner: Shows when data is stale
 * - RefreshButton: Manual cache invalidation
 *
 * Usage:
 * ```tsx
 * // In Server Component (DashboardWithInitialData):
 * <DashboardCacheControls
 *   repositoryUrl={repositoryUrl}
 *   showStaleWarning={cacheStatus.isStale}
 * />
 * ```
 */

interface DashboardCacheControlsProps {
  /**
   * Repository URL for cache invalidation
   */
  repositoryUrl: string;

  /**
   * Whether to show stale data warning
   * (Typically passed from cache status)
   */
  showStaleWarning?: boolean;
}

export function DashboardCacheControls({
  repositoryUrl,
  showStaleWarning = false,
}: DashboardCacheControlsProps) {
  const router = useRouter();
  const [showBanner, setShowBanner] = useState(showStaleWarning);

  /**
   * Handle manual refresh
   * Reloads the page to force Server Component to fetch fresh data
   */
  const handleRefresh = useCallback(async () => {
    // Force router refresh to trigger Server Component re-fetch
    router.refresh();
  }, [router]);

  return (
    <div className="space-y-4">
      {/* Stale Data Banner */}
      {showBanner && (
        <StaleDataBanner
          message="Data may be outdated. Click refresh to load latest data."
          dismissible={true}
          onDismiss={() => setShowBanner(false)}
        />
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <RefreshButton
          onRefresh={handleRefresh}
          label="Refresh Data"
          size="sm"
          variant="outline"
        />
      </div>
    </div>
  );
}
