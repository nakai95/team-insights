"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * AnalyticsTabs Component
 *
 * Purpose: Tab navigation for analytics page (Google Analytics style)
 *
 * Features:
 * - Two tabs: Overview, Team
 * - URL query parameter sync (?tab=overview|team)
 * - Browser back/forward button support
 * - Page refresh preserves tab selection
 * - Synced with sidebar navigation
 *
 * Note: This is a client component that manages tab state and URL sync.
 * The actual tab content can be Server Components.
 *
 * Usage:
 * ```tsx
 * <AnalyticsTabs>
 *   {activeTab === 'overview' && <OverviewContent />}
 *   {activeTab === 'team' && <TeamContent />}
 * </AnalyticsTabs>
 * ```
 */

export type AnalyticsTab = "overview" | "team";

interface AnalyticsTabsProps {
  children?: React.ReactNode;
  defaultTab?: AnalyticsTab;
}

export function AnalyticsTabs({
  children,
  defaultTab = "overview",
}: AnalyticsTabsProps) {
  const t = useTranslations("analytics.tabs");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Get initial tab from URL or use default
  const urlTab = searchParams.get("tab") as AnalyticsTab | null;
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(
    urlTab && ["overview", "team"].includes(urlTab) ? urlTab : defaultTab,
  );

  // Sync tab with URL changes (browser back/forward, sidebar clicks)
  useEffect(() => {
    const urlTab = searchParams.get("tab") as AnalyticsTab | null;
    if (urlTab && ["overview", "team"].includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams, activeTab]);

  /**
   * Handle tab change by updating both local state and URL
   * Preserves all other query parameters (repo, start, end, range)
   */
  const handleTabChange = (tab: AnalyticsTab) => {
    setActiveTab(tab);

    // Build new URL with updated tab parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);

    // Update URL without page reload, don't scroll to top
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            onClick={() => handleTabChange("overview")}
            className={cn(
              "rounded-b-none",
              activeTab === "overview" && "border-b-2 border-primary",
            )}
          >
            {t("overview")}
          </Button>

          <Button
            variant={activeTab === "team" ? "default" : "ghost"}
            onClick={() => handleTabChange("team")}
            className={cn(
              "rounded-b-none",
              activeTab === "team" && "border-b-2 border-primary",
            )}
          >
            {t("team")}
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      <div>{children}</div>
    </div>
  );
}

/**
 * Hook to get current active tab
 * Used by parent components to conditionally render tab content
 */
export function useActiveTab(): AnalyticsTab {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as AnalyticsTab | null;
  return urlTab && ["overview", "team"].includes(urlTab) ? urlTab : "overview";
}
