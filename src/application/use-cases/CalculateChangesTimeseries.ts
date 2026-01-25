import { PullRequest } from "@/domain/interfaces/IGitHubRepository";
import { WeeklyAggregate } from "@/domain/value-objects/WeeklyAggregate";
import { ChangeTrend } from "@/domain/value-objects/ChangeTrend";
import { OutlierWeek } from "@/domain/value-objects/OutlierWeek";
import {
  TimeseriesResult,
  createTimeseriesResult,
} from "@/application/dto/TimeseriesResult";

/**
 * Calculate PR Changes Timeseries Use Case
 *
 * Analyzes pull request data to calculate weekly timeseries metrics including:
 * - Weekly aggregated code changes (additions/deletions/PR count)
 * - Trend analysis (increasing/decreasing/stable)
 * - Outlier week detection (statistical anomalies)
 * - Summary statistics
 *
 * This use case orchestrates the timeseries analysis by:
 * 1. Filtering merged PRs with valid change metrics
 * 2. Grouping PRs by ISO week (Monday-Sunday)
 * 3. Creating WeeklyAggregate instances for each week
 * 4. Analyzing trends (if >= 4 weeks of data)
 * 5. Detecting outlier weeks (statistical anomalies)
 * 6. Converting domain objects to presentation-friendly DTO
 */
export class CalculateChangesTimeseries {
  /**
   * Execute the changes timeseries calculation
   *
   * @param pullRequests - Array of pull requests (must include mergedAt, additions, deletions, changedFiles)
   * @returns TimeseriesResult DTO
   */
  execute(pullRequests: PullRequest[]): TimeseriesResult {
    // Filter to merged PRs with valid data
    const mergedPRs = pullRequests.filter(
      (pr) =>
        pr.mergedAt &&
        pr.additions !== undefined &&
        pr.deletions !== undefined &&
        pr.changedFiles !== undefined,
    );

    // If no merged PRs, return empty result
    if (mergedPRs.length === 0) {
      return createTimeseriesResult([], null, []);
    }

    // Group PRs by ISO week
    const weeklyMap = new Map<string, PullRequest[]>();

    for (const pr of mergedPRs) {
      if (!pr.mergedAt) continue; // Type guard (already filtered, but TypeScript needs this)

      const weekStart = WeeklyAggregate.getWeekStart(pr.mergedAt);
      const weekKey = weekStart.toISOString();

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, []);
      }
      weeklyMap.get(weekKey)!.push(pr);
    }

    // Create WeeklyAggregate instances for each week (chronological order)
    const weeklyData: WeeklyAggregate[] = [];
    const sortedWeekStarts = Array.from(weeklyMap.keys()).sort();

    for (const weekKey of sortedWeekStarts) {
      const weekStart = new Date(weekKey);
      const prs = weeklyMap.get(weekKey)!;
      const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);
      weeklyData.push(aggregate);
    }

    // Calculate trend if sufficient data (>= 4 weeks)
    let trend: ChangeTrend | null = null;
    if (weeklyData.length >= 4) {
      try {
        const weeklyTotals = weeklyData.map((w) => w.totalChanges);
        trend = ChangeTrend.analyze(weeklyTotals);
      } catch (error) {
        // Insufficient data or other error - trend remains null
        trend = null;
      }
    }

    // Detect outlier weeks
    const outlierWeeks = OutlierWeek.detect(weeklyData);

    // Create and return DTO
    return createTimeseriesResult(weeklyData, trend, outlierWeeks);
  }
}
