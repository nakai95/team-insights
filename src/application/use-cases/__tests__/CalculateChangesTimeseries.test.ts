import { describe, it, expect } from "vitest";
import { CalculateChangesTimeseries } from "../CalculateChangesTimeseries";
import { PullRequest } from "@/domain/interfaces/IGitHubRepository";
import { TrendDirection } from "@/domain/value-objects/ChangeTrend";

// Helper function to create a merged PullRequest test fixture with all required fields
/**
 * Creates a merged PullRequest test fixture with sensible defaults.
 * Use the `overrides` parameter to customize specific fields for a test.
 */
function createMergedPR(overrides: Partial<PullRequest> = {}): PullRequest {
  const baseDate = new Date("2024-01-01T00:00:00Z");
  return {
    number: 1,
    title: "Test PR",
    author: "testuser",
    createdAt: baseDate,
    state: "merged",
    reviewCommentCount: 0,
    mergedAt: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000), // +1 day
    additions: 10,
    deletions: 5,
    changedFiles: 2,
    ...overrides,
  };
}

// Helper to get Monday of a specific week (ISO 8601 week start)
function getMonday(year: number, month: number, day: number): Date {
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const dayOfWeek = date.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(date);
  monday.setDate(monday.getDate() - daysToSubtract);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

describe("CalculateChangesTimeseries", () => {
  describe("execute", () => {
    describe("happy path - normal cases", () => {
      it("should aggregate PRs by week correctly with multiple PRs in same week", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1); // Week 1: Jan 1-7, 2024
        const tuesdayWeek1 = new Date(mondayWeek1);
        tuesdayWeek1.setDate(tuesdayWeek1.getDate() + 1);
        const wednesdayWeek1 = new Date(mondayWeek1);
        wednesdayWeek1.setDate(wednesdayWeek1.getDate() + 2);

        const pullRequests = [
          createMergedPR({
            number: 1,
            mergedAt: tuesdayWeek1,
            additions: 100,
            deletions: 50,
            changedFiles: 5,
          }),
          createMergedPR({
            number: 2,
            mergedAt: wednesdayWeek1,
            additions: 200,
            deletions: 100,
            changedFiles: 10,
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(1);
        expect(result.weeklyData[0]?.prCount).toBe(2);
        expect(result.weeklyData[0]?.additions).toBe(300); // 100 + 200
        expect(result.weeklyData[0]?.deletions).toBe(150); // 50 + 100
        expect(result.weeklyData[0]?.totalChanges).toBe(450); // 300 + 150
        expect(result.weeklyData[0]?.changedFilesTotal).toBe(15); // 5 + 10
      });

      it("should aggregate PRs across different weeks correctly", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);
        const mondayWeek2 = new Date(mondayWeek1);
        mondayWeek2.setDate(mondayWeek2.getDate() + 7);
        const mondayWeek3 = new Date(mondayWeek1);
        mondayWeek3.setDate(mondayWeek3.getDate() + 14);

        const pullRequests = [
          createMergedPR({
            number: 1,
            mergedAt: mondayWeek1,
            additions: 100,
            deletions: 50,
            changedFiles: 5,
          }),
          createMergedPR({
            number: 2,
            mergedAt: mondayWeek2,
            additions: 200,
            deletions: 100,
            changedFiles: 10,
          }),
          createMergedPR({
            number: 3,
            mergedAt: mondayWeek3,
            additions: 300,
            deletions: 150,
            changedFiles: 15,
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(3);
        expect(result.weeklyData[0]?.prCount).toBe(1);
        expect(result.weeklyData[1]?.prCount).toBe(1);
        expect(result.weeklyData[2]?.prCount).toBe(1);
        expect(result.weeklyData[0]?.totalChanges).toBe(150); // 100 + 50
        expect(result.weeklyData[1]?.totalChanges).toBe(300); // 200 + 100
        expect(result.weeklyData[2]?.totalChanges).toBe(450); // 300 + 150
      });

      it("should return weeklyData in chronological order", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek3 = getMonday(2024, 1, 15);
        const mondayWeek1 = new Date(mondayWeek3);
        mondayWeek1.setDate(mondayWeek1.getDate() - 14);
        const mondayWeek2 = new Date(mondayWeek3);
        mondayWeek2.setDate(mondayWeek2.getDate() - 7);

        // Insert PRs in non-chronological order
        const pullRequests = [
          createMergedPR({ number: 3, mergedAt: mondayWeek3 }),
          createMergedPR({ number: 1, mergedAt: mondayWeek1 }),
          createMergedPR({ number: 2, mergedAt: mondayWeek2 }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(3);
        const week1Start = new Date(result.weeklyData[0]!.weekStart);
        const week2Start = new Date(result.weeklyData[1]!.weekStart);
        const week3Start = new Date(result.weeklyData[2]!.weekStart);
        expect(week1Start.getTime()).toBeLessThan(week2Start.getTime());
        expect(week2Start.getTime()).toBeLessThan(week3Start.getTime());
      });

      it("should calculate trend when sufficient data (>= 4 weeks)", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        // Create 4 weeks of data with increasing trend
        const pullRequests = [
          createMergedPR({
            number: 1,
            mergedAt: mondayWeek1,
            additions: 100,
            deletions: 50,
          }),
          createMergedPR({
            number: 2,
            mergedAt: new Date(mondayWeek1.getTime() + 7 * 24 * 60 * 60 * 1000),
            additions: 150,
            deletions: 75,
          }),
          createMergedPR({
            number: 3,
            mergedAt: new Date(
              mondayWeek1.getTime() + 14 * 24 * 60 * 60 * 1000,
            ),
            additions: 200,
            deletions: 100,
          }),
          createMergedPR({
            number: 4,
            mergedAt: new Date(
              mondayWeek1.getTime() + 21 * 24 * 60 * 60 * 1000,
            ),
            additions: 250,
            deletions: 125,
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.trend).not.toBeNull();
        expect(result.trend?.analyzedWeeks).toBe(4);
        expect(result.trend?.direction).toBe(TrendDirection.INCREASING);
      });

      it("should detect outlier weeks correctly", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        // Create 10 weeks: 9 normal + 1 outlier
        // Need many normal weeks to stabilize mean/stddev for outlier detection
        const pullRequests = [
          createMergedPR({
            number: 1,
            mergedAt: mondayWeek1,
            additions: 70,
            deletions: 30,
          }), // 100
          createMergedPR({
            number: 2,
            mergedAt: new Date(mondayWeek1.getTime() + 7 * 24 * 60 * 60 * 1000),
            additions: 75,
            deletions: 35,
          }), // 110
          createMergedPR({
            number: 3,
            mergedAt: new Date(
              mondayWeek1.getTime() + 14 * 24 * 60 * 60 * 1000,
            ),
            additions: 72,
            deletions: 33,
          }), // 105
          createMergedPR({
            number: 4,
            mergedAt: new Date(
              mondayWeek1.getTime() + 21 * 24 * 60 * 60 * 1000,
            ),
            additions: 74,
            deletions: 34,
          }), // 108
          createMergedPR({
            number: 5,
            mergedAt: new Date(
              mondayWeek1.getTime() + 28 * 24 * 60 * 60 * 1000,
            ),
            additions: 70,
            deletions: 32,
          }), // 102
          createMergedPR({
            number: 6,
            mergedAt: new Date(
              mondayWeek1.getTime() + 35 * 24 * 60 * 60 * 1000,
            ),
            additions: 73,
            deletions: 33,
          }), // 106
          createMergedPR({
            number: 7,
            mergedAt: new Date(
              mondayWeek1.getTime() + 42 * 24 * 60 * 60 * 1000,
            ),
            additions: 71,
            deletions: 32,
          }), // 103
          createMergedPR({
            number: 8,
            mergedAt: new Date(
              mondayWeek1.getTime() + 49 * 24 * 60 * 60 * 1000,
            ),
            additions: 75,
            deletions: 34,
          }), // 109
          createMergedPR({
            number: 9,
            mergedAt: new Date(
              mondayWeek1.getTime() + 56 * 24 * 60 * 60 * 1000,
            ),
            additions: 74,
            deletions: 33,
          }), // 107
          // Outlier week with 20x normal changes
          createMergedPR({
            number: 10,
            mergedAt: new Date(
              mondayWeek1.getTime() + 63 * 24 * 60 * 60 * 1000,
            ),
            additions: 1400,
            deletions: 600,
          }), // 2000
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.outlierWeeks).toHaveLength(1);
        expect(result.outlierWeeks[0]?.totalChanges).toBe(2000); // 1400 + 600
        expect(result.outlierWeeks[0]?.zScore).toBeGreaterThan(2);
      });

      it("should calculate summary statistics correctly", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        const pullRequests = [
          createMergedPR({
            number: 1,
            mergedAt: mondayWeek1,
            additions: 100,
            deletions: 50,
            changedFiles: 5,
          }),
          createMergedPR({
            number: 2,
            mergedAt: mondayWeek1,
            additions: 200,
            deletions: 100,
            changedFiles: 10,
          }),
          createMergedPR({
            number: 3,
            mergedAt: new Date(mondayWeek1.getTime() + 7 * 24 * 60 * 60 * 1000),
            additions: 150,
            deletions: 75,
            changedFiles: 8,
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.summary.totalPRs).toBe(3);
        expect(result.summary.totalAdditions).toBe(450); // 100 + 200 + 150
        expect(result.summary.totalDeletions).toBe(225); // 50 + 100 + 75
        expect(result.summary.averageWeeklyChanges).toBe(337.5); // (450 + 225) / 2 weeks
        expect(result.summary.averagePRSize).toBe(225); // (450 + 225) / 3 PRs
        expect(result.summary.weeksAnalyzed).toBe(2);
      });

      it("should convert domain objects to DTOs correctly with dates as ISO strings", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        const pullRequests = [
          createMergedPR({
            number: 1,
            mergedAt: mondayWeek1,
            additions: 100,
            deletions: 50,
            changedFiles: 5,
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(1);
        expect(typeof result.weeklyData[0]?.weekStart).toBe("string");
        expect(typeof result.weeklyData[0]?.weekEnd).toBe("string");
        expect(result.weeklyData[0]?.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}T/);

        if (result.outlierWeeks.length > 0) {
          expect(typeof result.outlierWeeks[0]?.weekStart).toBe("string");
        }
      });

      it("should group PRs by ISO week (Monday start) correctly", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();

        // Jan 1, 2024 is a Monday (week 1)
        // Jan 7, 2024 is a Sunday (still week 1)
        // Jan 8, 2024 is a Monday (week 2)
        const monday = new Date("2024-01-01T10:00:00Z");
        const sunday = new Date("2024-01-07T10:00:00Z");
        const nextMonday = new Date("2024-01-08T10:00:00Z");

        const pullRequests = [
          createMergedPR({ number: 1, mergedAt: monday }),
          createMergedPR({ number: 2, mergedAt: sunday }),
          createMergedPR({ number: 3, mergedAt: nextMonday }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(2);
        expect(result.weeklyData[0]?.prCount).toBe(2); // Monday + Sunday
        expect(result.weeklyData[1]?.prCount).toBe(1); // Next Monday
      });
    });

    describe("edge cases - trend calculation", () => {
      it("should return null trend when exactly 3 weeks of data", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        const pullRequests = [
          createMergedPR({ number: 1, mergedAt: mondayWeek1 }),
          createMergedPR({
            number: 2,
            mergedAt: new Date(mondayWeek1.getTime() + 7 * 24 * 60 * 60 * 1000),
          }),
          createMergedPR({
            number: 3,
            mergedAt: new Date(
              mondayWeek1.getTime() + 14 * 24 * 60 * 60 * 1000,
            ),
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(3);
        expect(result.trend).toBeNull();
      });

      it("should return null trend when less than 4 weeks of data", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        const pullRequests = [
          createMergedPR({ number: 1, mergedAt: mondayWeek1 }),
          createMergedPR({
            number: 2,
            mergedAt: new Date(mondayWeek1.getTime() + 7 * 24 * 60 * 60 * 1000),
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(2);
        expect(result.trend).toBeNull();
      });

      it("should calculate decreasing trend when recent weeks have fewer changes", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        // Create 4 weeks with decreasing trend
        const pullRequests = [
          createMergedPR({
            number: 1,
            mergedAt: mondayWeek1,
            additions: 250,
            deletions: 125,
          }),
          createMergedPR({
            number: 2,
            mergedAt: new Date(mondayWeek1.getTime() + 7 * 24 * 60 * 60 * 1000),
            additions: 200,
            deletions: 100,
          }),
          createMergedPR({
            number: 3,
            mergedAt: new Date(
              mondayWeek1.getTime() + 14 * 24 * 60 * 60 * 1000,
            ),
            additions: 150,
            deletions: 75,
          }),
          createMergedPR({
            number: 4,
            mergedAt: new Date(
              mondayWeek1.getTime() + 21 * 24 * 60 * 60 * 1000,
            ),
            additions: 100,
            deletions: 50,
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.trend).not.toBeNull();
        expect(result.trend?.direction).toBe(TrendDirection.DECREASING);
      });

      it("should calculate stable trend when changes remain consistent", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        // Create 4 weeks with stable values (within 10% threshold)
        const pullRequests = [
          createMergedPR({
            number: 1,
            mergedAt: mondayWeek1,
            additions: 100,
            deletions: 50,
          }),
          createMergedPR({
            number: 2,
            mergedAt: new Date(mondayWeek1.getTime() + 7 * 24 * 60 * 60 * 1000),
            additions: 105,
            deletions: 52,
          }),
          createMergedPR({
            number: 3,
            mergedAt: new Date(
              mondayWeek1.getTime() + 14 * 24 * 60 * 60 * 1000,
            ),
            additions: 102,
            deletions: 51,
          }),
          createMergedPR({
            number: 4,
            mergedAt: new Date(
              mondayWeek1.getTime() + 21 * 24 * 60 * 60 * 1000,
            ),
            additions: 108,
            deletions: 54,
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.trend).not.toBeNull();
        expect(result.trend?.direction).toBe(TrendDirection.STABLE);
      });
    });

    describe("edge cases - outlier detection", () => {
      it("should return empty outliers when less than 4 weeks of data", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        const pullRequests = [
          createMergedPR({
            number: 1,
            mergedAt: mondayWeek1,
            additions: 100,
            deletions: 50,
          }),
          createMergedPR({
            number: 2,
            mergedAt: new Date(mondayWeek1.getTime() + 7 * 24 * 60 * 60 * 1000),
            additions: 1000,
            deletions: 500,
          }), // Would be outlier if >= 4 weeks
          createMergedPR({
            number: 3,
            mergedAt: new Date(
              mondayWeek1.getTime() + 14 * 24 * 60 * 60 * 1000,
            ),
            additions: 100,
            deletions: 50,
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(3);
        expect(result.outlierWeeks).toHaveLength(0);
      });

      it("should return empty outliers when all weeks have identical values", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        const pullRequests = [
          createMergedPR({
            number: 1,
            mergedAt: mondayWeek1,
            additions: 100,
            deletions: 50,
          }),
          createMergedPR({
            number: 2,
            mergedAt: new Date(mondayWeek1.getTime() + 7 * 24 * 60 * 60 * 1000),
            additions: 100,
            deletions: 50,
          }),
          createMergedPR({
            number: 3,
            mergedAt: new Date(
              mondayWeek1.getTime() + 14 * 24 * 60 * 60 * 1000,
            ),
            additions: 100,
            deletions: 50,
          }),
          createMergedPR({
            number: 4,
            mergedAt: new Date(
              mondayWeek1.getTime() + 21 * 24 * 60 * 60 * 1000,
            ),
            additions: 100,
            deletions: 50,
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(4);
        expect(result.outlierWeeks).toHaveLength(0);
      });

      it("should detect multiple outlier weeks", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        // Create 12 weeks: 10 normal + 2 outliers
        const pullRequests = [
          createMergedPR({
            number: 1,
            mergedAt: mondayWeek1,
            additions: 70,
            deletions: 30,
          }),
          createMergedPR({
            number: 2,
            mergedAt: new Date(mondayWeek1.getTime() + 7 * 24 * 60 * 60 * 1000),
            additions: 75,
            deletions: 35,
          }),
          createMergedPR({
            number: 3,
            mergedAt: new Date(
              mondayWeek1.getTime() + 14 * 24 * 60 * 60 * 1000,
            ),
            additions: 72,
            deletions: 33,
          }),
          // First outlier
          createMergedPR({
            number: 4,
            mergedAt: new Date(
              mondayWeek1.getTime() + 21 * 24 * 60 * 60 * 1000,
            ),
            additions: 1400,
            deletions: 600,
          }), // 2000
          createMergedPR({
            number: 5,
            mergedAt: new Date(
              mondayWeek1.getTime() + 28 * 24 * 60 * 60 * 1000,
            ),
            additions: 70,
            deletions: 32,
          }),
          createMergedPR({
            number: 6,
            mergedAt: new Date(
              mondayWeek1.getTime() + 35 * 24 * 60 * 60 * 1000,
            ),
            additions: 73,
            deletions: 33,
          }),
          createMergedPR({
            number: 7,
            mergedAt: new Date(
              mondayWeek1.getTime() + 42 * 24 * 60 * 60 * 1000,
            ),
            additions: 71,
            deletions: 32,
          }),
          // Second outlier
          createMergedPR({
            number: 8,
            mergedAt: new Date(
              mondayWeek1.getTime() + 49 * 24 * 60 * 60 * 1000,
            ),
            additions: 1500,
            deletions: 700,
          }), // 2200
          createMergedPR({
            number: 9,
            mergedAt: new Date(
              mondayWeek1.getTime() + 56 * 24 * 60 * 60 * 1000,
            ),
            additions: 74,
            deletions: 33,
          }),
          createMergedPR({
            number: 10,
            mergedAt: new Date(
              mondayWeek1.getTime() + 63 * 24 * 60 * 60 * 1000,
            ),
            additions: 75,
            deletions: 34,
          }),
          createMergedPR({
            number: 11,
            mergedAt: new Date(
              mondayWeek1.getTime() + 70 * 24 * 60 * 60 * 1000,
            ),
            additions: 72,
            deletions: 33,
          }),
          createMergedPR({
            number: 12,
            mergedAt: new Date(
              mondayWeek1.getTime() + 77 * 24 * 60 * 60 * 1000,
            ),
            additions: 73,
            deletions: 32,
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(12);
        expect(result.outlierWeeks.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe("edge cases - empty and filtered data", () => {
      it("should handle empty PR list by returning empty result", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const pullRequests: PullRequest[] = [];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(0);
        expect(result.trend).toBeNull();
        expect(result.outlierWeeks).toHaveLength(0);
        expect(result.summary.totalPRs).toBe(0);
        expect(result.summary.totalAdditions).toBe(0);
        expect(result.summary.totalDeletions).toBe(0);
        expect(result.summary.averageWeeklyChanges).toBe(0);
        expect(result.summary.averagePRSize).toBe(0);
        expect(result.summary.weeksAnalyzed).toBe(0);
      });

      it("should exclude PRs without mergedAt date", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        const pullRequests: PullRequest[] = [
          createMergedPR({ number: 1, mergedAt: mondayWeek1 }),
          {
            number: 2,
            title: "Open PR",
            author: "user",
            createdAt: new Date("2024-01-01"),
            state: "open",
            reviewCommentCount: 0,
            additions: 100,
            deletions: 50,
            changedFiles: 5,
          }, // No mergedAt
          {
            number: 3,
            title: "Closed PR",
            author: "user",
            createdAt: new Date("2024-01-01"),
            state: "closed",
            reviewCommentCount: 0,
            additions: 200,
            deletions: 100,
            changedFiles: 10,
          }, // No mergedAt
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(1);
        expect(result.summary.totalPRs).toBe(1);
        expect(result.weeklyData[0]?.prCount).toBe(1);
      });

      it("should exclude PRs with missing additions field", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        const pullRequests: PullRequest[] = [
          createMergedPR({ number: 1, mergedAt: mondayWeek1 }),
          {
            number: 2,
            title: "PR without additions",
            author: "user",
            createdAt: new Date("2024-01-01"),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: mondayWeek1,
            deletions: 50,
            changedFiles: 5,
          } as PullRequest,
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(1);
        expect(result.summary.totalPRs).toBe(1);
        expect(result.weeklyData[0]?.prCount).toBe(1);
      });

      it("should exclude PRs with missing deletions field", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        const pullRequests: PullRequest[] = [
          createMergedPR({ number: 1, mergedAt: mondayWeek1 }),
          {
            number: 2,
            title: "PR without deletions",
            author: "user",
            createdAt: new Date("2024-01-01"),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: mondayWeek1,
            additions: 100,
            changedFiles: 5,
          } as PullRequest,
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(1);
        expect(result.summary.totalPRs).toBe(1);
        expect(result.weeklyData[0]?.prCount).toBe(1);
      });

      it("should exclude PRs with missing changedFiles field", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        const pullRequests: PullRequest[] = [
          createMergedPR({ number: 1, mergedAt: mondayWeek1 }),
          {
            number: 2,
            title: "PR without changedFiles",
            author: "user",
            createdAt: new Date("2024-01-01"),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: mondayWeek1,
            additions: 100,
            deletions: 50,
          } as PullRequest,
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(1);
        expect(result.summary.totalPRs).toBe(1);
        expect(result.weeklyData[0]?.prCount).toBe(1);
      });

      it("should handle PRs with zero additions, deletions, and changedFiles", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        const pullRequests = [
          createMergedPR({
            number: 1,
            mergedAt: mondayWeek1,
            additions: 0,
            deletions: 0,
            changedFiles: 0,
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(1);
        expect(result.weeklyData[0]?.additions).toBe(0);
        expect(result.weeklyData[0]?.deletions).toBe(0);
        expect(result.weeklyData[0]?.totalChanges).toBe(0);
        expect(result.weeklyData[0]?.changedFilesTotal).toBe(0);
        expect(result.summary.totalPRs).toBe(1);
      });

      it("should handle all PRs being filtered out", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();

        const pullRequests: PullRequest[] = [
          {
            number: 1,
            title: "Open PR",
            author: "user",
            createdAt: new Date("2024-01-01"),
            state: "open",
            reviewCommentCount: 0,
          },
          {
            number: 2,
            title: "Closed PR",
            author: "user",
            createdAt: new Date("2024-01-02"),
            state: "closed",
            reviewCommentCount: 0,
          },
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(0);
        expect(result.trend).toBeNull();
        expect(result.outlierWeeks).toHaveLength(0);
        expect(result.summary.totalPRs).toBe(0);
      });
    });

    describe("edge cases - week boundaries", () => {
      it("should correctly handle PR merged at end of week (Sunday)", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        // Use local time to ensure Monday is correctly identified
        const monday = new Date(2024, 0, 1, 0, 0, 0, 0); // Monday Jan 1, 2024
        const sunday = new Date(2024, 0, 7, 23, 59, 59, 0); // Sunday Jan 7, 2024

        const pullRequests = [
          createMergedPR({ number: 1, mergedAt: monday }),
          createMergedPR({ number: 2, mergedAt: sunday }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(1);
        expect(result.weeklyData[0]?.prCount).toBe(2);
      });

      it("should correctly handle PR merged at start of week (Monday 00:00:00)", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const monday = new Date(2024, 0, 1, 0, 0, 0, 0); // Monday Jan 1, 2024

        const pullRequests = [createMergedPR({ number: 1, mergedAt: monday })];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(1);
        expect(result.weeklyData[0]?.prCount).toBe(1);
        // Week start should be the Monday at 00:00:00
        const weekStart = new Date(result.weeklyData[0]!.weekStart);
        expect(weekStart.getDay()).toBe(1); // Monday
        expect(weekStart.getHours()).toBe(0);
        expect(weekStart.getMinutes()).toBe(0);
        expect(weekStart.getSeconds()).toBe(0);
      });

      it("should correctly split PRs across week boundary", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const sunday = new Date(2024, 0, 7, 23, 59, 59, 0); // End of week 1
        const monday = new Date(2024, 0, 8, 0, 0, 0, 0); // Start of week 2

        const pullRequests = [
          createMergedPR({ number: 1, mergedAt: sunday }),
          createMergedPR({ number: 2, mergedAt: monday }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(2);
        expect(result.weeklyData[0]?.prCount).toBe(1);
        expect(result.weeklyData[1]?.prCount).toBe(1);
      });
    });

    describe("edge cases - DTO conversion", () => {
      it("should include netChange in weekly data DTO", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        const pullRequests = [
          createMergedPR({
            number: 1,
            mergedAt: mondayWeek1,
            additions: 200,
            deletions: 50,
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData[0]?.netChange).toBe(150); // 200 - 50
      });

      it("should include averagePRSize in weekly data DTO", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        const pullRequests = [
          createMergedPR({
            number: 1,
            mergedAt: mondayWeek1,
            additions: 100,
            deletions: 50,
          }),
          createMergedPR({
            number: 2,
            mergedAt: mondayWeek1,
            additions: 200,
            deletions: 100,
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData[0]?.averagePRSize).toBe(225); // (150 + 300) / 2
      });

      it("should include trend percentChange and start/end values in DTO", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        const pullRequests = [
          createMergedPR({
            number: 1,
            mergedAt: mondayWeek1,
            additions: 100,
            deletions: 50,
          }),
          createMergedPR({
            number: 2,
            mergedAt: new Date(mondayWeek1.getTime() + 7 * 24 * 60 * 60 * 1000),
            additions: 150,
            deletions: 75,
          }),
          createMergedPR({
            number: 3,
            mergedAt: new Date(
              mondayWeek1.getTime() + 14 * 24 * 60 * 60 * 1000,
            ),
            additions: 200,
            deletions: 100,
          }),
          createMergedPR({
            number: 4,
            mergedAt: new Date(
              mondayWeek1.getTime() + 21 * 24 * 60 * 60 * 1000,
            ),
            additions: 250,
            deletions: 125,
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.trend).not.toBeNull();
        expect(result.trend?.percentChange).toBeGreaterThan(0);
        expect(result.trend?.startValue).toBeDefined();
        expect(result.trend?.endValue).toBeDefined();
      });

      it("should include outlier meanValue and stdDeviation in DTO", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        // Create 10 weeks with one clear outlier (matching first outlier test)
        const pullRequests = [
          createMergedPR({
            number: 1,
            mergedAt: mondayWeek1,
            additions: 70,
            deletions: 30,
          }),
          createMergedPR({
            number: 2,
            mergedAt: new Date(mondayWeek1.getTime() + 7 * 24 * 60 * 60 * 1000),
            additions: 75,
            deletions: 35,
          }),
          createMergedPR({
            number: 3,
            mergedAt: new Date(
              mondayWeek1.getTime() + 14 * 24 * 60 * 60 * 1000,
            ),
            additions: 72,
            deletions: 33,
          }),
          createMergedPR({
            number: 4,
            mergedAt: new Date(
              mondayWeek1.getTime() + 21 * 24 * 60 * 60 * 1000,
            ),
            additions: 74,
            deletions: 34,
          }),
          createMergedPR({
            number: 5,
            mergedAt: new Date(
              mondayWeek1.getTime() + 28 * 24 * 60 * 60 * 1000,
            ),
            additions: 70,
            deletions: 32,
          }),
          createMergedPR({
            number: 6,
            mergedAt: new Date(
              mondayWeek1.getTime() + 35 * 24 * 60 * 60 * 1000,
            ),
            additions: 73,
            deletions: 33,
          }),
          createMergedPR({
            number: 7,
            mergedAt: new Date(
              mondayWeek1.getTime() + 42 * 24 * 60 * 60 * 1000,
            ),
            additions: 71,
            deletions: 32,
          }),
          createMergedPR({
            number: 8,
            mergedAt: new Date(
              mondayWeek1.getTime() + 49 * 24 * 60 * 60 * 1000,
            ),
            additions: 75,
            deletions: 34,
          }),
          createMergedPR({
            number: 9,
            mergedAt: new Date(
              mondayWeek1.getTime() + 56 * 24 * 60 * 60 * 1000,
            ),
            additions: 74,
            deletions: 33,
          }),
          // Outlier week
          createMergedPR({
            number: 10,
            mergedAt: new Date(
              mondayWeek1.getTime() + 63 * 24 * 60 * 60 * 1000,
            ),
            additions: 1400,
            deletions: 600,
          }),
        ];

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.outlierWeeks).toHaveLength(1);
        expect(result.outlierWeeks[0]?.meanValue).toBeGreaterThan(0);
        expect(result.outlierWeeks[0]?.stdDeviation).toBeGreaterThan(0);
      });
    });

    describe("edge cases - large datasets", () => {
      it("should handle 52 weeks of data efficiently", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        const pullRequests = Array.from({ length: 52 }, (_, i) =>
          createMergedPR({
            number: i + 1,
            mergedAt: new Date(
              mondayWeek1.getTime() + i * 7 * 24 * 60 * 60 * 1000,
            ),
            additions: 100 + i * 10,
            deletions: 50 + i * 5,
          }),
        );

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(52);
        expect(result.summary.weeksAnalyzed).toBe(52);
        expect(result.summary.totalPRs).toBe(52);
        expect(result.trend).not.toBeNull();
      });

      it("should handle multiple PRs per week across many weeks", () => {
        // Arrange
        const useCase = new CalculateChangesTimeseries();
        const mondayWeek1 = getMonday(2024, 1, 1);

        // Create 10 weeks with 5 PRs each
        const pullRequests: PullRequest[] = [];
        for (let week = 0; week < 10; week++) {
          for (let pr = 0; pr < 5; pr++) {
            pullRequests.push(
              createMergedPR({
                number: week * 5 + pr + 1,
                mergedAt: new Date(
                  mondayWeek1.getTime() +
                    week * 7 * 24 * 60 * 60 * 1000 +
                    pr * 24 * 60 * 60 * 1000,
                ),
                additions: 50,
                deletions: 25,
              }),
            );
          }
        }

        // Act
        const result = useCase.execute(pullRequests);

        // Assert
        expect(result.weeklyData).toHaveLength(10);
        expect(result.summary.totalPRs).toBe(50);
        result.weeklyData.forEach((week) => {
          expect(week.prCount).toBe(5);
        });
      });
    });
  });
});
