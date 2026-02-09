"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange as ReactDayPickerDateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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

    router.push(`?${params.toString()}`);
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

    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  const formatRange = (range: DateRange | undefined) => {
    if (!range?.from || !range?.to) return t("selectDateRange");

    const fromFormatted = format(range.from, "MMM d, yyyy");
    const toFormatted = format(range.to, "MMM d, yyyy");
    return `${fromFormatted} - ${toFormatted}`;
  };

  return (
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
  );
}
