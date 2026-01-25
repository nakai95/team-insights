"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AnalysisResult } from "@/application/dto/AnalysisResult";
import { ContributorDto } from "@/application/dto/ContributorDto";
import { OverviewTab } from "./OverviewTab";
import { ThroughputTab } from "./ThroughputTab";
import { ChangesTimeseriesTab } from "./ChangesTimeseriesTab";

export type TabSelection = "overview" | "throughput" | "changes";

export interface AnalysisTabsProps {
  /** Complete analysis result including all tab data */
  analysisResult: AnalysisResult;
  /** Contributors list (managed by parent for identity merging) */
  contributors: ContributorDto[];
  /** Initial tab selection (defaults to 'overview' if not specified) */
  initialTab?: TabSelection;
}

/**
 * Tab navigation component with URL synchronization
 *
 * Features:
 * - Three tabs: Overview, PR Throughput, PR Changes Timeseries
 * - URL query parameter sync (?tab=overview|throughput|changes)
 * - Browser back/forward button support
 * - Page refresh preserves tab selection
 * - Direct links to specific tabs work
 *
 * Note: Header and summary cards are managed by parent (DashboardContent)
 * to avoid re-renders during tab switches
 */
export function AnalysisTabs({
  analysisResult,
  contributors,
  initialTab = "overview",
}: AnalysisTabsProps) {
  const t = useTranslations("dashboard.tabs");
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get initial tab from URL or use default
  const urlTab = searchParams.get("tab") as TabSelection | null;
  const [activeTab, setActiveTab] = useState<TabSelection>(
    urlTab && ["overview", "throughput", "changes"].includes(urlTab)
      ? urlTab
      : initialTab,
  );

  // Sync tab with URL changes (browser back/forward)
  useEffect(() => {
    const urlTab = searchParams.get("tab") as TabSelection | null;
    if (
      urlTab &&
      ["overview", "throughput", "changes"].includes(urlTab) &&
      urlTab !== activeTab
    ) {
      setActiveTab(urlTab);
    }
  }, [searchParams, activeTab]);

  /**
   * Handle tab change by updating both local state and URL
   * Uses scroll: false to prevent page jump on tab switch
   */
  const handleTabChange = (tab: TabSelection) => {
    setActiveTab(tab);
    router.push(`?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="w-full space-y-6">
      {/* Tab Navigation - Responsive for mobile */}
      <div className="border-b border-border overflow-x-auto">
        <div className="flex space-x-1 min-w-max">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            onClick={() => handleTabChange("overview")}
            className="rounded-b-none text-xs sm:text-sm"
          >
            {t("overview")}
          </Button>
          <Button
            variant={activeTab === "throughput" ? "default" : "ghost"}
            onClick={() => handleTabChange("throughput")}
            className="rounded-b-none text-xs sm:text-sm"
          >
            {t("throughput")}
          </Button>
          <Button
            variant={activeTab === "changes" ? "default" : "ghost"}
            onClick={() => handleTabChange("changes")}
            className="rounded-b-none text-xs sm:text-sm"
          >
            {t("changes")}
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-4 sm:mt-6">
        {activeTab === "overview" && (
          <OverviewTab contributors={contributors} />
        )}

        {activeTab === "throughput" && (
          <ThroughputTab throughputData={analysisResult.throughput} />
        )}

        {activeTab === "changes" && (
          <ChangesTimeseriesTab
            timeseriesData={analysisResult.timeseries}
            repositoryUrl={analysisResult.analysis.repositoryUrl}
            dateRange={analysisResult.analysis.dateRange}
          />
        )}
      </div>
    </div>
  );
}
