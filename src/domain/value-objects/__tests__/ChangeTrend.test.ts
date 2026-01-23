import { describe, it, expect } from "vitest";
import { ChangeTrend, TrendDirection } from "../ChangeTrend";

describe("ChangeTrend", () => {
  describe("analyze", () => {
    describe("happy path - increasing trend", () => {
      it("should detect increasing trend when second half is 10% higher than first half", () => {
        // Arrange: First half avg = 100, Second half avg = 110 (exactly 10% increase)
        const weeklyTotals = [100, 100, 110, 110];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBe(10);
        expect(trend.analyzedWeeks).toBe(4);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(110);
      });

      it("should detect increasing trend when second half is 50% higher than first half", () => {
        // Arrange: First half avg = 200, Second half avg = 300 (50% increase)
        const weeklyTotals = [200, 200, 300, 300];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBe(50);
        expect(trend.startValue).toBe(200);
        expect(trend.endValue).toBe(300);
      });

      it("should detect increasing trend with gradual growth across 8 weeks", () => {
        // Arrange: Gradual increase from 100 to 200
        // First half (4 weeks): 100, 110, 120, 130 -> avg = 115
        // Second half (4 weeks): 140, 150, 160, 170 -> avg = 155
        const weeklyTotals = [100, 110, 120, 130, 140, 150, 160, 170];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBeCloseTo(34.78, 1); // (155-115)/115 * 100
        expect(trend.analyzedWeeks).toBe(8);
        expect(trend.startValue).toBe(115);
        expect(trend.endValue).toBe(155);
      });

      it("should detect increasing trend when starting from low baseline", () => {
        // Arrange: First half avg = 10, Second half avg = 20 (100% increase)
        const weeklyTotals = [10, 10, 20, 20];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBe(100);
        expect(trend.startValue).toBe(10);
        expect(trend.endValue).toBe(20);
      });

      it("should detect increasing trend with large numbers", () => {
        // Arrange: First half avg = 10000, Second half avg = 12000 (20% increase)
        const weeklyTotals = [10000, 10000, 12000, 12000];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBe(20);
        expect(trend.startValue).toBe(10000);
        expect(trend.endValue).toBe(12000);
      });
    });

    describe("happy path - decreasing trend", () => {
      it("should detect decreasing trend when second half is 10% lower than first half", () => {
        // Arrange: First half avg = 100, Second half avg = 90 (10% decrease)
        const weeklyTotals = [100, 100, 90, 90];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.DECREASING);
        expect(trend.percentChange).toBe(10);
        expect(trend.analyzedWeeks).toBe(4);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(90);
      });

      it("should detect decreasing trend when second half is 50% lower than first half", () => {
        // Arrange: First half avg = 400, Second half avg = 200 (50% decrease)
        const weeklyTotals = [400, 400, 200, 200];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.DECREASING);
        expect(trend.percentChange).toBe(50);
        expect(trend.startValue).toBe(400);
        expect(trend.endValue).toBe(200);
      });

      it("should detect decreasing trend with gradual decline across 8 weeks", () => {
        // Arrange: Gradual decrease from 200 to 100
        // First half (4 weeks): 200, 190, 180, 170 -> avg = 185
        // Second half (4 weeks): 160, 150, 140, 130 -> avg = 145
        const weeklyTotals = [200, 190, 180, 170, 160, 150, 140, 130];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.DECREASING);
        expect(trend.percentChange).toBeCloseTo(21.62, 1); // (185-145)/185 * 100
        expect(trend.analyzedWeeks).toBe(8);
        expect(trend.startValue).toBe(185);
        expect(trend.endValue).toBe(145);
      });

      it("should detect decreasing trend when dropping from high baseline", () => {
        // Arrange: First half avg = 1000, Second half avg = 500 (50% decrease)
        const weeklyTotals = [1000, 1000, 500, 500];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.DECREASING);
        expect(trend.percentChange).toBe(50);
        expect(trend.startValue).toBe(1000);
        expect(trend.endValue).toBe(500);
      });

      it("should detect decreasing trend approaching zero", () => {
        // Arrange: First half avg = 100, Second half avg = 10 (90% decrease)
        const weeklyTotals = [100, 100, 10, 10];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.DECREASING);
        expect(trend.percentChange).toBe(90);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(10);
      });
    });

    describe("happy path - stable trend", () => {
      it("should detect stable trend when values are identical", () => {
        // Arrange: All values are 100
        const weeklyTotals = [100, 100, 100, 100];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.STABLE);
        expect(trend.percentChange).toBe(0);
        expect(trend.analyzedWeeks).toBe(4);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(100);
      });

      it("should detect stable trend when change is within 10% threshold (positive)", () => {
        // Arrange: First half avg = 100, Second half avg = 109 (9% increase, below threshold)
        const weeklyTotals = [100, 100, 109, 109];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.STABLE);
        expect(trend.percentChange).toBe(9);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(109);
      });

      it("should detect stable trend when change is within 10% threshold (negative)", () => {
        // Arrange: First half avg = 100, Second half avg = 91 (9% decrease, below threshold)
        const weeklyTotals = [100, 100, 91, 91];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.STABLE);
        expect(trend.percentChange).toBe(9);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(91);
      });

      it("should detect stable trend with minor fluctuations", () => {
        // Arrange: First half avg = 100, Second half avg = 105 (5% increase)
        const weeklyTotals = [98, 102, 103, 107];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.STABLE);
        expect(trend.percentChange).toBe(5);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(105);
      });

      it("should detect stable trend over longer period with small variations", () => {
        // Arrange: 8 weeks with small variations around 100
        // First half: 95, 100, 105, 100 -> avg = 100
        // Second half: 102, 98, 103, 97 -> avg = 100
        const weeklyTotals = [95, 100, 105, 100, 102, 98, 103, 97];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.STABLE);
        expect(trend.percentChange).toBe(0);
        expect(trend.analyzedWeeks).toBe(8);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(100);
      });

      it("should detect stable trend when change is exactly at 9.99% increase", () => {
        // Arrange: First half avg = 100, Second half avg = 109.9 (just below 10% threshold)
        const weeklyTotals = [100, 100, 109.9, 109.9];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.STABLE);
        expect(trend.percentChange).toBeCloseTo(9.9, 1);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(109.9);
      });

      it("should detect stable trend when change is exactly at 9.99% decrease", () => {
        // Arrange: First half avg = 100, Second half avg = 90.1 (just below 10% threshold)
        const weeklyTotals = [100, 100, 90.1, 90.1];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.STABLE);
        expect(trend.percentChange).toBeCloseTo(9.9, 1);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(90.1);
      });
    });

    describe("edge cases - boundary values", () => {
      it("should handle exactly 4 weeks of data (minimum required)", () => {
        // Arrange: Minimum data size
        const weeklyTotals = [50, 50, 100, 100];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBe(100);
        expect(trend.analyzedWeeks).toBe(4);
        expect(trend.startValue).toBe(50);
        expect(trend.endValue).toBe(100);
      });

      it("should handle 5 weeks of data (odd number)", () => {
        // Arrange: First half (2 weeks): 100, 100 -> avg = 100
        // Second half (3 weeks): 120, 120, 120 -> avg = 120
        const weeklyTotals = [100, 100, 120, 120, 120];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBe(20);
        expect(trend.analyzedWeeks).toBe(5);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(120);
      });

      it("should handle large dataset (52 weeks)", () => {
        // Arrange: Full year of data
        // First half (26 weeks): all 100 -> avg = 100
        // Second half (26 weeks): all 150 -> avg = 150
        const weeklyTotals = [...Array(26).fill(100), ...Array(26).fill(150)];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBe(50);
        expect(trend.analyzedWeeks).toBe(52);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(150);
      });

      it("should handle zero values in first half only", () => {
        // Arrange: First half avg = 0, Second half avg = 100
        const weeklyTotals = [0, 0, 100, 100];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.STABLE);
        expect(trend.percentChange).toBe(0); // Division by zero case
        expect(trend.startValue).toBe(0);
        expect(trend.endValue).toBe(100);
      });

      it("should handle zero values in second half only", () => {
        // Arrange: First half avg = 100, Second half avg = 0
        const weeklyTotals = [100, 100, 0, 0];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.DECREASING);
        expect(trend.percentChange).toBe(100); // 100% decrease
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(0);
      });

      it("should handle all zero values", () => {
        // Arrange: All weeks have zero activity
        const weeklyTotals = [0, 0, 0, 0];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.STABLE);
        expect(trend.percentChange).toBe(0);
        expect(trend.startValue).toBe(0);
        expect(trend.endValue).toBe(0);
      });

      it("should handle very small values with significant percentage change", () => {
        // Arrange: First half avg = 1, Second half avg = 2 (100% increase)
        const weeklyTotals = [1, 1, 2, 2];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBe(100);
        expect(trend.startValue).toBe(1);
        expect(trend.endValue).toBe(2);
      });

      it("should handle very large values", () => {
        // Arrange: First half avg = 1000000, Second half avg = 1200000 (20% increase)
        const weeklyTotals = [1000000, 1000000, 1200000, 1200000];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBe(20);
        expect(trend.startValue).toBe(1000000);
        expect(trend.endValue).toBe(1200000);
      });

      it("should handle fractional values with precise calculation", () => {
        // Arrange: First half avg = 33.33, Second half avg = 36.66 (approximately 9.99% increase, below 10% threshold)
        const weeklyTotals = [33.33, 33.33, 36.66, 36.66];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.STABLE);
        expect(trend.percentChange).toBeCloseTo(9.99, 1);
        expect(trend.startValue).toBeCloseTo(33.33, 2);
        expect(trend.endValue).toBeCloseTo(36.66, 2);
      });
    });

    describe("edge cases - special patterns", () => {
      it("should handle volatile pattern with overall increasing trend", () => {
        // Arrange: First half avg = 90, Second half avg = 110 (22.2% increase)
        // Pattern shows high volatility but clear upward trend
        const weeklyTotals = [100, 80, 120, 100];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBeCloseTo(22.22, 1);
        expect(trend.startValue).toBe(90);
        expect(trend.endValue).toBe(110);
      });

      it("should handle volatile pattern with overall decreasing trend", () => {
        // Arrange: First half avg = 110, Second half avg = 90 (18.18% decrease)
        const weeklyTotals = [120, 100, 80, 100];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.DECREASING);
        expect(trend.percentChange).toBeCloseTo(18.18, 1);
        expect(trend.startValue).toBe(110);
        expect(trend.endValue).toBe(90);
      });

      it("should handle spike in middle of period", () => {
        // Arrange: First half avg = 100, Second half avg = 100 (stable despite spike)
        const weeklyTotals = [100, 100, 200, 0];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.STABLE);
        expect(trend.percentChange).toBe(0);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(100);
      });

      it("should handle gradual acceleration pattern", () => {
        // Arrange: Exponential-like growth
        // First half: 10, 20 -> avg = 15
        // Second half: 40, 80 -> avg = 60
        const weeklyTotals = [10, 20, 40, 80];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBe(300); // 300% increase
        expect(trend.startValue).toBe(15);
        expect(trend.endValue).toBe(60);
      });

      it("should handle gradual deceleration pattern", () => {
        // Arrange: Declining growth
        // First half: 80, 40 -> avg = 60
        // Second half: 20, 10 -> avg = 15
        const weeklyTotals = [80, 40, 20, 10];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.DECREASING);
        expect(trend.percentChange).toBe(75); // 75% decrease
        expect(trend.startValue).toBe(60);
        expect(trend.endValue).toBe(15);
      });

      it("should handle asymmetric distribution in first half", () => {
        // Arrange: First half highly skewed
        // First half: 1, 199 -> avg = 100
        // Second half: 100, 100 -> avg = 100
        const weeklyTotals = [1, 199, 100, 100];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.STABLE);
        expect(trend.percentChange).toBe(0);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(100);
      });

      it("should handle asymmetric distribution in second half", () => {
        // Arrange: Second half highly skewed
        // First half: 100, 100 -> avg = 100
        // Second half: 1, 199 -> avg = 100
        const weeklyTotals = [100, 100, 1, 199];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.STABLE);
        expect(trend.percentChange).toBe(0);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(100);
      });

      it("should handle negative trend reversal at boundary", () => {
        // Arrange: Decrease then stabilize
        // First half: 200, 200 -> avg = 200
        // Second half: 100, 100 -> avg = 100
        const weeklyTotals = [200, 200, 100, 100];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.DECREASING);
        expect(trend.percentChange).toBe(50);
        expect(trend.startValue).toBe(200);
        expect(trend.endValue).toBe(100);
      });
    });

    describe("edge cases - percentChange calculation precision", () => {
      it("should calculate percentChange with high precision for small changes", () => {
        // Arrange: First half avg = 1000, Second half avg = 1001 (0.1% increase)
        const weeklyTotals = [1000, 1000, 1001, 1001];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.STABLE);
        expect(trend.percentChange).toBeCloseTo(0.1, 2);
      });

      it("should calculate percentChange correctly for 200% increase", () => {
        // Arrange: First half avg = 50, Second half avg = 150 (200% increase)
        const weeklyTotals = [50, 50, 150, 150];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBe(200);
      });

      it("should calculate percentChange correctly for 99% decrease", () => {
        // Arrange: First half avg = 100, Second half avg = 1 (99% decrease)
        const weeklyTotals = [100, 100, 1, 1];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.DECREASING);
        expect(trend.percentChange).toBe(99);
      });

      it("should handle percentChange with repeating decimals", () => {
        // Arrange: First half avg = 3, Second half avg = 4 (33.333...% increase)
        const weeklyTotals = [3, 3, 4, 4];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBeCloseTo(33.333, 2);
      });

      it("should use absolute value for percentChange calculation", () => {
        // Arrange: Test that percentChange is always positive
        const weeklyTotals = [100, 100, 50, 50];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.percentChange).toBe(50); // Should be positive even for decrease
        expect(trend.direction).toBe(TrendDirection.DECREASING);
      });
    });

    describe("error cases - invalid input", () => {
      it("should throw error when fewer than 4 weeks of data provided", () => {
        // Arrange
        const weeklyTotals = [100, 100, 100];

        // Act & Assert
        expect(() => ChangeTrend.analyze(weeklyTotals)).toThrow(
          "Insufficient data for trend analysis: requires at least 4 weeks",
        );
      });

      it("should throw error when 3 weeks of data provided", () => {
        // Arrange
        const weeklyTotals = [100, 200, 300];

        // Act & Assert
        expect(() => ChangeTrend.analyze(weeklyTotals)).toThrow(
          "Insufficient data for trend analysis: requires at least 4 weeks",
        );
      });

      it("should throw error when 2 weeks of data provided", () => {
        // Arrange
        const weeklyTotals = [100, 200];

        // Act & Assert
        expect(() => ChangeTrend.analyze(weeklyTotals)).toThrow(
          "Insufficient data for trend analysis: requires at least 4 weeks",
        );
      });

      it("should throw error when 1 week of data provided", () => {
        // Arrange
        const weeklyTotals = [100];

        // Act & Assert
        expect(() => ChangeTrend.analyze(weeklyTotals)).toThrow(
          "Insufficient data for trend analysis: requires at least 4 weeks",
        );
      });

      it("should throw error when empty array provided", () => {
        // Arrange
        const weeklyTotals: number[] = [];

        // Act & Assert
        expect(() => ChangeTrend.analyze(weeklyTotals)).toThrow(
          "Insufficient data for trend analysis: requires at least 4 weeks",
        );
      });
    });

    describe("immutability - value object semantics", () => {
      it("should have all expected readonly properties accessible", () => {
        // Arrange
        const weeklyTotals = [100, 100, 150, 150];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert: Verify all properties are accessible and have correct values
        // TypeScript's readonly modifier prevents modification at compile time
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBe(50);
        expect(trend.analyzedWeeks).toBe(4);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(150);
      });

      it("should maintain value object semantics with separate instances", () => {
        // Arrange
        const weeklyTotals1 = [100, 100, 150, 150];
        const weeklyTotals2 = [100, 100, 150, 150];

        // Act
        const trend1 = ChangeTrend.analyze(weeklyTotals1);
        const trend2 = ChangeTrend.analyze(weeklyTotals2);

        // Assert: Different instances with same values
        expect(trend1).not.toBe(trend2); // Different references
        expect(trend1.direction).toBe(trend2.direction);
        expect(trend1.percentChange).toBe(trend2.percentChange);
        expect(trend1.analyzedWeeks).toBe(trend2.analyzedWeeks);
        expect(trend1.startValue).toBe(trend2.startValue);
        expect(trend1.endValue).toBe(trend2.endValue);
      });

      it("should not be affected by mutations to input array after creation", () => {
        // Arrange
        const weeklyTotals = [100, 100, 150, 150];
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Act: Mutate original array
        weeklyTotals[0] = 999;
        weeklyTotals[3] = 1;

        // Assert: Trend should remain unchanged
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBe(50);
        expect(trend.startValue).toBe(100);
        expect(trend.endValue).toBe(150);
      });
    });

    describe("real-world scenarios", () => {
      it("should detect holiday slowdown pattern", () => {
        // Arrange: High activity followed by holiday period
        // First half: 500, 480 -> avg = 490
        // Second half: 100, 120 -> avg = 110 (77.55% decrease)
        const weeklyTotals = [500, 480, 100, 120];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.DECREASING);
        expect(trend.percentChange).toBeCloseTo(77.55, 1);
      });

      it("should detect post-launch recovery pattern", () => {
        // Arrange: Low activity followed by post-launch ramp-up
        // First half: 50, 60 -> avg = 55
        // Second half: 200, 250 -> avg = 225 (309% increase)
        const weeklyTotals = [50, 60, 200, 250];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBeCloseTo(309.09, 1);
      });

      it("should detect sprint-based development pattern (stable)", () => {
        // Arrange: Regular sprint cycles with consistent velocity
        // First half: 300, 320 -> avg = 310
        // Second half: 305, 315 -> avg = 310
        const weeklyTotals = [300, 320, 305, 315];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.STABLE);
        expect(trend.percentChange).toBe(0);
      });

      it("should detect burnout pattern (decreasing)", () => {
        // Arrange: Team velocity declining over time
        // First half (3 weeks): 150, 125, 100 -> avg = 125
        // Second half (3 weeks): 75, 50, 25 -> avg = 50
        // Percent change: |50 - 125| / 125 * 100 = 60%
        const weeklyTotals = [150, 125, 100, 75, 50, 25];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.DECREASING);
        expect(trend.percentChange).toBe(60);
      });

      it("should detect scaling team pattern (increasing)", () => {
        // Arrange: New team members ramping up
        // First half (3 weeks): 25, 50, 75 -> avg = 50
        // Second half (3 weeks): 100, 125, 150 -> avg = 125
        // Percent change: |125 - 50| / 50 * 100 = 150%
        const weeklyTotals = [25, 50, 75, 100, 125, 150];

        // Act
        const trend = ChangeTrend.analyze(weeklyTotals);

        // Assert
        expect(trend.direction).toBe(TrendDirection.INCREASING);
        expect(trend.percentChange).toBe(150);
      });
    });
  });

  describe("TrendDirection enum pattern", () => {
    it("should have correct constant values", () => {
      // Assert: Verify enum values match expected strings
      expect(TrendDirection.INCREASING).toBe("increasing");
      expect(TrendDirection.DECREASING).toBe("decreasing");
      expect(TrendDirection.STABLE).toBe("stable");
    });

    it("should be usable in equality comparisons", () => {
      // Arrange
      const weeklyTotals = [100, 100, 150, 150];
      const trend = ChangeTrend.analyze(weeklyTotals);

      // Assert: Can compare using constant
      expect(trend.direction === TrendDirection.INCREASING).toBe(true);
      expect(trend.direction === TrendDirection.DECREASING).toBe(false);
      expect(trend.direction === TrendDirection.STABLE).toBe(false);
    });
  });
});
