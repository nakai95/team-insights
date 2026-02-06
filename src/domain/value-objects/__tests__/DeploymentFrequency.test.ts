/**
 * Unit tests for DeploymentFrequency value object
 */

import { describe, it, expect } from "vitest";
import { DeploymentFrequency } from "../DeploymentFrequency";
import { DeploymentEvent } from "../DeploymentEvent";
import { Release } from "@/domain/interfaces/IGitHubRepository";

// Helper to create test release
function createRelease(tagName: string, publishedAt: string): Release {
  return {
    name: tagName,
    tagName,
    createdAt: publishedAt,
    publishedAt,
    isPrerelease: false,
    isDraft: false,
  };
}

// Helper to create deployment events for testing
function createEventsForRange(
  count: number,
  startDate: string,
  intervalDays: number,
): DeploymentEvent[] {
  const events: DeploymentEvent[] = [];
  const start = new Date(startDate);

  for (let i = 0; i < count; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i * intervalDays);

    const release = createRelease(`v${i + 1}.0.0`, date.toISOString());
    events.push(DeploymentEvent.fromRelease(release));
  }

  return events;
}

describe("DeploymentFrequency", () => {
  describe("create", () => {
    it("should return zero values for empty events", () => {
      const frequency = DeploymentFrequency.create([]);

      expect(frequency.totalCount).toBe(0);
      expect(frequency.averagePerWeek).toBe(0);
      expect(frequency.averagePerMonth).toBe(0);
      expect(frequency.periodDays).toBe(0);
      expect(frequency.deploymentsPerYear).toBe(0);
      expect(frequency.weeklyData).toHaveLength(0);
      expect(frequency.monthlyData).toHaveLength(0);
    });

    it("should aggregate events by week correctly", () => {
      const events = [
        DeploymentEvent.fromRelease(
          createRelease("v1.0.0", "2024-01-15T10:00:00Z"),
        ),
        DeploymentEvent.fromRelease(
          createRelease("v1.0.1", "2024-01-16T10:00:00Z"),
        ),
        DeploymentEvent.fromRelease(
          createRelease("v1.0.2", "2024-01-22T10:00:00Z"),
        ),
      ];

      const frequency = DeploymentFrequency.create(events);

      expect(frequency.weeklyData).toHaveLength(2);
      expect(frequency.totalCount).toBe(3);

      // Check that weeks are sorted chronologically (string comparison)
      expect(
        frequency.weeklyData[0]!.weekStartDate <
          frequency.weeklyData[1]!.weekStartDate,
      ).toBe(true);
    });

    it("should aggregate events by month correctly", () => {
      const events = [
        DeploymentEvent.fromRelease(
          createRelease("v1.0.0", "2024-01-15T10:00:00Z"),
        ),
        DeploymentEvent.fromRelease(
          createRelease("v1.0.1", "2024-01-25T10:00:00Z"),
        ),
        DeploymentEvent.fromRelease(
          createRelease("v1.0.2", "2024-02-10T10:00:00Z"),
        ),
      ];

      const frequency = DeploymentFrequency.create(events);

      expect(frequency.monthlyData).toHaveLength(2);
      expect(frequency.monthlyData[0]!.monthKey).toBe("2024-01");
      expect(frequency.monthlyData[0]!.deploymentCount).toBe(2);
      expect(frequency.monthlyData[1]!.monthKey).toBe("2024-02");
      expect(frequency.monthlyData[1]!.deploymentCount).toBe(1);
    });

    it("should calculate correct period days", () => {
      const events = createEventsForRange(3, "2024-01-01T00:00:00Z", 10);
      const frequency = DeploymentFrequency.create(events);

      // First event: Jan 1, Last event: Jan 21 (1 + 10 + 10 days)
      expect(frequency.periodDays).toBe(20);
    });

    it("should calculate average per week correctly", () => {
      const events = createEventsForRange(14, "2024-01-01T00:00:00Z", 1); // 14 events over 14 days
      const frequency = DeploymentFrequency.create(events);

      // 14 events over 13 days (13/7 = ~1.86 weeks)
      expect(frequency.averagePerWeek).toBeCloseTo(14 / (13 / 7), 1);
    });

    it("should calculate average per month correctly", () => {
      const events = createEventsForRange(30, "2024-01-01T00:00:00Z", 1); // 30 events over 30 days
      const frequency = DeploymentFrequency.create(events);

      // 30 events over 29 days (~0.95 months)
      expect(frequency.averagePerMonth).toBeCloseTo(30 / (29 / 30.44), 1);
    });

    it("should calculate deployments per year correctly", () => {
      const events = createEventsForRange(100, "2024-01-01T00:00:00Z", 1); // 100 events over 100 days
      const frequency = DeploymentFrequency.create(events);

      // 100 events over 99 days -> (100/99) * 365 per year
      expect(frequency.deploymentsPerYear).toBeCloseTo((100 / 99) * 365, 0);
    });

    it("should annualize correctly for elite performance", () => {
      // 800 deployments in 365 days (should be Elite: 730+/year)
      const events = createEventsForRange(800, "2024-01-01T00:00:00Z", 0.45); // ~every 11 hours
      const frequency = DeploymentFrequency.create(events);

      expect(frequency.deploymentsPerYear).toBeGreaterThanOrEqual(730);
    });

    it("should handle single event correctly", () => {
      const event = DeploymentEvent.fromRelease(
        createRelease("v1.0.0", "2024-01-15T10:00:00Z"),
      );

      const frequency = DeploymentFrequency.create([event]);

      expect(frequency.totalCount).toBe(1);
      expect(frequency.periodDays).toBe(1); // Minimum 1 day
      expect(frequency.deploymentsPerYear).toBe(365); // 1 deployment per day annualized
    });
  });

  describe("getWeeklyCount", () => {
    it("should return count for existing week", () => {
      const events = createEventsForRange(5, "2024-01-15T10:00:00Z", 1);
      const frequency = DeploymentFrequency.create(events);

      const weekKey = events[0]!.getWeekKey();
      expect(frequency.getWeeklyCount(weekKey)).toBeGreaterThan(0);
    });

    it("should return 0 for non-existing week", () => {
      const events = createEventsForRange(5, "2024-01-15T10:00:00Z", 1);
      const frequency = DeploymentFrequency.create(events);

      expect(frequency.getWeeklyCount("W99-2024")).toBe(0);
    });
  });

  describe("getMonthlyCount", () => {
    it("should return count for existing month", () => {
      const events = createEventsForRange(5, "2024-01-15T10:00:00Z", 1);
      const frequency = DeploymentFrequency.create(events);

      expect(frequency.getMonthlyCount("2024-01")).toBe(5);
    });

    it("should return 0 for non-existing month", () => {
      const events = createEventsForRange(5, "2024-01-15T10:00:00Z", 1);
      const frequency = DeploymentFrequency.create(events);

      expect(frequency.getMonthlyCount("2024-12")).toBe(0);
    });
  });

  describe("getRecentDeployments", () => {
    it("should return N most recent deployments", () => {
      const events = createEventsForRange(10, "2024-01-01T00:00:00Z", 1);
      const frequency = DeploymentFrequency.create(events);

      const recent = frequency.getRecentDeployments(3);

      expect(recent).toHaveLength(3);
      // Should be sorted newest first
      expect(recent[0]!.displayName).toBe("v10.0.0");
      expect(recent[1]!.displayName).toBe("v9.0.0");
      expect(recent[2]!.displayName).toBe("v8.0.0");
    });

    it("should return all events if count > total", () => {
      const events = createEventsForRange(5, "2024-01-01T00:00:00Z", 1);
      const frequency = DeploymentFrequency.create(events);

      const recent = frequency.getRecentDeployments(10);

      expect(recent).toHaveLength(5);
    });
  });

  describe("filterByDateRange", () => {
    it("should filter events by date range", () => {
      const events = createEventsForRange(30, "2024-01-01T00:00:00Z", 1);
      const frequency = DeploymentFrequency.create(events);

      const filtered = frequency.filterByDateRange(
        new Date("2024-01-10"),
        new Date("2024-01-20"),
      );

      expect(filtered.totalCount).toBeLessThan(frequency.totalCount);
      expect(filtered.totalCount).toBeGreaterThan(0);
    });

    it("should return empty when no events in range", () => {
      const events = createEventsForRange(10, "2024-01-01T00:00:00Z", 1);
      const frequency = DeploymentFrequency.create(events);

      const filtered = frequency.filterByDateRange(
        new Date("2025-01-01"),
        new Date("2025-01-31"),
      );

      expect(filtered.totalCount).toBe(0);
    });
  });

  describe("monthlyData format", () => {
    it("should have human-readable month names", () => {
      const events = [
        DeploymentEvent.fromRelease(
          createRelease("v1.0.0", "2024-01-15T10:00:00Z"),
        ),
      ];

      const frequency = DeploymentFrequency.create(events);

      expect(frequency.monthlyData[0]!.monthName).toMatch(/January 2024/);
    });

    it("should have correct ISO month keys", () => {
      const events = [
        DeploymentEvent.fromRelease(
          createRelease("v1.0.0", "2024-01-15T10:00:00Z"),
        ),
      ];

      const frequency = DeploymentFrequency.create(events);

      expect(frequency.monthlyData[0]!.monthKey).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe("validation", () => {
    it("should throw error for negative totalCount", () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        new DeploymentFrequency([], [], [], -1, 0, 0, 0, 0);
      }).toThrow("totalCount must be non-negative");
    });

    it("should throw error for negative periodDays", () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        new DeploymentFrequency([], [], [], 0, 0, 0, -1, 0);
      }).toThrow("periodDays must be non-negative");
    });
  });
});
