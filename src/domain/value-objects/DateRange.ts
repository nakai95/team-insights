import { Result, ok, err } from "@/lib/result";

export class DateRange {
  private constructor(
    public readonly start: Date,
    public readonly end: Date,
  ) {}

  static create(start: Date, end: Date): Result<DateRange> {
    // Validate start is before end
    if (start >= end) {
      return err(new Error("Start date must be before end date"));
    }

    // Validate both dates are in the past
    const now = new Date();
    if (end > now) {
      return err(new Error("End date cannot be in the future"));
    }

    // Validate maximum range (10 years)
    const tenYearsInMs = 10 * 365 * 24 * 60 * 60 * 1000;
    const rangeInMs = end.getTime() - start.getTime();
    if (rangeInMs > tenYearsInMs) {
      return err(new Error("Date range cannot exceed 10 years"));
    }

    return ok(new DateRange(start, end));
  }

  /**
   * Check if the date range is large and may impact performance
   * Returns true if range exceeds 2 years
   */
  isLargeRange(): boolean {
    const twoYearsInMs = 2 * 365 * 24 * 60 * 60 * 1000;
    const rangeInMs = this.end.getTime() - this.start.getTime();
    return rangeInMs > twoYearsInMs;
  }

  /**
   * Get a warning message for large date ranges
   * Returns null if range is not considered large
   */
  getLargeRangeWarning(): string | null {
    if (!this.isLargeRange()) {
      return null;
    }

    const years = Math.floor(this.durationInDays / 365);
    const months = Math.floor((this.durationInDays % 365) / 30);

    return `Analyzing ${years > 0 ? `${years} year${years > 1 ? "s" : ""}` : ""}${years > 0 && months > 0 ? " and " : ""}${months > 0 ? `${months} month${months > 1 ? "s" : ""}` : ""} of data may take longer and use more resources.`;
  }

  static defaultRange(): DateRange {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);

    const result = DateRange.create(start, end);
    if (!result.ok) {
      throw new Error("Failed to create default date range");
    }
    return result.value;
  }

  static fromMonths(months: number): Result<DateRange> {
    if (months <= 0) {
      return err(new Error("Months must be positive"));
    }

    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);

    return DateRange.create(start, end);
  }

  get durationInDays(): number {
    const diffInMs = this.end.getTime() - this.start.getTime();
    return Math.floor(diffInMs / (24 * 60 * 60 * 1000));
  }

  get durationInMonths(): number {
    const yearsDiff = this.end.getFullYear() - this.start.getFullYear();
    const monthsDiff = this.end.getMonth() - this.start.getMonth();
    return yearsDiff * 12 + monthsDiff;
  }
}
