import { Result, ok } from "@/lib/result";

/**
 * TrendIndicator Value Object
 *
 * Purpose: Represents a metric trend with direction and percentage change
 *
 * Features:
 * - Trend direction (increasing, decreasing, stable)
 * - Percentage change calculation
 * - Color coding for visualization
 *
 * Domain Rules:
 * - Threshold of ±5% determines stable vs changing
 * - Percentage change is always relative to previous period
 */

export const TrendDirection = {
  INCREASING: "increasing",
  DECREASING: "decreasing",
  STABLE: "stable",
} as const;
export type TrendDirection =
  (typeof TrendDirection)[keyof typeof TrendDirection];

export interface TrendIndicatorProps {
  direction: TrendDirection;
  percentageChange: number;
  comparison?: string; // e.g., "vs last 30 days"
}

export class TrendIndicator {
  private constructor(
    public readonly direction: TrendDirection,
    public readonly percentageChange: number,
    public readonly comparison?: string,
  ) {}

  /**
   * Create TrendIndicator from current and previous values
   *
   * @param current - Current period value
   * @param previous - Previous period value
   * @param comparison - Optional comparison text (e.g., "vs last month")
   * @param threshold - Threshold percentage for stable (default 5%)
   */
  static fromValues(
    current: number,
    previous: number,
    comparison?: string,
    threshold = 5,
  ): Result<TrendIndicator> {
    // Handle edge cases
    if (previous === 0) {
      if (current === 0) {
        // Both zero - stable
        return ok(
          new TrendIndicator(TrendDirection.STABLE, 0, comparison),
        );
      }
      // Previous zero, current non-zero - infinite increase
      return ok(
        new TrendIndicator(TrendDirection.INCREASING, 100, comparison),
      );
    }

    // Calculate percentage change
    const percentageChange = ((current - previous) / previous) * 100;

    // Determine direction based on threshold
    let direction: TrendDirection;
    if (Math.abs(percentageChange) < threshold) {
      direction = TrendDirection.STABLE;
    } else if (percentageChange > 0) {
      direction = TrendDirection.INCREASING;
    } else {
      direction = TrendDirection.DECREASING;
    }

    return ok(
      new TrendIndicator(direction, percentageChange, comparison),
    );
  }

  /**
   * Create TrendIndicator directly from props
   */
  static create(props: TrendIndicatorProps): Result<TrendIndicator> {
    return ok(
      new TrendIndicator(props.direction, props.percentageChange, props.comparison),
    );
  }

  /**
   * Get formatted percentage string (e.g., "+15%", "-8%", "0%")
   */
  get formattedPercentage(): string {
    const abs = Math.abs(this.percentageChange);
    const rounded = Math.round(abs * 10) / 10; // Round to 1 decimal

    if (this.direction === TrendDirection.STABLE) {
      return "0%";
    }

    const sign = this.direction === TrendDirection.INCREASING ? "+" : "-";
    return `${sign}${rounded}%`;
  }

  /**
   * Get arrow symbol for trend (↑, ↓, →)
   */
  get arrow(): string {
    switch (this.direction) {
      case TrendDirection.INCREASING:
        return "↑";
      case TrendDirection.DECREASING:
        return "↓";
      case TrendDirection.STABLE:
        return "→";
    }
  }

  /**
   * Get Tailwind color classes for trend
   */
  get colorClass(): string {
    switch (this.direction) {
      case TrendDirection.INCREASING:
        return "text-green-600 dark:text-green-400";
      case TrendDirection.DECREASING:
        return "text-red-600 dark:text-red-400";
      case TrendDirection.STABLE:
        return "text-gray-600 dark:text-gray-400";
    }
  }

  /**
   * Get background color classes for trend badge
   */
  get bgColorClass(): string {
    switch (this.direction) {
      case TrendDirection.INCREASING:
        return "bg-green-100 dark:bg-green-900/20";
      case TrendDirection.DECREASING:
        return "bg-red-100 dark:bg-red-900/20";
      case TrendDirection.STABLE:
        return "bg-gray-100 dark:bg-gray-900/20";
    }
  }

  /**
   * Check if trend is positive (context-dependent)
   * For most metrics, increasing is positive
   */
  isPositive(): boolean {
    return this.direction === TrendDirection.INCREASING;
  }

  /**
   * Check if trend is negative (context-dependent)
   */
  isNegative(): boolean {
    return this.direction === TrendDirection.DECREASING;
  }
}
