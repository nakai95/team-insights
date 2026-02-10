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

  /**
   * Create DateRange for last 7 days
   */
  static last7Days(): DateRange {
    const end = new Date();
    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return new DateRange(start, end);
  }

  /**
   * Create DateRange for last 30 days
   */
  static last30Days(): DateRange {
    const end = new Date();
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return new DateRange(start, end);
  }

  /**
   * Create DateRange for last 90 days
   */
  static last90Days(): DateRange {
    const end = new Date();
    const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    return new DateRange(start, end);
  }

  /**
   * Create DateRange for last 6 months (~180 days)
   */
  static last6Months(): DateRange {
    const end = new Date();
    const start = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    return new DateRange(start, end);
  }

  /**
   * Create DateRange for last 1 year (~365 days)
   */
  static lastYear(): DateRange {
    const end = new Date();
    const start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    return new DateRange(start, end);
  }

  /**
   * Check if a date falls within this range (inclusive)
   *
   * @param date - Date to check
   * @returns true if date is within range
   */
  contains(date: Date): boolean {
    const time = date.getTime();
    return time >= this.start.getTime() && time <= this.end.getTime();
  }

  /**
   * Check if this range overlaps with another range
   *
   * @param other - Another DateRange
   * @returns true if ranges overlap
   */
  overlaps(other: DateRange): boolean {
    return this.start <= other.end && this.end >= other.start;
  }

  /**
   * Split this date range into chunks of specified size
   *
   * @param chunkDays - Size of each chunk in days
   * @returns Array of DateRange chunks
   *
   * @example
   * const range = DateRange.lastYear();
   * const chunks = range.split(90); // Split into 90-day chunks
   * // Returns ~4 chunks covering the full year
   */
  split(chunkDays: number): DateRange[] {
    if (chunkDays <= 0) {
      throw new Error("Chunk size must be positive");
    }

    const chunks: DateRange[] = [];
    const chunkMilliseconds = chunkDays * 24 * 60 * 60 * 1000;

    let currentStart = new Date(this.start);
    while (currentStart < this.end) {
      const currentEnd = new Date(
        Math.min(
          currentStart.getTime() + chunkMilliseconds,
          this.end.getTime(),
        ),
      );

      chunks.push(new DateRange(currentStart, currentEnd));

      currentStart = new Date(currentEnd.getTime() + 1); // Move to next millisecond
    }

    return chunks;
  }

  /**
   * Convert to ISO string representation
   *
   * @returns String in format "start:end" with ISO dates
   */
  toISOString(): string {
    return `${this.start.toISOString()}:${this.end.toISOString()}`;
  }

  /**
   * Check equality with another DateRange
   *
   * @param other - Another DateRange
   * @returns true if both ranges have same start and end
   */
  equals(other: DateRange): boolean {
    return (
      this.start.getTime() === other.start.getTime() &&
      this.end.getTime() === other.end.getTime()
    );
  }
}
