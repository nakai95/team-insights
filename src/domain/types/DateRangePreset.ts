/**
 * DateRangePreset enum using string literal pattern
 *
 * Predefined date range options for UI selection.
 *
 * @example
 * const preset = DateRangePreset.LAST_30_DAYS;
 * const range = DateRange.fromPreset(preset);
 */
export const DateRangePreset = {
  LAST_7_DAYS: "last_7_days",
  LAST_30_DAYS: "last_30_days",
  LAST_90_DAYS: "last_90_days",
  LAST_6_MONTHS: "last_6_months",
  LAST_YEAR: "last_year",
  CUSTOM: "custom",
} as const;

export type DateRangePreset =
  (typeof DateRangePreset)[keyof typeof DateRangePreset];
