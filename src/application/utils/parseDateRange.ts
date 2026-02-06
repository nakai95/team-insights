import { DateRange } from "@/domain/value-objects/DateRange";
import { DateRangePreset } from "@/domain/types/DateRangePreset";
import { Result, ok, err } from "@/lib/result";

export interface ParsedDateRange {
  range: DateRange;
  preset?: string;
}

/**
 * Parse date range from URL parameters
 *
 * Supports two formats:
 * 1. Preset: ?preset=last_30_days
 * 2. Custom: ?startDate=2024-01-01&endDate=2024-12-31
 *
 * @param searchParams - URL search params from Next.js
 * @returns Result containing DateRange or error message
 */
export function parseDateRange(
  searchParams:
    | URLSearchParams
    | { [key: string]: string | string[] | undefined },
): Result<ParsedDateRange> {
  // Convert to URLSearchParams if needed
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(
          Object.entries(searchParams)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, String(value)]),
        );

  // Check for preset parameter
  const preset = params.get("preset");
  if (preset) {
    return parseDateRangeFromPreset(preset);
  }

  // Check for custom date range
  const startDateStr = params.get("startDate");
  const endDateStr = params.get("endDate");

  if (startDateStr && endDateStr) {
    return parseDateRangeFromDates(startDateStr, endDateStr);
  }

  // No date range specified, use default (last 30 days)
  return ok({
    range: DateRange.last30Days(),
    preset: DateRangePreset.LAST_30_DAYS,
  });
}

/**
 * Parse date range from preset string
 */
function parseDateRangeFromPreset(preset: string): Result<ParsedDateRange> {
  let range: DateRange;

  switch (preset) {
    case DateRangePreset.LAST_7_DAYS:
      range = DateRange.last7Days();
      break;
    case DateRangePreset.LAST_30_DAYS:
      range = DateRange.last30Days();
      break;
    case DateRangePreset.LAST_90_DAYS:
      range = DateRange.last90Days();
      break;
    case DateRangePreset.LAST_6_MONTHS:
      range = DateRange.last6Months();
      break;
    case DateRangePreset.LAST_YEAR:
      range = DateRange.lastYear();
      break;
    case DateRangePreset.CUSTOM:
      return err(
        new Error("Custom preset requires startDate and endDate parameters"),
      );
    default:
      return err(
        new Error(
          `Invalid preset: ${preset}. Valid values: ${Object.values(DateRangePreset).join(", ")}`,
        ),
      );
  }

  return ok({ range, preset });
}

/**
 * Parse date range from ISO date strings
 */
function parseDateRangeFromDates(
  startDateStr: string,
  endDateStr: string,
): Result<ParsedDateRange> {
  // Parse dates
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  // Validate dates are valid
  if (isNaN(startDate.getTime())) {
    return err(new Error(`Invalid start date: ${startDateStr}`));
  }

  if (isNaN(endDate.getTime())) {
    return err(new Error(`Invalid end date: ${endDateStr}`));
  }

  // Create DateRange (will validate range constraints)
  const rangeResult = DateRange.create(startDate, endDate);

  if (!rangeResult.ok) {
    return err(rangeResult.error);
  }

  return ok({
    range: rangeResult.value,
    preset: DateRangePreset.CUSTOM,
  });
}

/**
 * Format date range for URL parameters
 *
 * @param range - DateRange to format
 * @param preset - Optional preset name (if using preset)
 * @returns URL search params string
 */
export function formatDateRangeForURL(
  range: DateRange,
  preset?: string,
): string {
  const params = new URLSearchParams();

  if (preset && preset !== DateRangePreset.CUSTOM) {
    params.set("preset", preset);
  } else {
    // Use ISO date strings for custom ranges (YYYY-MM-DD format)
    const startDateStr = range.start.toISOString().split("T")[0];
    const endDateStr = range.end.toISOString().split("T")[0];

    if (startDateStr && endDateStr) {
      params.set("startDate", startDateStr);
      params.set("endDate", endDateStr);
    }
  }

  return params.toString();
}
