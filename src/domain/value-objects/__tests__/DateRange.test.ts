import { describe, it, expect, beforeEach, vi } from "vitest";
import { DateRange } from "@/domain/value-objects/DateRange";

describe("DateRange", () => {
  beforeEach(() => {
    // Reset any date mocks
    vi.useRealTimers();
  });

  describe("create", () => {
    it("should create valid date range", () => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-06-01");
      const result = DateRange.create(start, end);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.start).toEqual(start);
        expect(result.value.end).toEqual(end);
      }
    });

    it("should reject when start is after end", () => {
      const start = new Date("2024-06-01");
      const end = new Date("2024-01-01");
      const result = DateRange.create(start, end);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Start date must be before end date",
        );
      }
    });

    it("should reject when start equals end", () => {
      const date = new Date("2024-01-01");
      const result = DateRange.create(date, date);

      expect(result.ok).toBe(false);
    });

    it("should reject when end is in the future", () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 1); // Tomorrow
      const result = DateRange.create(start, end);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "End date cannot be in the future",
        );
      }
    });

    it("should reject when range exceeds 10 years", () => {
      const start = new Date("2010-01-01");
      const end = new Date("2025-01-01"); // More than 10 years
      const result = DateRange.create(start, end);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("cannot exceed 10 years");
      }
    });

    it("should accept range just under 10 years", () => {
      const start = new Date("2014-01-01");
      const end = new Date("2023-12-01"); // Under 10 years
      const result = DateRange.create(start, end);

      expect(result.ok).toBe(true);
    });
  });

  describe("defaultRange", () => {
    it("should create 6-month default range", () => {
      const range = DateRange.defaultRange();

      expect(range).toBeDefined();
      expect(range.start < range.end).toBe(true);

      // Check it's approximately 6 months (allow some variance for edge cases)
      const months = range.durationInMonths;
      expect(months).toBeGreaterThanOrEqual(5);
      expect(months).toBeLessThanOrEqual(6);
    });
  });

  describe("fromMonths", () => {
    it("should create range from specified months", () => {
      const result = DateRange.fromMonths(3);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.durationInMonths).toBeGreaterThanOrEqual(2);
        expect(result.value.durationInMonths).toBeLessThanOrEqual(3);
      }
    });

    it("should reject zero months", () => {
      const result = DateRange.fromMonths(0);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Months must be positive");
      }
    });

    it("should reject negative months", () => {
      const result = DateRange.fromMonths(-1);

      expect(result.ok).toBe(false);
    });
  });

  describe("durationInDays", () => {
    it("should calculate duration in days", () => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-01-11");
      const result = DateRange.create(start, end);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.durationInDays).toBe(10);
      }
    });

    it("should calculate duration for longer periods", () => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-12-31");
      const result = DateRange.create(start, end);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // 2024 is a leap year, so 365 days
        expect(result.value.durationInDays).toBe(365);
      }
    });
  });

  describe("durationInMonths", () => {
    it("should calculate duration in months", () => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-07-01");
      const result = DateRange.create(start, end);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.durationInMonths).toBe(6);
      }
    });

    it("should calculate duration across years", () => {
      const start = new Date("2023-06-01");
      const end = new Date("2024-06-01");
      const result = DateRange.create(start, end);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.durationInMonths).toBe(12);
      }
    });
  });
});
