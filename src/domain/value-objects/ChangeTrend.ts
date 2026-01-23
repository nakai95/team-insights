/**
 * TrendDirection Enum
 *
 * Represents the directional trend of code changes.
 * Uses constant object pattern for type safety.
 */
export const TrendDirection = {
  INCREASING: "increasing",
  DECREASING: "decreasing",
  STABLE: "stable",
} as const;
export type TrendDirection =
  (typeof TrendDirection)[keyof typeof TrendDirection];

/**
 * ChangeTrend Value Object
 *
 * Represents the directional trend of code changes over a time period.
 * Typically analyzes the most recent 4 weeks.
 */
export class ChangeTrend {
  private constructor(
    public readonly direction: TrendDirection,
    public readonly percentChange: number,
    public readonly analyzedWeeks: number,
    public readonly startValue: number,
    public readonly endValue: number,
  ) {}

  /**
   * Analyze trend from weekly total changes
   * Compares average of first half vs second half of period
   *
   * @param weeklyTotals Array of weekly total changes (chronological order)
   * @returns ChangeTrend instance
   * @throws Error if fewer than 4 weeks of data
   */
  static analyze(weeklyTotals: number[]): ChangeTrend {
    if (weeklyTotals.length < 4) {
      throw new Error(
        "Insufficient data for trend analysis: requires at least 4 weeks",
      );
    }

    const analyzedWeeks = weeklyTotals.length;

    // Split into first half and second half
    const midpoint = Math.floor(analyzedWeeks / 2);
    const firstHalf = weeklyTotals.slice(0, midpoint);
    const secondHalf = weeklyTotals.slice(midpoint);

    // Calculate averages
    const startValue =
      firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const endValue =
      secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    // Calculate percent change
    const rawChange = endValue - startValue;
    const percentChange =
      startValue > 0 ? Math.abs(rawChange / startValue) * 100 : 0;

    // Determine direction based on 10% threshold
    const STABLE_THRESHOLD = 10; // 10%
    let direction: TrendDirection;

    if (rawChange >= 0 && percentChange >= STABLE_THRESHOLD) {
      direction = TrendDirection.INCREASING;
    } else if (rawChange < 0 && percentChange >= STABLE_THRESHOLD) {
      direction = TrendDirection.DECREASING;
    } else {
      direction = TrendDirection.STABLE;
    }

    return new ChangeTrend(
      direction,
      percentChange,
      analyzedWeeks,
      startValue,
      endValue,
    );
  }
}
