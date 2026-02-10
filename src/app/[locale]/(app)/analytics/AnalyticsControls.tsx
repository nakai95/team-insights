"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange as DateRangeType } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { RepositorySelector } from "./RepositorySelector";

/**
 * AnalyticsControls Component
 *
 * Purpose: Google Analytics-style controls for repository and date range selection
 *
 * Features:
 * - Repository input field with search icon
 * - Date range selector with presets (7d, 30d, 90d, etc.)
 * - Custom date range picker
 * - Updates URL parameters on change
 * - Triggers page reload with new parameters
 *
 * Usage:
 * ```typescript
 * <AnalyticsControls
 *   currentRepo="facebook/react"
 *   currentRange={{ start: "2024-01-01", end: "2024-02-01" }}
 * />
 * ```
 */

interface AnalyticsControlsProps {
  currentRepo: string;
  currentRange: {
    start: string; // ISO date string
    end: string; // ISO date string
  };
}

const presetOptions = [
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
  { label: "Last 6 months", value: "180d", days: 180 },
  { label: "Last 1 year", value: "365d", days: 365 },
  { label: "Custom range", value: "custom", days: 0 },
];

export function AnalyticsControls({
  currentRepo,
  currentRange,
}: AnalyticsControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("analytics");

  const [selectedPreset, setSelectedPreset] = React.useState(() => {
    // Detect current preset from date range
    const rangeParam = searchParams.get("range");
    if (rangeParam) {
      return rangeParam;
    }
    return "30d"; // default
  });
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [customDateRange, setCustomDateRange] = React.useState<
    DateRangeType | undefined
  >(() => {
    if (selectedPreset === "custom") {
      return {
        from: new Date(currentRange.start),
        to: new Date(currentRange.end),
      };
    }
    return undefined;
  });

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);

    if (preset === "custom") {
      setIsCalendarOpen(true);
      return;
    }

    // Update URL with preset range
    updateURL(currentRepo, preset);
  };

  const handleCustomDateRangeChange = (range: DateRangeType | undefined) => {
    setCustomDateRange(range);

    if (range?.from && range?.to) {
      // Update URL with custom date range
      const params = new URLSearchParams();
      params.set("repo", currentRepo);
      params.set("start", range.from.toISOString().split("T")[0]!);
      params.set("end", range.to.toISOString().split("T")[0]!);

      router.push(`?${params.toString()}`);
      setIsCalendarOpen(false);
    }
  };

  const updateURL = (repo: string, range: string) => {
    const params = new URLSearchParams();
    params.set("repo", repo);

    if (range !== "custom") {
      params.set("range", range);
    } else if (customDateRange?.from && customDateRange?.to) {
      params.set("start", customDateRange.from.toISOString().split("T")[0]!);
      params.set("end", customDateRange.to.toISOString().split("T")[0]!);
    }

    router.push(`?${params.toString()}`);
  };

  const displayText =
    selectedPreset === "custom" && customDateRange?.from && customDateRange?.to
      ? `${format(customDateRange.from, "MMM d, yyyy")} - ${format(customDateRange.to, "MMM d, yyyy")}`
      : presetOptions.find((opt) => opt.value === selectedPreset)?.label ||
        "Select date range";

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
        {t("title")}
      </h1>

      {/* Controls */}
      <div className="flex flex-col gap-4 p-4 bg-muted/50 rounded-lg border">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
          {/* Repository Selector */}
          <div className="flex-1">
            <RepositorySelector currentRepo={currentRepo} />
          </div>

          {/* Date Range Selector */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {presetOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPreset === "custom" && (
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal sm:w-[300px]",
                      !customDateRange && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {displayText}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    defaultMonth={customDateRange?.from}
                    selected={customDateRange}
                    onSelect={handleCustomDateRangeChange}
                    numberOfMonths={2}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            )}

            {selectedPreset !== "custom" && (
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {format(new Date(currentRange.start), "MMM d, yyyy")} -{" "}
                {format(new Date(currentRange.end), "MMM d, yyyy")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
