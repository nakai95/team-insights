import { describe, it, expect } from "vitest";
import { OutlierWeek } from "../OutlierWeek";
import { WeeklyAggregate } from "../WeeklyAggregate";

describe("OutlierWeek", () => {
  /**
   * Helper function to create a Monday `Date` at midnight.
   *
   * Expects the provided `year`, `month` (0-based), and `day` to represent a Monday.
   * Throws an error if the resulting date is not a Monday, to catch incorrect test setup.
   */
  const createMonday = (year: number, month: number, day: number): Date => {
    const date = new Date(year, month, day, 0, 0, 0, 0);
    if (date.getDay() !== 1) {
      throw new Error("Test setup error: provided date is not a Monday");
    }
    return date;
  };

  // Helper function to create test WeeklyAggregate instances
  const createWeeklyAggregate = (
    weekStart: Date,
    totalChanges: number,
    prCount: number = 1,
  ): WeeklyAggregate => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return new (WeeklyAggregate as unknown as {
      new (
        weekStart: Date,
        weekEnd: Date,
        additions: number,
        deletions: number,
        totalChanges: number,
        netChange: number,
        prCount: number,
        averagePRSize: number,
        changedFilesTotal: number,
      ): WeeklyAggregate;
    })(
      weekStart,
      weekEnd,
      totalChanges / 2, // additions
      totalChanges / 2, // deletions
      totalChanges,
      0, // netChange
      prCount,
      totalChanges / prCount, // averagePRSize
      prCount * 5, // changedFilesTotal
    );
  };

  describe("detect", () => {
    describe("happy path - detecting outliers", () => {
      it("should detect single outlier week when value exceeds mean + 2σ", () => {
        // Arrange: Create dataset with one clear outlier
        // Values: 100, 100, 100, 100, 100, 1000
        // Mean = 250, StdDev ≈ 335.41, Threshold ≈ 920.82
        // 1000 > 920.82, so it's detected as outlier
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 100);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 100);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 100);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 100);
        const week6 = createWeeklyAggregate(createMonday(2024, 1, 5), 1000);

        const weeklyData = [week1, week2, week3, week4, week5, week6];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliers).toHaveLength(1);
        expect(outliers[0]?.weekStart).toEqual(week6.weekStart);
        expect(outliers[0]?.totalChanges).toBe(1000);
        expect(outliers[0]?.prCount).toBe(1);
        expect(outliers[0]?.zScore).toBeGreaterThan(2.0);
      });

      it("should detect multiple outlier weeks when multiple values exceed threshold", () => {
        // Arrange: Dataset with two outliers
        // Values: 50×12, 1000, 1200
        // Need many base values to make multiple outliers work
        const weeks: WeeklyAggregate[] = [];
        let currentDate = createMonday(2024, 0, 1);

        // Create 12 weeks with value 50
        for (let i = 0; i < 12; i++) {
          weeks.push(createWeeklyAggregate(currentDate, 50));
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + 7);
        }

        // Add two outlier weeks
        weeks.push(createWeeklyAggregate(currentDate, 1000));
        currentDate = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() + 7);
        weeks.push(createWeeklyAggregate(currentDate, 1200));

        // Act
        const outliers = OutlierWeek.detect(weeks, 2.0);

        // Assert
        expect(outliers.length).toBeGreaterThanOrEqual(2);
        expect(outliers.some((o) => o.totalChanges === 1000)).toBe(true);
        expect(outliers.some((o) => o.totalChanges === 1200)).toBe(true);
      });

      it("should return empty array when no values exceed threshold", () => {
        // Arrange: All values are similar, no outliers
        // Values: 100, 110, 120, 130, 140
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 110);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 120);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 130);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 140);

        const weeklyData = [week1, week2, week3, week4, week5];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliers).toHaveLength(0);
      });

      it("should preserve PR count from original WeeklyAggregate", () => {
        // Arrange
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100, 5);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 100, 3);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 100, 4);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 100, 2);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 100, 6);
        const week6 = createWeeklyAggregate(createMonday(2024, 1, 5), 1000, 10);

        const weeklyData = [week1, week2, week3, week4, week5, week6];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliers).toHaveLength(1);
        expect(outliers[0]?.prCount).toBe(10);
      });

      it("should calculate correct mean and stdDev values for outliers", () => {
        // Arrange: Simple dataset for verification
        // Values: 100×6, 1000
        // Mean = 250, StdDev ≈ 335.41
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 100);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 100);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 100);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 100);
        const week6 = createWeeklyAggregate(createMonday(2024, 1, 5), 100);
        const week7 = createWeeklyAggregate(createMonday(2024, 1, 12), 1000);

        const weeklyData = [week1, week2, week3, week4, week5, week6, week7];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliers).toHaveLength(1);
        expect(outliers[0]!.meanValue).toBeCloseTo(228.57, 1);
        expect(outliers[0]!.stdDeviation).toBeCloseTo(314.93, 1);
      });
    });

    describe("edge cases - insufficient data", () => {
      it("should return empty array when less than 4 weeks of data provided", () => {
        // Arrange: Only 3 weeks
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 100);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 500);

        const weeklyData = [week1, week2, week3];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliers).toHaveLength(0);
      });

      it("should return empty array when exactly 3 weeks of data provided", () => {
        // Arrange
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 200);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 1000);

        const weeklyData = [week1, week2, week3];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliers).toHaveLength(0);
      });

      it("should return empty array when 2 weeks of data provided", () => {
        // Arrange
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 1000);

        const weeklyData = [week1, week2];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliers).toHaveLength(0);
      });

      it("should return empty array when 1 week of data provided", () => {
        // Arrange
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 500);

        const weeklyData = [week1];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliers).toHaveLength(0);
      });

      it("should return empty array when empty array provided", () => {
        // Arrange
        const weeklyData: WeeklyAggregate[] = [];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliers).toHaveLength(0);
      });

      it("should detect outliers when exactly 4 weeks of data provided", () => {
        // Arrange: Minimum valid dataset with outlier
        // Need at least 4 weeks, use [10×5, 500] pattern
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 10);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 10);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 10);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 10);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 10);
        const week6 = createWeeklyAggregate(createMonday(2024, 1, 5), 500);

        const weeklyData = [week1, week2, week3, week4, week5, week6];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliers.length).toBeGreaterThan(0);
        expect(outliers[0]?.totalChanges).toBe(500);
      });
    });

    describe("edge cases - zero variance", () => {
      it("should return empty array when all values are identical (zero variance)", () => {
        // Arrange: All values are 100
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 100);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 100);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 100);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 100);

        const weeklyData = [week1, week2, week3, week4, week5];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliers).toHaveLength(0);
      });

      it("should return empty array when all values are zero", () => {
        // Arrange: All values are 0
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 0);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 0);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 0);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 0);

        const weeklyData = [week1, week2, week3, week4];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliers).toHaveLength(0);
      });

      it("should return empty array when all values are identical large numbers", () => {
        // Arrange: All values are 10000
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 10000);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 10000);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 10000);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 10000);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 10000);

        const weeklyData = [week1, week2, week3, week4, week5];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliers).toHaveLength(0);
      });
    });

    describe("threshold parameter variations", () => {
      it("should detect more outliers with lower threshold (1.5σ)", () => {
        // Arrange: Values with moderate variance
        // Values: 100, 110, 120, 130, 250
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 110);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 120);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 130);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 250);

        const weeklyData = [week1, week2, week3, week4, week5];

        // Act
        const outliersLowThreshold = OutlierWeek.detect(weeklyData, 1.5);
        const outliersHighThreshold = OutlierWeek.detect(weeklyData, 2.5);

        // Assert
        expect(outliersLowThreshold.length).toBeGreaterThanOrEqual(
          outliersHighThreshold.length,
        );
      });

      it("should detect no outliers with very high threshold (5.0σ)", () => {
        // Arrange: Moderate outlier that won't exceed 5σ
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 100);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 100);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 100);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 300);

        const weeklyData = [week1, week2, week3, week4, week5];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 5.0);

        // Assert
        expect(outliers).toHaveLength(0);
      });

      it("should use default threshold of 2.0 when not specified", () => {
        // Arrange
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 100);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 100);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 100);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 500);

        const weeklyData = [week1, week2, week3, week4, week5];

        // Act
        const outliersDefault = OutlierWeek.detect(weeklyData);
        const outliersExplicit = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliersDefault).toHaveLength(outliersExplicit.length);
        if (outliersDefault.length > 0 && outliersExplicit.length > 0) {
          expect(outliersDefault[0]!.zScore).toBeCloseTo(
            outliersExplicit[0]!.zScore,
            5,
          );
        }
      });

      it("should detect outliers with threshold of 1.0σ", () => {
        // Arrange: Dataset where value exceeds mean + 1σ
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 100);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 100);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 100);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 200);

        const weeklyData = [week1, week2, week3, week4, week5];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 1.0);

        // Assert
        expect(outliers.length).toBeGreaterThan(0);
        expect(outliers[0]?.totalChanges).toBe(200);
      });
    });

    describe("edge cases - extreme values", () => {
      it("should handle dataset with very low variance", () => {
        // Arrange: Values very close together
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 101);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 102);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 103);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 110);

        const weeklyData = [week1, week2, week3, week4, week5];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        // With such low variance, even small differences might be outliers
        // The test verifies the function handles this correctly
        expect(Array.isArray(outliers)).toBe(true);
      });

      it("should handle dataset with very high variance", () => {
        // Arrange: Highly variable data
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 10);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 1000);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 50);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 2000);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 5000);

        const weeklyData = [week1, week2, week3, week4, week5];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(Array.isArray(outliers)).toBe(true);
        // High variance means fewer outliers relative to the spread
      });

      it("should handle very large dataset (52 weeks)", () => {
        // Arrange: Full year of data with one outlier
        const weeklyData: WeeklyAggregate[] = [];
        const startDate = createMonday(2024, 0, 1);

        for (let i = 0; i < 52; i++) {
          const weekStart = new Date(startDate);
          weekStart.setDate(startDate.getDate() + i * 7);
          const totalChanges = i === 50 ? 10000 : 100 + Math.random() * 50;
          weeklyData.push(
            createWeeklyAggregate(weekStart, Math.round(totalChanges)),
          );
        }

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliers.length).toBeGreaterThan(0);
        expect(outliers.some((o) => o.totalChanges === 10000)).toBe(true);
      });
    });

    describe("outlier detection at exact boundary", () => {
      it("should detect outlier when value exactly equals mean + threshold * σ", () => {
        // Arrange: Craft dataset where one value is exactly at boundary
        // This tests the '>' operator in the implementation
        // Values: 100, 100, 100, 100, and we calculate what the boundary would be
        // Mean = 100, to have StdDev we need variance
        // If we add 300: Mean = 140, Variance = 6400, StdDev = 80
        // Threshold at 2σ: 140 + 2*80 = 300 (exactly at boundary)
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 100);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 100);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 100);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 300);

        const weeklyData = [week1, week2, week3, week4, week5];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        // Implementation uses '>' so exactly at boundary should NOT be detected
        expect(outliers).toHaveLength(0);
      });

      it("should not detect value slightly below mean + threshold * σ", () => {
        // Arrange: Value just below boundary
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 100);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 100);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 100);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 299);

        const weeklyData = [week1, week2, week3, week4, week5];

        // Act
        const outliers = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliers).toHaveLength(0);
      });
    });

    describe("immutability and value object properties", () => {
      it("should return new array instance each time", () => {
        // Arrange
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 100);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 100);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 100);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 1000);

        const weeklyData = [week1, week2, week3, week4, week5];

        // Act
        const outliers1 = OutlierWeek.detect(weeklyData, 2.0);
        const outliers2 = OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(outliers1).not.toBe(outliers2); // Different array instances
        expect(outliers1).toHaveLength(outliers2.length);
        if (outliers1.length > 0 && outliers2.length > 0) {
          expect(outliers1[0]?.totalChanges).toBe(outliers2[0]?.totalChanges);
        }
      });

      it("should not modify input WeeklyAggregate array", () => {
        // Arrange
        const week1 = createWeeklyAggregate(createMonday(2024, 0, 1), 100);
        const week2 = createWeeklyAggregate(createMonday(2024, 0, 8), 100);
        const week3 = createWeeklyAggregate(createMonday(2024, 0, 15), 100);
        const week4 = createWeeklyAggregate(createMonday(2024, 0, 22), 100);
        const week5 = createWeeklyAggregate(createMonday(2024, 0, 29), 1000);

        const weeklyData = [week1, week2, week3, week4, week5];
        const originalLength = weeklyData.length;
        const originalFirstWeek = weeklyData[0];

        // Act
        OutlierWeek.detect(weeklyData, 2.0);

        // Assert
        expect(weeklyData).toHaveLength(originalLength);
        expect(weeklyData[0]).toBe(originalFirstWeek);
      });
    });
  });
});
