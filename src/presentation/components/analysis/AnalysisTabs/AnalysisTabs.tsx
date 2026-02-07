"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AnalysisResult } from "@/application/dto/AnalysisResult";
import { ContributorDto } from "@/application/dto/ContributorDto";
import { OverviewTab } from "../../tabs/OverviewTab";
import { ThroughputTab } from "../../tabs/ThroughputTab";
import { ChangesTimeseriesTab } from "../../tabs/ChangesTimeseriesTab";
import { DeploymentFrequencyTab } from "../DeploymentFrequencyTab";
import { ThroughputClient } from "../../tabs/ThroughputTab";
import { ChangesClient } from "../../tabs/ChangesTimeseriesTab/ChangesClient";
import { DeploymentFrequencyClient } from "../DeploymentFrequencyClient";

import { DateRangeSelector } from "../../shared/DateRangeSelector";
import { DateRange } from "@/domain/value-objects/DateRange";

export type TabSelection =
  | "overview"
  | "throughput"
  | "changes"
  | "deployment-frequency";

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
    urlTab &&
      ["overview", "throughput", "changes", "deployment-frequency"].includes(
        urlTab,
      )
      ? urlTab
      : initialTab,
  );

  // Check if progressive mode is enabled
  const isProgressiveMode = searchParams.get("mode") === "progressive";

  // Parse current date range from URL or use analysis result date range
  const currentDateRange = useMemo(() => {
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const rangeParam = searchParams.get("range");

    // Try to parse from URL params first
    if (rangeParam) {
      switch (rangeParam) {
        case "7d":
          return DateRange.last7Days();
        case "30d":
          return DateRange.last30Days();
        case "90d":
          return DateRange.last90Days();
        case "6m":
          return DateRange.last6Months();
        case "1y":
          return DateRange.lastYear();
      }
    }

    if (startParam && endParam) {
      const start = new Date(startParam);
      const end = new Date(endParam);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const result = DateRange.create(start, end);
        if (result.ok) {
          return result.value;
        }
      }
    }

    // Fallback to analysis result date range
    if (analysisResult.analysis.dateRange) {
      const start = new Date(analysisResult.analysis.dateRange.start);
      const end = new Date(analysisResult.analysis.dateRange.end);
      const result = DateRange.create(start, end);
      if (result.ok) {
        return result.value;
      }
    }

    // Final fallback: last 30 days
    return DateRange.last30Days();
  }, [searchParams, analysisResult.analysis.dateRange]);

  // Sync tab with URL changes (browser back/forward)
  useEffect(() => {
    const urlTab = searchParams.get("tab") as TabSelection | null;
    if (
      urlTab &&
      ["overview", "throughput", "changes", "deployment-frequency"].includes(
        urlTab,
      ) &&
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
    // Preserve existing query params when changing tabs
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  /**
   * Handle date range change in progressive mode
   * Updates URL params to trigger re-analysis with new date range
   */
  const handleDateRangeChange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("start", range.start.toISOString().split("T")[0] as string);
    params.set("end", range.end.toISOString().split("T")[0] as string);
    // Keep mode=progressive and current tab
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full space-y-6">
      {/* Date Range Selector - Only show in progressive mode */}
      {isProgressiveMode && (
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Date Range</p>
            <DateRangeSelector
              value={currentDateRange}
              onChange={handleDateRangeChange}
            />
          </div>
        </div>
      )}

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
          <Button
            variant={activeTab === "deployment-frequency" ? "default" : "ghost"}
            onClick={() => handleTabChange("deployment-frequency")}
            className="rounded-b-none text-xs sm:text-sm"
          >
            {t("deploymentFrequency")}
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-4 sm:mt-6">
        {activeTab === "overview" && (
          <OverviewTab contributors={contributors} />
        )}

        {activeTab === "throughput" &&
          (isProgressiveMode ? (
            <ThroughputClient
              throughputData={analysisResult.throughput}
              repositoryId={analysisResult.analysis.repositoryUrl
                .split("/")
                .slice(-2)
                .join("/")}
              dateRange={analysisResult.analysis.dateRange}
              enableProgressiveLoading={true}
            />
          ) : (
            <ThroughputTab throughputData={analysisResult.throughput} />
          ))}

        {activeTab === "changes" &&
          (isProgressiveMode ? (
            <ChangesClient
              timeseriesData={analysisResult.timeseries}
              repositoryUrl={analysisResult.analysis.repositoryUrl}
              dateRange={analysisResult.analysis.dateRange}
              repositoryId={analysisResult.analysis.repositoryUrl
                .split("/")
                .slice(-2)
                .join("/")}
              enableProgressiveLoading={true}
            />
          ) : (
            <ChangesTimeseriesTab
              timeseriesData={analysisResult.timeseries}
              repositoryUrl={analysisResult.analysis.repositoryUrl}
              dateRange={analysisResult.analysis.dateRange}
            />
          ))}

        {activeTab === "deployment-frequency" &&
          analysisResult.deploymentFrequency &&
          (isProgressiveMode ? (
            <DeploymentFrequencyClient
              initialData={[]}
              repositoryId={analysisResult.analysis.repositoryUrl
                .split("/")
                .slice(-2)
                .join("/")}
              dateRange={analysisResult.analysis.dateRange}
            />
          ) : (
            <DeploymentFrequencyTab data={analysisResult.deploymentFrequency} />
          ))}
      </div>
    </div>
  );
}
