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
