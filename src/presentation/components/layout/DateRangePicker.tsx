"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange as ReactDayPickerDateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";
import { HeroMetricsSkeleton } from "@/presentation/components/analytics/skeletons/HeroMetricsSkeleton";
import { SkeletonChart } from "@/presentation/components/shared/SkeletonChart";

/**
 * DateRangePicker Component
 *
 * Purpose: Date range selection for analytics (Google Analytics style)
 *
 * Features:
 * - Preset ranges (7d, 30d, 90d)
 * - Custom date range picker
 * - Updates URL with selected range
 *
 * Usage:
 * ```tsx
 * <DateRangePicker />
 * ```
 */

interface DateRange {
  from: Date;
  to: Date;
}

const presetRanges = [
  { label: "Last 7 days", days: 7, value: "7d" },
  { label: "Last 30 days", days: 30, value: "30d" },
  { label: "Last 90 days", days: 90, value: "90d" },
];

export function DateRangePicker() {
  const t = useTranslations("layout.dateRangePicker");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Parse current date range from URL
  const getCurrentRange = (): DateRange | undefined => {
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const rangeParam = searchParams.get("range");

    if (startParam && endParam) {
      return {
        from: new Date(startParam),
        to: new Date(endParam),
      };
    }

    if (rangeParam) {
      const days = parseInt(rangeParam.replace("d", ""));
      if (!isNaN(days)) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        return { from: startDate, to: endDate };
      }
    }

    // Default: last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return { from: startDate, to: endDate };
  };

  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    getCurrentRange(),
  );

  // Handle preset selection
  const handlePresetSelect = (days: number, value: string) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    setDateRange({ from: startDate, to: endDate });

    // Update URL with preset range
    const params = new URLSearchParams(searchParams.toString());
    params.delete("start");
    params.delete("end");
    params.set("range", value);

    // Navigate with transition to show loading state immediately
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
    setOpen(false);
  };

  // Handle custom date range selection
  const handleCustomSelect = (range: ReactDayPickerDateRange | undefined) => {
    if (!range?.from || !range?.to) return;

    setDateRange({ from: range.from, to: range.to });

    // Update URL with custom dates
    const params = new URLSearchParams(searchParams.toString());
    params.delete("range");
    params.set("start", range.from.toISOString().split("T")[0]!);
    params.set("end", range.to.toISOString().split("T")[0]!);

    // Navigate with transition to show loading state immediately
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
    setOpen(false);
  };

  const formatRange = (range: DateRange | undefined) => {
    if (!range?.from || !range?.to) return t("selectDateRange");

    const fromFormatted = format(range.from, "MMM d, yyyy");
    const toFormatted = format(range.to, "MMM d, yyyy");
    return `${fromFormatted} - ${toFormatted}`;
  };

  return (
    <>
      {/* Loading overlay during date range change */}
      {isPending &&
        typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-background">
            <div className="flex flex-col h-screen overflow-hidden">
              {/* Header - Full width at top */}
              <AppHeader />

              {/* Content area: Sidebar + Main */}
              <div className="flex flex-1 overflow-hidden">
                {/* Fixed Sidebar (desktop only) */}
                <AppSidebar />

                {/* Scrollable content area */}
                <main className="flex-1 overflow-y-auto bg-background">
                  <div className="flex flex-col min-h-full">
                    <div className="flex-1 p-8">
                      <div className="max-w-7xl mx-auto space-y-6">
                        {/* Hero Metrics Skeleton */}
                        <HeroMetricsSkeleton />

                        {/* Main Content Skeletons */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Large chart (2/3 width) */}
                          <div className="lg:col-span-2">
                            <SkeletonChart height="h-96" />
                          </div>
                          {/* Side widget (1/3 width) */}
                          <div>
                            <SkeletonChart height="h-64" />
                          </div>
                        </div>

                        {/* Additional full-width chart */}
                        <SkeletonChart height="h-96" />
                      </div>
                    </div>
                    <AppFooter />
                  </div>
                </main>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal min-w-[240px]",
              !dateRange && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="truncate">{formatRange(dateRange)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Presets */}
            <div className="border-r p-3 space-y-1">
              <div className="text-sm font-medium mb-2">{t("presets")}</div>
              {presetRanges.map((preset) => (
                <Button
                  key={preset.value}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handlePresetSelect(preset.days, preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Calendar */}
            <div className="p-3">
              <div className="text-sm font-medium mb-2">{t("customRange")}</div>
              <Calendar
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleCustomSelect}
                numberOfMonths={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
