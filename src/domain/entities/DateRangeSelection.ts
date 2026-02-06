import { type Result, ok, err } from "@/lib/result";
import { DateRange } from "@/domain/value-objects/DateRange";
import {
  type DateRangePreset,
  DateRangePreset as DateRangePresetEnum,
} from "@/domain/types/DateRangePreset";
import {
  type CacheStatus,
  CacheStatus as CacheStatusEnum,
} from "@/domain/types/CacheStatus";

/**
 * DateRangeSelection entity
 *
 * Represents user's selected time period for data visualization with cache availability metadata.
 *
 * Properties:
 * - range: Start and end dates
 * - preset: Preset type if selected (Last7Days, Last30Days, etc.)
 * - cacheStatus: Cache hit/miss/stale indicator
 * - lastUpdated: When cached data was last refreshed (optional)
 *
 * Validation rules:
 * - If preset is set, range must match preset definition
 * - lastUpdated must be in the past (≤ now)
 * - cacheStatus must be "miss" if lastUpdated is null
 *
 * Invariants:
 * - preset and range must stay synchronized (changing preset updates range)
 * - cacheStatus recomputed on every access based on TTL
 */
export class DateRangeSelection {
  private constructor(
    public readonly range: DateRange,
    public readonly preset: DateRangePreset | null,
    public readonly cacheStatus: CacheStatus,
    public readonly lastUpdated: Date | null,
  ) {}

  /**
   * Create DateRangeSelection from a preset
   *
   * @param preset - Date range preset
   * @returns DateRangeSelection with status MISS (no cache check yet)
   */
  static fromPreset(preset: DateRangePreset): DateRangeSelection {
    let range: DateRange;

    switch (preset) {
      case DateRangePresetEnum.LAST_7_DAYS:
        range = DateRange.last7Days();
        break;
      case DateRangePresetEnum.LAST_30_DAYS:
        range = DateRange.last30Days();
        break;
      case DateRangePresetEnum.LAST_90_DAYS:
        range = DateRange.last90Days();
        break;
      case DateRangePresetEnum.LAST_6_MONTHS:
        range = DateRange.last6Months();
        break;
      case DateRangePresetEnum.LAST_YEAR:
        range = DateRange.lastYear();
        break;
      case DateRangePresetEnum.CUSTOM:
        // For CUSTOM preset, caller must use fromCustomRange instead
        throw new Error(
          "Cannot create DateRangeSelection from CUSTOM preset. Use fromCustomRange() instead.",
        );
      default:
        throw new Error(`Unknown preset: ${preset}`);
    }

    return new DateRangeSelection(
      range,
      preset,
      CacheStatusEnum.MISS, // Initial status before cache check
      null, // No last update yet
    );
  }

  /**
   * Create DateRangeSelection from custom range
   *
   * @param start - Start date
   * @param end - End date
   * @returns Result with DateRangeSelection or error
   */
  static fromCustomRange(
    start: Date,
    end: Date,
  ): Result<DateRangeSelection, string> {
    const rangeResult = DateRange.create(start, end);
    if (!rangeResult.ok) {
      return err(rangeResult.error.message);
    }

    return ok(
      new DateRangeSelection(
        rangeResult.value,
        DateRangePresetEnum.CUSTOM,
        CacheStatusEnum.MISS, // Initial status before cache check
        null, // No last update yet
      ),
    ) as Result<DateRangeSelection, string>;
  }

  /**
   * Update cache status metadata
   *
   * @param status - New cache status
   * @param lastUpdated - When cached data was last refreshed (optional)
   * @returns New DateRangeSelection with updated cache metadata
   */
  withCacheStatus(
    status: CacheStatus,
    lastUpdated?: Date,
  ): Result<DateRangeSelection, string> {
    // Validate lastUpdated is in the past
    if (lastUpdated && lastUpdated > new Date()) {
      return err("lastUpdated must not be in the future");
    }

    // Validate cacheStatus consistency
    if (status === CacheStatusEnum.MISS && lastUpdated !== undefined) {
      return err('cacheStatus "miss" requires lastUpdated to be null');
    }

    if (
      (status === CacheStatusEnum.HIT_FRESH ||
        status === CacheStatusEnum.HIT_STALE ||
        status === CacheStatusEnum.REVALIDATING) &&
      !lastUpdated
    ) {
      return err(`cacheStatus "${status}" requires lastUpdated to be provided`);
    }

    return ok(
      new DateRangeSelection(
        this.range,
        this.preset,
        status,
        lastUpdated ?? null,
      ),
    ) as Result<DateRangeSelection, string>;
  }

  /**
   * Check if the selected range matches the preset definition
   *
   * Useful for validation after date arithmetic operations
   *
   * @returns true if preset and range are synchronized
   */
  isPresetMatching(): boolean {
    if (!this.preset || this.preset === DateRangePresetEnum.CUSTOM) {
      return true; // Custom ranges don't have a preset to match
    }

    // Get expected range for the preset
    const expectedRange = DateRangeSelection.fromPreset(this.preset).range;

    // Allow 1-second tolerance due to timestamp precision
    const tolerance = 1000; // 1 second in milliseconds
    const startDiff = Math.abs(
      this.range.start.getTime() - expectedRange.start.getTime(),
    );
    const endDiff = Math.abs(
      this.range.end.getTime() - expectedRange.end.getTime(),
    );

    return startDiff <= tolerance && endDiff <= tolerance;
  }

  /**
   * Check if cached data is fresh (not stale)
   *
   * @param ttlMs - Time-to-live in milliseconds
   * @returns true if lastUpdated + ttlMs > now
   */
  isCacheFresh(ttlMs: number): boolean {
    if (!this.lastUpdated) {
      return false; // No cached data
    }

    if (this.cacheStatus === CacheStatusEnum.MISS) {
      return false; // Explicit miss
    }

    const now = new Date();
    const expirationTime = this.lastUpdated.getTime() + ttlMs;

    return now.getTime() < expirationTime;
  }

  /**
   * Get cache age in milliseconds
   *
   * @returns Age of cached data, or null if no cached data
   */
  getCacheAge(): number | null {
    if (!this.lastUpdated) {
      return null;
    }

    const now = new Date();
    return now.getTime() - this.lastUpdated.getTime();
  }

  /**
   * Create a new DateRangeSelection with different preset
   *
   * @param newPreset - New preset to apply
   * @returns New DateRangeSelection with updated preset and range
   */
  changePreset(newPreset: DateRangePreset): DateRangeSelection {
    if (newPreset === DateRangePresetEnum.CUSTOM) {
      throw new Error(
        "Cannot change to CUSTOM preset. Use fromCustomRange() instead.",
      );
    }

    // Create new selection from preset (resets cache status)
    return DateRangeSelection.fromPreset(newPreset);
  }
}
