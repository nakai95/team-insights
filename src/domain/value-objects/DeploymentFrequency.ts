/**
 * DeploymentFrequency Value Object
 *
 * Aggregates deployment events by week and month, calculates averages,
 * and provides annualized deployment frequency for DORA classification.
 *
 * Immutable - all properties are readonly.
 */

import { DeploymentEvent } from "./DeploymentEvent";
import { format } from "date-fns";

export interface WeeklyDeploymentData {
  weekKey: string; // ISO 8601 week (e.g., "2024-W03")
  weekStartDate: string; // ISO 8601 date (e.g., "2024-01-15")
  deploymentCount: number;
}

export interface MonthlyDeploymentData {
  monthKey: string; // ISO 8601 month (e.g., "2024-01")
  monthName: string; // Human-readable (e.g., "January 2024")
  deploymentCount: number;
}

export class DeploymentFrequency {
  private constructor(
    readonly events: readonly DeploymentEvent[],
    readonly weeklyData: readonly WeeklyDeploymentData[],
    readonly monthlyData: readonly MonthlyDeploymentData[],
    readonly totalCount: number,
    readonly averagePerWeek: number,
    readonly averagePerMonth: number,
    readonly periodDays: number,
    readonly deploymentsPerYear: number,
  ) {
    // Validation
    if (totalCount < 0) {
      throw new Error("DeploymentFrequency: totalCount must be non-negative");
    }
    if (periodDays < 0) {
      throw new Error("DeploymentFrequency: periodDays must be non-negative");
    }
  }

  /**
   * Create DeploymentFrequency from a list of deployment events
   */
  static create(events: DeploymentEvent[]): DeploymentFrequency {
    if (events.length === 0) {
      return new DeploymentFrequency([], [], [], 0, 0, 0, 0, 0);
    }

    // Sort events by timestamp (newest first)
    const sortedEvents = [...events].sort(DeploymentEvent.compareByTimestamp);

    // Calculate period days
    const oldestEvent = sortedEvents[sortedEvents.length - 1]!;
    const newestEvent = sortedEvents[0]!;
    const periodDays = Math.max(
      1,
      Math.ceil(
        (newestEvent.timestamp.getTime() - oldestEvent.timestamp.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    // Aggregate by week
    const weeklyMap = new Map<string, number>();
    const weekStartMap = new Map<string, Date>();

    for (const event of sortedEvents) {
      const weekKey = event.getWeekKey();
      weeklyMap.set(weekKey, (weeklyMap.get(weekKey) ?? 0) + 1);
      if (!weekStartMap.has(weekKey)) {
        weekStartMap.set(weekKey, event.getWeekStartDate());
      }
    }

    const weeklyData: WeeklyDeploymentData[] = Array.from(weeklyMap.entries())
      .map(([weekKey, count]) => ({
        weekKey,
        weekStartDate: format(weekStartMap.get(weekKey)!, "yyyy-MM-dd"),
        deploymentCount: count,
      }))
      .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate)); // Chronological order

    // Aggregate by month
    const monthlyMap = new Map<string, number>();

    for (const event of sortedEvents) {
      const monthKey = event.getMonthKey();
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + 1);
    }

    const monthlyData: MonthlyDeploymentData[] = Array.from(
      monthlyMap.entries(),
    )
      .map(([monthKey, count]) => ({
        monthKey,
        monthName: format(new Date(monthKey + "-01"), "MMMM yyyy"), // "January 2024"
        deploymentCount: count,
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey)); // Chronological order

    // Calculate averages
    const totalCount = sortedEvents.length;
    const averagePerWeek = totalCount / (periodDays / 7);
    const averagePerMonth = totalCount / (periodDays / 30.44); // Average month length
    const deploymentsPerYear = (totalCount / periodDays) * 365;

    return new DeploymentFrequency(
      sortedEvents,
      weeklyData,
      monthlyData,
      totalCount,
      averagePerWeek,
      averagePerMonth,
      periodDays,
      deploymentsPerYear,
    );
  }

  /**
   * Get weekly deployment count for a specific week
   */
  getWeeklyCount(weekKey: string): number {
    const week = this.weeklyData.find((w) => w.weekKey === weekKey);
    return week?.deploymentCount ?? 0;
  }

  /**
   * Get monthly deployment count for a specific month
   */
  getMonthlyCount(monthKey: string): number {
    const month = this.monthlyData.find((m) => m.monthKey === monthKey);
    return month?.deploymentCount ?? 0;
  }

  /**
   * Get most recent deployments (up to N)
   */
  getRecentDeployments(count: number): readonly DeploymentEvent[] {
    return this.events.slice(0, count);
  }

  /**
   * Filter events by date range
   */
  filterByDateRange(startDate?: Date, endDate?: Date): DeploymentFrequency {
    const filtered = this.events.filter((event) =>
      event.isWithinRange(startDate, endDate),
    );
    return DeploymentFrequency.create([...filtered]);
  }
}
