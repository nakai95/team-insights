"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange as DateRangeType } from "react-day-picker";
import { format } from "date-fns";

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
import { DateRange } from "@/domain/value-objects/DateRange";
import { DateRangePreset } from "@/domain/types/DateRangePreset";

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const presetOptions = [
  { label: "Last 7 days", value: DateRangePreset.LAST_7_DAYS },
  { label: "Last 30 days", value: DateRangePreset.LAST_30_DAYS },
  { label: "Last 90 days", value: DateRangePreset.LAST_90_DAYS },
  { label: "Last 6 months", value: DateRangePreset.LAST_6_MONTHS },
  { label: "Last 1 year", value: DateRangePreset.LAST_YEAR },
  { label: "Custom range", value: DateRangePreset.CUSTOM },
];

function getPresetFromDateRange(range: DateRange): string {
  // Compare with preset ranges to determine if it matches a preset
  const last7 = DateRange.last7Days();
  const last30 = DateRange.last30Days();
  const last90 = DateRange.last90Days();
  const last6Months = DateRange.last6Months();
  const lastYear = DateRange.lastYear();

  // Check with a small tolerance (1 day) to account for timing differences
  const tolerance = 24 * 60 * 60 * 1000; // 1 day in milliseconds

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

export function DateRangeSelector({
  value,
  onChange,
  className,
}: DateRangeSelectorProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<string>(() =>
    getPresetFromDateRange(value),
  );
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [customDateRange, setCustomDateRange] = React.useState<
    DateRangeType | undefined
  >(
    selectedPreset === DateRangePreset.CUSTOM
      ? { from: value.start, to: value.end }
      : undefined,
  );

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);

    if (preset === DateRangePreset.CUSTOM) {
      setIsCalendarOpen(true);
      return;
    }

    // Create date range based on preset
    let newRange: DateRange;
    switch (preset) {
      case DateRangePreset.LAST_7_DAYS:
        newRange = DateRange.last7Days();
        break;
      case DateRangePreset.LAST_30_DAYS:
        newRange = DateRange.last30Days();
        break;
      case DateRangePreset.LAST_90_DAYS:
        newRange = DateRange.last90Days();
        break;
      case DateRangePreset.LAST_6_MONTHS:
        newRange = DateRange.last6Months();
        break;
      case DateRangePreset.LAST_YEAR:
        newRange = DateRange.lastYear();
        break;
      default:
        return;
    }

    onChange(newRange);
  };

  const handleCustomDateRangeChange = (range: DateRangeType | undefined) => {
    setCustomDateRange(range);

    if (range?.from && range?.to) {
      const result = DateRange.create(range.from, range.to);
      if (result.ok) {
        onChange(result.value);
        setIsCalendarOpen(false);
      }
    }
  };

  const displayText =
    selectedPreset === DateRangePreset.CUSTOM &&
    customDateRange?.from &&
    customDateRange?.to
      ? `${format(customDateRange.from, "MMM d, yyyy")} - ${format(customDateRange.to, "MMM d, yyyy")}`
      : presetOptions.find((opt) => opt.value === selectedPreset)?.label ||
        "Select date range";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center",
        className,
      )}
    >
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

      {selectedPreset === DateRangePreset.CUSTOM && (
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

      {selectedPreset !== DateRangePreset.CUSTOM && (
        <div className="text-sm text-muted-foreground">
          {format(value.start, "MMM d, yyyy")} -{" "}
          {format(value.end, "MMM d, yyyy")}
        </div>
      )}
    </div>
  );
}
