import { PullRequest } from "@/domain/interfaces/IGitHubRepository";

/**
 * WeeklyAggregate Value Object
 *
 * Represents aggregated PR change metrics for a single calendar week (Monday-Sunday).
 * Uses ISO 8601 week definition (Monday start).
 */
export class WeeklyAggregate {
  private constructor(
    public readonly weekStart: Date,
    public readonly weekEnd: Date,
    public readonly additions: number,
    public readonly deletions: number,
    public readonly totalChanges: number,
    public readonly netChange: number,
    public readonly prCount: number,
    public readonly averagePRSize: number,
    public readonly changedFilesTotal: number,
  ) {}

  /**
   * Create a WeeklyAggregate from a list of PRs merged in a given week
   * @param weekStart Monday (00:00:00) of the week
   * @param prs Array of merged pull requests
   * @returns WeeklyAggregate instance
   * @throws Error if weekStart is not a Monday
   */
  static fromPRs(weekStart: Date, prs: PullRequest[]): WeeklyAggregate {
    // Validate weekStart is Monday
    if (weekStart.getDay() !== 1) {
      throw new Error("weekStart must be a Monday (ISO week definition)");
    }

    // Calculate week boundaries
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Normalize weekStart to start of day
    const normalizedWeekStart = new Date(weekStart);
    normalizedWeekStart.setHours(0, 0, 0, 0);

    // Filter PRs to this week and exclude PRs with missing data
    const weekPRs = prs.filter((pr) => {
      if (!pr.mergedAt) return false;
      if (
        pr.additions === undefined ||
        pr.deletions === undefined ||
        pr.changedFiles === undefined
      )
        return false;

      const mergedDate = pr.mergedAt;
      return mergedDate >= normalizedWeekStart && mergedDate <= weekEnd;
    });

    // Aggregate metrics
    const additions = weekPRs.reduce((sum, pr) => sum + (pr.additions ?? 0), 0);
    const deletions = weekPRs.reduce((sum, pr) => sum + (pr.deletions ?? 0), 0);
    const changedFilesTotal = weekPRs.reduce(
      (sum, pr) => sum + (pr.changedFiles ?? 0),
      0,
    );

    const totalChanges = additions + deletions;
    const netChange = additions - deletions;
    const prCount = weekPRs.length;
    const averagePRSize = prCount > 0 ? totalChanges / prCount : 0;

    return new WeeklyAggregate(
      normalizedWeekStart,
      weekEnd,
      additions,
      deletions,
      totalChanges,
      netChange,
      prCount,
      averagePRSize,
      changedFilesTotal,
    );
  }

  /**
   * Get the Monday (00:00:00) of the week containing the given date
   * Uses ISO 8601 week definition (Monday start)
   * @param date Any date
   * @returns Monday of that week (start of day)
   */
  static getWeekStart(date: Date): Date {
    const dayOfWeek = date.getDay();
    const monday = new Date(date);

    // If Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    monday.setDate(monday.getDate() - daysToSubtract);
    monday.setHours(0, 0, 0, 0);

    return monday;
  }
}
