import { ActivitySnapshot } from "@/domain/value-objects/ActivitySnapshot";
import { ImplementationActivity } from "@/domain/value-objects/ImplementationActivity";
import { ReviewActivity } from "@/domain/value-objects/ReviewActivity";
import { DateRange } from "@/domain/value-objects/DateRange";
import { Contributor } from "@/domain/entities/Contributor";
import { Period, Trend, TrendDirection, Comparison } from "@/domain/types";
import { Result, ok, err } from "@/lib/result";

export class ActivityAggregationService {
  /**
   * Groups activity snapshots by the specified period and sums activities within each period
   */
  static aggregateByPeriod(
    timeline: ActivitySnapshot[],
    period: Period,
  ): Result<ActivitySnapshot[]> {
    if (timeline.length === 0) {
      return ok([]);
    }

    // Group snapshots by period
    const groups = new Map<string, ActivitySnapshot[]>();

    for (const snapshot of timeline) {
      const periodKey = this.getPeriodKey(snapshot.date, period);
      const existing = groups.get(periodKey);
      if (existing) {
        existing.push(snapshot);
      } else {
        groups.set(periodKey, [snapshot]);
      }
    }

    // Aggregate each group
    const aggregated: ActivitySnapshot[] = [];

    for (const [periodKey, snapshots] of groups) {
      // Use the first date in the period as representative date
      const periodDate = snapshots[0]!.date;

      // Sum implementation activities
      let totalCommits = 0;
      let totalLinesAdded = 0;
      let totalLinesDeleted = 0;
      let totalLinesModified = 0;
      let totalFilesChanged = 0;

      // Sum review activities
      let totalPRs = 0;
      let totalReviewComments = 0;
      let totalPRsReviewed = 0;

      for (const snapshot of snapshots) {
        totalCommits += snapshot.implementationActivity.commitCount;
        totalLinesAdded += snapshot.implementationActivity.linesAdded;
        totalLinesDeleted += snapshot.implementationActivity.linesDeleted;
        totalLinesModified += snapshot.implementationActivity.linesModified;
        totalFilesChanged += snapshot.implementationActivity.filesChanged;

        totalPRs += snapshot.reviewActivity.pullRequestCount;
        totalReviewComments += snapshot.reviewActivity.reviewCommentCount;
        totalPRsReviewed += snapshot.reviewActivity.pullRequestsReviewed;
      }

      const implActivityResult = ImplementationActivity.create({
        commitCount: totalCommits,
        linesAdded: totalLinesAdded,
        linesDeleted: totalLinesDeleted,
        linesModified: totalLinesModified,
        filesChanged: totalFilesChanged,
      });

      const reviewActivityResult = ReviewActivity.create({
        pullRequestCount: totalPRs,
        reviewCommentCount: totalReviewComments,
        pullRequestsReviewed: totalPRsReviewed,
      });

      if (!implActivityResult.ok) return err(implActivityResult.error);

      if (!reviewActivityResult.ok) return err(reviewActivityResult.error);

      const snapshotResult = ActivitySnapshot.create(
        periodDate,
        period,
        implActivityResult.value,
        reviewActivityResult.value,
      );

      if (!snapshotResult.ok) return err(snapshotResult.error);

      aggregated.push(snapshotResult.value);
    }

    // Sort by date
    aggregated.sort((a, b) => a.date.getTime() - b.date.getTime());

    return ok(aggregated);
  }

  /**
   * Calculates activity trends using linear regression
   */
  static calculateTrends(timeline: ActivitySnapshot[]): Result<Trend> {
    if (timeline.length === 0) {
      return err(new Error("Cannot calculate trends from empty timeline"));
    }

    if (timeline.length === 1) {
      return ok({
        direction: TrendDirection.STABLE,
        velocity: 0,
      });
    }

    // Extract activity scores over time
    const dataPoints = timeline.map((snapshot, index) => ({
      x: index, // Time index
      y:
        snapshot.implementationActivity.activityScore +
        snapshot.reviewActivity.reviewScore,
    }));

    // Calculate linear regression: y = mx + b
    const n = dataPoints.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (const point of dataPoints) {
      sumX += point.x;
      sumY += point.y;
      sumXY += point.x * point.y;
      sumXX += point.x * point.x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Determine direction based on slope
    const threshold = 0.01; // Threshold for considering stable
    let direction: TrendDirection;

    if (Math.abs(slope) < threshold) {
      direction = TrendDirection.STABLE;
    } else if (slope > 0) {
      direction = TrendDirection.INCREASING;
    } else {
      direction = TrendDirection.DECREASING;
    }

    return ok({
      direction,
      velocity: slope,
    });
  }

  /**
   * Compares activity between two periods
   */
  static comparePeriods(
    current: DateRange,
    previous: DateRange,
    contributors: Contributor[],
  ): Result<Comparison> {
    // Calculate total activity for each period
    let currentTotal = 0;
    let previousTotal = 0;

    const contributorChanges: Map<
      string,
      { current: number; previous: number }
    > = new Map();

    for (const contributor of contributors) {
      let contributorCurrent = 0;
      let contributorPrevious = 0;

      for (const snapshot of contributor.activityTimeline) {
        const snapshotDate = snapshot.date;
        const score =
          snapshot.implementationActivity.activityScore +
          snapshot.reviewActivity.reviewScore;

        if (snapshotDate >= current.start && snapshotDate <= current.end) {
          contributorCurrent += score;
          currentTotal += score;
        } else if (
          snapshotDate >= previous.start &&
          snapshotDate <= previous.end
        ) {
          contributorPrevious += score;
          previousTotal += score;
        }
      }

      contributorChanges.set(contributor.id, {
        current: contributorCurrent,
        previous: contributorPrevious,
      });
    }

    // Calculate percentage change
    const percentageChange =
      previousTotal === 0
        ? currentTotal > 0
          ? 100
          : 0
        : ((currentTotal - previousTotal) / previousTotal) * 100;

    // Identify top movers (biggest absolute changes)
    const movers = Array.from(contributorChanges.entries())
      .map(([id, { current, previous }]) => ({
        id,
        change: current - previous,
      }))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 5); // Top 5 movers

    return ok({
      currentTotal,
      previousTotal,
      percentageChange,
      topMovers: movers,
    });
  }

  /**
   * Helper: Get period key for grouping
   */
  private static getPeriodKey(date: Date, period: Period): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    switch (period) {
      case Period.DAY:
        return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      case Period.WEEK:
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        return `${weekStart.getFullYear()}-W${this.getWeekNumber(weekStart)}`;
      case Period.MONTH:
        return `${year}-${String(month + 1).padStart(2, "0")}`;
      default:
        return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  /**
   * Helper: Get ISO week number
   */
  private static getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
