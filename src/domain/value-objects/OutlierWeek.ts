import { WeeklyAggregate } from "./WeeklyAggregate";

/**
 * OutlierWeek Value Object
 *
 * Represents a week identified as having abnormally high code changes
 * based on statistical analysis (z-score threshold).
 */
export class OutlierWeek {
  private constructor(
    public readonly weekStart: Date,
    public readonly totalChanges: number,
    public readonly prCount: number,
    public readonly zScore: number,
    public readonly meanValue: number,
    public readonly stdDeviation: number,
  ) {}

  /**
   * Detect outlier weeks from weekly aggregates
   * Only detects high outliers (values exceeding mean + threshold * σ)
   *
   * @param weeklyData Array of weekly aggregates
   * @param threshold Number of standard deviations (default: 2.0)
   * @returns Array of OutlierWeek instances
   */
  static detect(
    weeklyData: WeeklyAggregate[],
    threshold: number = 2.0,
  ): OutlierWeek[] {
    // Require at least 4 weeks for statistical significance
    if (weeklyData.length < 4) {
      return [];
    }

    // Calculate mean
    const totals = weeklyData.map((w) => w.totalChanges);
    const mean = totals.reduce((sum, val) => sum + val, 0) / totals.length;

    // Calculate standard deviation
    const squaredDiffs = totals.map((val) => Math.pow(val - mean, 2));
    const variance =
      squaredDiffs.reduce((sum, val) => sum + val, 0) / totals.length;
    const stdDev = Math.sqrt(variance);

    // If standard deviation is 0, all values are identical (no outliers)
    if (stdDev === 0) {
      return [];
    }

    // Detect high outliers (> mean + threshold * σ)
    const outliers: OutlierWeek[] = [];
    const upperBound = mean + threshold * stdDev;

    for (const week of weeklyData) {
      if (week.totalChanges > upperBound) {
        const zScore = (week.totalChanges - mean) / stdDev;
        outliers.push(
          new OutlierWeek(
            week.weekStart,
            week.totalChanges,
            week.prCount,
            zScore,
            mean,
            stdDev,
          ),
        );
      }
    }

    return outliers;
  }
}
