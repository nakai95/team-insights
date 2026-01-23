import { WeeklyAggregate } from "@/domain/value-objects/WeeklyAggregate";
import {
  ChangeTrend,
  TrendDirection,
} from "@/domain/value-objects/ChangeTrend";
import { OutlierWeek } from "@/domain/value-objects/OutlierWeek";

/**
 * Plain object representation of WeeklyAggregate for serialization
 */
export interface WeeklyAggregateDto {
  weekStart: string; // ISO 8601 date string
  weekEnd: string; // ISO 8601 date string
  additions: number;
  deletions: number;
  totalChanges: number;
  netChange: number;
  prCount: number;
  averagePRSize: number;
  changedFilesTotal: number;
}

/**
 * Plain object representation of ChangeTrend for serialization
 */
export interface ChangeTrendDto {
  direction: TrendDirection;
  percentChange: number;
  analyzedWeeks: number;
  startValue: number;
  endValue: number;
}

/**
 * Plain object representation of OutlierWeek for serialization
 */
export interface OutlierWeekDto {
  weekStart: string; // ISO 8601 date string
  totalChanges: number;
  prCount: number;
  zScore: number;
  meanValue: number;
  stdDeviation: number;
}

/**
 * Summary statistics across entire timeseries period
 */
export interface TimeseriesSummary {
  totalPRs: number; // Sum of prCount across all weeks
  totalAdditions: number; // Sum of additions across all weeks
  totalDeletions: number; // Sum of deletions across all weeks
  averageWeeklyChanges: number; // Mean of totalChanges across all weeks
  averagePRSize: number; // totalChanges / totalPRs
  weeksAnalyzed: number; // Number of weeks in dataset
}

/**
 * DTO for PR Changes Timeseries Analysis results
 * Maps domain value objects to presentation-friendly structure
 * All nested objects are plain objects (not class instances) for Next.js serialization
 */
export interface TimeseriesResult {
  weeklyData: WeeklyAggregateDto[];
  trend: ChangeTrendDto | null; // null if insufficient data (< 4 weeks)
  outlierWeeks: OutlierWeekDto[];
  summary: TimeseriesSummary;
}

/**
 * Convert WeeklyAggregate to plain object
 */
function weeklyAggregateToDto(week: WeeklyAggregate): WeeklyAggregateDto {
  return {
    weekStart: week.weekStart.toISOString(),
    weekEnd: week.weekEnd.toISOString(),
    additions: week.additions,
    deletions: week.deletions,
    totalChanges: week.totalChanges,
    netChange: week.netChange,
    prCount: week.prCount,
    averagePRSize: week.averagePRSize,
    changedFilesTotal: week.changedFilesTotal,
  };
}

/**
 * Convert ChangeTrend to plain object
 */
function changeTrendToDto(trend: ChangeTrend): ChangeTrendDto {
  return {
    direction: trend.direction,
    percentChange: trend.percentChange,
    analyzedWeeks: trend.analyzedWeeks,
    startValue: trend.startValue,
    endValue: trend.endValue,
  };
}

/**
 * Convert OutlierWeek to plain object
 */
function outlierWeekToDto(outlier: OutlierWeek): OutlierWeekDto {
  return {
    weekStart: outlier.weekStart.toISOString(),
    totalChanges: outlier.totalChanges,
    prCount: outlier.prCount,
    zScore: outlier.zScore,
    meanValue: outlier.meanValue,
    stdDeviation: outlier.stdDeviation,
  };
}

/**
 * Calculate summary statistics from weekly data
 */
function calculateSummary(weeklyData: WeeklyAggregate[]): TimeseriesSummary {
  const totalPRs = weeklyData.reduce((sum, week) => sum + week.prCount, 0);
  const totalAdditions = weeklyData.reduce(
    (sum, week) => sum + week.additions,
    0,
  );
  const totalDeletions = weeklyData.reduce(
    (sum, week) => sum + week.deletions,
    0,
  );
  const totalChanges = weeklyData.reduce(
    (sum, week) => sum + week.totalChanges,
    0,
  );

  const averageWeeklyChanges =
    weeklyData.length > 0 ? totalChanges / weeklyData.length : 0;
  const averagePRSize = totalPRs > 0 ? totalChanges / totalPRs : 0;

  return {
    totalPRs,
    totalAdditions,
    totalDeletions,
    averageWeeklyChanges,
    averagePRSize,
    weeksAnalyzed: weeklyData.length,
  };
}

/**
 * Create TimeseriesResult from domain value objects
 * Converts all class instances to plain objects for Next.js serialization
 *
 * @param weeklyData Array of WeeklyAggregate instances (chronological order)
 * @param trend ChangeTrend instance or null if insufficient data
 * @param outlierWeeks Array of OutlierWeek instances
 * @returns TimeseriesResult DTO
 */
export function createTimeseriesResult(
  weeklyData: WeeklyAggregate[],
  trend: ChangeTrend | null,
  outlierWeeks: OutlierWeek[],
): TimeseriesResult {
  return {
    weeklyData: weeklyData.map(weeklyAggregateToDto),
    trend: trend ? changeTrendToDto(trend) : null,
    outlierWeeks: outlierWeeks.map(outlierWeekToDto),
    summary: calculateSummary(weeklyData),
  };
}
