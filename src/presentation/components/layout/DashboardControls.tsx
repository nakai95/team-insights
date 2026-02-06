"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DateRangeSelector } from "@/presentation/components/shared/DateRangeSelector";
import { DateRange } from "@/domain/value-objects/DateRange";
import { DateRangePreset } from "@/domain/types/DateRangePreset";

interface DashboardControlsProps {
  /** Serializable date range (ISO strings) */
  currentRange: { start: string; end: string };
  repositoryUrl: string;
}

/**
 * Client Component for dashboard controls (date range selector, etc.)
 *
 * Manages URL params and triggers Server Component re-renders when date range changes
 */
export function DashboardControls({
  currentRange,
  repositoryUrl,
}: DashboardControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Deserialize date range from ISO strings to DateRange instance
  const dateRange = useMemo(() => {
    const start = new Date(currentRange.start);
    const end = new Date(currentRange.end);
    const result = DateRange.create(start, end);
    return result.ok ? result.value : DateRange.last30Days();
  }, [currentRange.start, currentRange.end]);

  const handleDateRangeChange = (range: DateRange) => {
    // Create new URL search params
    const params = new URLSearchParams(searchParams.toString());

    // Keep existing repo param
    params.set("repo", repositoryUrl);

    // Determine if this matches a preset
    const preset = getPresetFromDateRange(range);

    if (preset && preset !== DateRangePreset.CUSTOM) {
      // Use preset parameter for predefined ranges
      params.set("range", presetToUrlParam(preset));
      params.delete("start");
      params.delete("end");
    } else {
      // Use custom date parameters
      params.delete("range");
      params.set("start", range.start.toISOString().split("T")[0] ?? "");
      params.set("end", range.end.toISOString().split("T")[0] ?? "");
    }

    // Navigate to updated URL (triggers Server Component refetch)
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Date Range</h2>
          <p className="text-sm text-muted-foreground">
            Select a time period to analyze
          </p>
        </div>
        <DateRangeSelector
          value={dateRange}
          onChange={handleDateRangeChange}
          className="w-full sm:w-auto"
        />
      </div>
    </div>
  );
}

/**
 * Get preset identifier from DateRange
 */
function getPresetFromDateRange(range: DateRange): string {
  const last7 = DateRange.last7Days();
  const last30 = DateRange.last30Days();
  const last90 = DateRange.last90Days();
  const last6Months = DateRange.last6Months();
  const lastYear = DateRange.lastYear();

  // Check with tolerance (1 day) to account for timing differences
  const tolerance = 24 * 60 * 60 * 1000;

  const isWithinTolerance = (preset: DateRange) => {
    return (
      Math.abs(range.start.getTime() - preset.start.getTime()) < tolerance &&
      Math.abs(range.end.getTime() - preset.end.getTime()) < tolerance
    );
  };

  if (isWithinTolerance(last7)) return DateRangePreset.LAST_7_DAYS;
  if (isWithinTolerance(last30)) return DateRangePreset.LAST_30_DAYS;
  if (isWithinTolerance(last90)) return DateRangePreset.LAST_90_DAYS;
  if (isWithinTolerance(last6Months)) return DateRangePreset.LAST_6_MONTHS;
  if (isWithinTolerance(lastYear)) return DateRangePreset.LAST_YEAR;

  return DateRangePreset.CUSTOM;
}

/**
 * Convert preset to URL parameter format
 */
function presetToUrlParam(preset: string): string {
  switch (preset) {
    case DateRangePreset.LAST_7_DAYS:
      return "7d";
    case DateRangePreset.LAST_30_DAYS:
      return "30d";
    case DateRangePreset.LAST_90_DAYS:
      return "90d";
    case DateRangePreset.LAST_6_MONTHS:
      return "6m";
    case DateRangePreset.LAST_YEAR:
      return "1y";
    default:
      return "custom";
  }
}
