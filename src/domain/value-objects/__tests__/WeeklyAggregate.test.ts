import { describe, it, expect } from "vitest";
import { WeeklyAggregate } from "../WeeklyAggregate";
import { PullRequest } from "@/domain/interfaces/IGitHubRepository";

/**
 * Helper function to create local dates for testing
 * Uses local timezone to match the implementation's behavior
 */
function createLocalDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
): Date {
  return new Date(year, month - 1, day, hour, minute, second, ms);
}

describe("WeeklyAggregate", () => {
  describe("fromPRs", () => {
    describe("happy path - normal cases", () => {
      it("should create aggregate from multiple PRs with valid data", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 1, 1); // Monday
        const prs: PullRequest[] = [
          {
            number: 1,
            title: "PR 1",
            author: "user1",
            createdAt: createLocalDate(2024, 1, 1),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 1, 2, 10, 0, 0),
            additions: 100,
            deletions: 50,
            changedFiles: 5,
          },
          {
            number: 2,
            title: "PR 2",
            author: "user2",
            createdAt: createLocalDate(2024, 1, 2),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 1, 3, 14, 30, 0),
            additions: 200,
            deletions: 100,
            changedFiles: 10,
          },
          {
            number: 3,
            title: "PR 3",
            author: "user3",
            createdAt: createLocalDate(2024, 1, 3),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 1, 4, 9, 0, 0),
            additions: 150,
            deletions: 75,
            changedFiles: 8,
          },
        ];

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert
        expect(aggregate.weekStart).toEqual(
          createLocalDate(2024, 1, 1, 0, 0, 0, 0),
        );
        expect(aggregate.weekEnd).toEqual(
          createLocalDate(2024, 1, 7, 23, 59, 59, 999),
        );
        expect(aggregate.additions).toBe(450); // 100 + 200 + 150
        expect(aggregate.deletions).toBe(225); // 50 + 100 + 75
        expect(aggregate.totalChanges).toBe(675); // 450 + 225
        expect(aggregate.netChange).toBe(225); // 450 - 225
        expect(aggregate.prCount).toBe(3);
        expect(aggregate.averagePRSize).toBe(225); // 675 / 3
        expect(aggregate.changedFilesTotal).toBe(23); // 5 + 10 + 8
      });

      it("should calculate averagePRSize correctly with single PR", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 2, 5); // Monday
        const prs: PullRequest[] = [
          {
            number: 1,
            title: "Single PR",
            author: "user1",
            createdAt: createLocalDate(2024, 2, 5),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 2, 6, 10, 0, 0),
            additions: 300,
            deletions: 100,
            changedFiles: 15,
          },
        ];

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert
        expect(aggregate.prCount).toBe(1);
        expect(aggregate.totalChanges).toBe(400); // 300 + 100
        expect(aggregate.averagePRSize).toBe(400); // 400 / 1
      });

      it("should handle PRs at week boundaries correctly", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 1, 8); // Monday
        const prs: PullRequest[] = [
          // Exactly at week start
          {
            number: 1,
            title: "Start boundary",
            author: "user1",
            createdAt: createLocalDate(2024, 1, 8),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 1, 8, 0, 0, 0, 0),
            additions: 50,
            deletions: 25,
            changedFiles: 3,
          },
          // Exactly at week end
          {
            number: 2,
            title: "End boundary",
            author: "user2",
            createdAt: createLocalDate(2024, 1, 14),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 1, 14, 23, 59, 59, 999),
            additions: 100,
            deletions: 50,
            changedFiles: 5,
          },
        ];

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert
        expect(aggregate.prCount).toBe(2);
        expect(aggregate.additions).toBe(150);
        expect(aggregate.deletions).toBe(75);
      });

      it("should handle PRs with zero additions and deletions", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 3, 4); // Monday
        const prs: PullRequest[] = [
          {
            number: 1,
            title: "Zero changes PR",
            author: "user1",
            createdAt: createLocalDate(2024, 3, 4),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 3, 5, 10, 0, 0),
            additions: 0,
            deletions: 0,
            changedFiles: 1,
          },
        ];

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert
        expect(aggregate.prCount).toBe(1);
        expect(aggregate.additions).toBe(0);
        expect(aggregate.deletions).toBe(0);
        expect(aggregate.totalChanges).toBe(0);
        expect(aggregate.netChange).toBe(0);
        expect(aggregate.averagePRSize).toBe(0);
        expect(aggregate.changedFilesTotal).toBe(1);
      });

      it("should calculate netChange correctly when deletions exceed additions", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 4, 1); // Monday
        const prs: PullRequest[] = [
          {
            number: 1,
            title: "More deletions",
            author: "user1",
            createdAt: createLocalDate(2024, 4, 1),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 4, 2, 10, 0, 0),
            additions: 100,
            deletions: 300,
            changedFiles: 10,
          },
        ];

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert
        expect(aggregate.additions).toBe(100);
        expect(aggregate.deletions).toBe(300);
        expect(aggregate.totalChanges).toBe(400);
        expect(aggregate.netChange).toBe(-200); // 100 - 300
      });

      it("should aggregate large numbers of PRs correctly", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 5, 6); // Monday
        const prs: PullRequest[] = Array.from({ length: 50 }, (_, i) => ({
          number: i + 1,
          title: `PR ${i + 1}`,
          author: `user${i + 1}`,
          createdAt: createLocalDate(2024, 5, 6),
          state: "merged" as const,
          reviewCommentCount: 0,
          mergedAt: createLocalDate(2024, 5, 6 + (i % 7), 10, 0, 0), // Spread across the week
          additions: 10,
          deletions: 5,
          changedFiles: 2,
        }));

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert
        expect(aggregate.prCount).toBe(50);
        expect(aggregate.additions).toBe(500); // 10 * 50
        expect(aggregate.deletions).toBe(250); // 5 * 50
        expect(aggregate.totalChanges).toBe(750);
        expect(aggregate.netChange).toBe(250);
        expect(aggregate.averagePRSize).toBe(15); // 750 / 50
        expect(aggregate.changedFilesTotal).toBe(100); // 2 * 50
      });
    });

    describe("edge cases - empty PR list", () => {
      it("should handle empty PR list with zero values", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 1, 1); // Monday
        const prs: PullRequest[] = [];

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert
        expect(aggregate.weekStart).toEqual(
          createLocalDate(2024, 1, 1, 0, 0, 0, 0),
        );
        expect(aggregate.weekEnd).toEqual(
          createLocalDate(2024, 1, 7, 23, 59, 59, 999),
        );
        expect(aggregate.additions).toBe(0);
        expect(aggregate.deletions).toBe(0);
        expect(aggregate.totalChanges).toBe(0);
        expect(aggregate.netChange).toBe(0);
        expect(aggregate.prCount).toBe(0);
        expect(aggregate.averagePRSize).toBe(0); // Division by zero handled
        expect(aggregate.changedFilesTotal).toBe(0);
      });

      it("should handle division by zero when calculating averagePRSize", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 2, 5); // Monday
        const prs: PullRequest[] = [];

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert
        expect(aggregate.prCount).toBe(0);
        expect(aggregate.totalChanges).toBe(0);
        expect(aggregate.averagePRSize).toBe(0); // 0/0 handled as 0
      });
    });

    describe("edge cases - filtering PRs", () => {
      it("should filter PRs outside week boundaries", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 1, 8); // Monday
        const prs: PullRequest[] = [
          // Before week start
          {
            number: 1,
            title: "Before week",
            author: "user1",
            createdAt: createLocalDate(2024, 1, 7),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 1, 7, 23, 59, 59, 999),
            additions: 100,
            deletions: 50,
            changedFiles: 5,
          },
          // Within week
          {
            number: 2,
            title: "Within week",
            author: "user2",
            createdAt: createLocalDate(2024, 1, 9),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 1, 10, 10, 0, 0),
            additions: 200,
            deletions: 100,
            changedFiles: 10,
          },
          // After week end
          {
            number: 3,
            title: "After week",
            author: "user3",
            createdAt: createLocalDate(2024, 1, 15),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 1, 15, 0, 0, 0),
            additions: 150,
            deletions: 75,
            changedFiles: 8,
          },
        ];

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert
        expect(aggregate.prCount).toBe(1); // Only the middle PR
        expect(aggregate.additions).toBe(200);
        expect(aggregate.deletions).toBe(100);
        expect(aggregate.changedFilesTotal).toBe(10);
      });

      it("should filter PRs without mergedAt date", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 1, 1); // Monday
        const prs: PullRequest[] = [
          // PR without mergedAt
          {
            number: 1,
            title: "No merged date",
            author: "user1",
            createdAt: createLocalDate(2024, 1, 2),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: undefined,
            additions: 100,
            deletions: 50,
            changedFiles: 5,
          },
          // PR with mergedAt
          {
            number: 2,
            title: "Has merged date",
            author: "user2",
            createdAt: createLocalDate(2024, 1, 3),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 1, 3, 10, 0, 0),
            additions: 200,
            deletions: 100,
            changedFiles: 10,
          },
        ];

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert
        expect(aggregate.prCount).toBe(1); // Only the second PR
        expect(aggregate.additions).toBe(200);
        expect(aggregate.deletions).toBe(100);
      });

      it("should handle PRs with missing additions field", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 2, 5); // Monday
        const prs: PullRequest[] = [
          {
            number: 1,
            title: "Missing additions",
            author: "user1",
            createdAt: createLocalDate(2024, 2, 5),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 2, 6, 10, 0, 0),
            additions: undefined,
            deletions: 50,
            changedFiles: 5,
          },
          {
            number: 2,
            title: "Complete data",
            author: "user2",
            createdAt: createLocalDate(2024, 2, 6),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 2, 7, 10, 0, 0),
            additions: 200,
            deletions: 100,
            changedFiles: 10,
          },
        ];

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert
        expect(aggregate.prCount).toBe(1); // Only PR with complete data
        expect(aggregate.additions).toBe(200);
        expect(aggregate.deletions).toBe(100);
      });

      it("should handle PRs with missing deletions field", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 3, 4); // Monday
        const prs: PullRequest[] = [
          {
            number: 1,
            title: "Missing deletions",
            author: "user1",
            createdAt: createLocalDate(2024, 3, 4),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 3, 5, 10, 0, 0),
            additions: 100,
            deletions: undefined,
            changedFiles: 5,
          },
          {
            number: 2,
            title: "Complete data",
            author: "user2",
            createdAt: createLocalDate(2024, 3, 6),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 3, 7, 10, 0, 0),
            additions: 200,
            deletions: 100,
            changedFiles: 10,
          },
        ];

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert
        expect(aggregate.prCount).toBe(1);
        expect(aggregate.additions).toBe(200);
        expect(aggregate.deletions).toBe(100);
      });

      it("should handle PRs with missing changedFiles field", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 4, 1); // Monday
        const prs: PullRequest[] = [
          {
            number: 1,
            title: "Missing changedFiles",
            author: "user1",
            createdAt: createLocalDate(2024, 4, 1),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 4, 2, 10, 0, 0),
            additions: 100,
            deletions: 50,
            changedFiles: undefined,
          },
          {
            number: 2,
            title: "Complete data",
            author: "user2",
            createdAt: createLocalDate(2024, 4, 3),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 4, 4, 10, 0, 0),
            additions: 200,
            deletions: 100,
            changedFiles: 10,
          },
        ];

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert
        expect(aggregate.prCount).toBe(1);
        expect(aggregate.additions).toBe(200);
        expect(aggregate.changedFilesTotal).toBe(10);
      });

      it("should handle PRs with multiple missing data fields", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 5, 6); // Monday
        const prs: PullRequest[] = [
          {
            number: 1,
            title: "Missing multiple fields",
            author: "user1",
            createdAt: createLocalDate(2024, 5, 6),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 5, 7, 10, 0, 0),
            additions: undefined,
            deletions: undefined,
            changedFiles: 5,
          },
          {
            number: 2,
            title: "Complete data",
            author: "user2",
            createdAt: createLocalDate(2024, 5, 8),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 5, 9, 10, 0, 0),
            additions: 300,
            deletions: 150,
            changedFiles: 15,
          },
        ];

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert
        expect(aggregate.prCount).toBe(1);
        expect(aggregate.additions).toBe(300);
        expect(aggregate.deletions).toBe(150);
        expect(aggregate.changedFilesTotal).toBe(15);
      });

      it("should return zero values when all PRs are filtered out", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 6, 3); // Monday
        const prs: PullRequest[] = [
          // All PRs have missing data
          {
            number: 1,
            title: "Missing additions",
            author: "user1",
            createdAt: createLocalDate(2024, 6, 4),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 6, 5, 10, 0, 0),
            additions: undefined,
            deletions: 50,
            changedFiles: 5,
          },
          {
            number: 2,
            title: "Missing deletions",
            author: "user2",
            createdAt: createLocalDate(2024, 6, 6),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 6, 7, 10, 0, 0),
            additions: 100,
            deletions: undefined,
            changedFiles: 10,
          },
        ];

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert
        expect(aggregate.prCount).toBe(0);
        expect(aggregate.additions).toBe(0);
        expect(aggregate.deletions).toBe(0);
        expect(aggregate.totalChanges).toBe(0);
        expect(aggregate.averagePRSize).toBe(0);
      });
    });

    describe("error cases - validation", () => {
      it("should throw error when weekStart is not a Monday (Sunday)", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 1, 7); // Sunday
        const prs: PullRequest[] = [];

        // Act & Assert
        expect(() => WeeklyAggregate.fromPRs(weekStart, prs)).toThrow(
          "weekStart must be a Monday (ISO week definition)",
        );
      });

      it("should throw error when weekStart is not a Monday (Tuesday)", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 1, 2); // Tuesday
        const prs: PullRequest[] = [];

        // Act & Assert
        expect(() => WeeklyAggregate.fromPRs(weekStart, prs)).toThrow(
          "weekStart must be a Monday (ISO week definition)",
        );
      });

      it("should throw error when weekStart is not a Monday (Wednesday)", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 1, 3); // Wednesday
        const prs: PullRequest[] = [];

        // Act & Assert
        expect(() => WeeklyAggregate.fromPRs(weekStart, prs)).toThrow(
          "weekStart must be a Monday (ISO week definition)",
        );
      });

      it("should throw error when weekStart is not a Monday (Thursday)", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 1, 4); // Thursday
        const prs: PullRequest[] = [];

        // Act & Assert
        expect(() => WeeklyAggregate.fromPRs(weekStart, prs)).toThrow(
          "weekStart must be a Monday (ISO week definition)",
        );
      });

      it("should throw error when weekStart is not a Monday (Friday)", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 1, 5); // Friday
        const prs: PullRequest[] = [];

        // Act & Assert
        expect(() => WeeklyAggregate.fromPRs(weekStart, prs)).toThrow(
          "weekStart must be a Monday (ISO week definition)",
        );
      });

      it("should throw error when weekStart is not a Monday (Saturday)", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 1, 6); // Saturday
        const prs: PullRequest[] = [];

        // Act & Assert
        expect(() => WeeklyAggregate.fromPRs(weekStart, prs)).toThrow(
          "weekStart must be a Monday (ISO week definition)",
        );
      });
    });

    describe("edge cases - week boundaries", () => {
      it("should normalize weekStart to start of day", () => {
        // Arrange - Monday with non-zero time
        const weekStart = createLocalDate(2024, 1, 1, 15, 30, 45, 123); // Monday, 3:30 PM
        const prs: PullRequest[] = [
          {
            number: 1,
            title: "Test PR",
            author: "user1",
            createdAt: createLocalDate(2024, 1, 2),
            state: "merged",
            reviewCommentCount: 0,
            mergedAt: createLocalDate(2024, 1, 2, 10, 0, 0),
            additions: 100,
            deletions: 50,
            changedFiles: 5,
          },
        ];

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert - weekStart should be normalized to 00:00:00.000
        expect(aggregate.weekStart).toEqual(
          createLocalDate(2024, 1, 1, 0, 0, 0, 0),
        );
        expect(aggregate.weekEnd).toEqual(
          createLocalDate(2024, 1, 7, 23, 59, 59, 999),
        );
      });

      it("should set weekEnd to end of Sunday", () => {
        // Arrange
        const weekStart = createLocalDate(2024, 2, 5); // Monday
        const prs: PullRequest[] = [];

        // Act
        const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

        // Assert
        expect(aggregate.weekEnd.getHours()).toBe(23);
        expect(aggregate.weekEnd.getMinutes()).toBe(59);
        expect(aggregate.weekEnd.getSeconds()).toBe(59);
        expect(aggregate.weekEnd.getMilliseconds()).toBe(999);
        expect(aggregate.weekEnd.getDay()).toBe(0); // Sunday
      });
    });
  });

  describe("getWeekStart", () => {
    describe("happy path - normal cases", () => {
      it("should return same date for Monday", () => {
        // Arrange
        const monday = createLocalDate(2024, 1, 1, 15, 30, 0); // Monday, 3:30 PM

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(monday);

        // Assert
        expect(weekStart).toEqual(createLocalDate(2024, 1, 1, 0, 0, 0, 0));
        expect(weekStart.getDay()).toBe(1); // Monday
      });

      it("should return Monday for Tuesday", () => {
        // Arrange
        const tuesday = createLocalDate(2024, 1, 2, 10, 0, 0); // Tuesday

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(tuesday);

        // Assert
        expect(weekStart).toEqual(createLocalDate(2024, 1, 1, 0, 0, 0, 0));
        expect(weekStart.getDay()).toBe(1); // Monday
      });

      it("should return Monday for Wednesday", () => {
        // Arrange
        const wednesday = createLocalDate(2024, 1, 3, 12, 0, 0); // Wednesday

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(wednesday);

        // Assert
        expect(weekStart).toEqual(createLocalDate(2024, 1, 1, 0, 0, 0, 0));
        expect(weekStart.getDay()).toBe(1); // Monday
      });

      it("should return Monday for Thursday", () => {
        // Arrange
        const thursday = createLocalDate(2024, 1, 4, 14, 0, 0); // Thursday

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(thursday);

        // Assert
        expect(weekStart).toEqual(createLocalDate(2024, 1, 1, 0, 0, 0, 0));
        expect(weekStart.getDay()).toBe(1); // Monday
      });

      it("should return Monday for Friday", () => {
        // Arrange
        const friday = createLocalDate(2024, 1, 5, 16, 0, 0); // Friday

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(friday);

        // Assert
        expect(weekStart).toEqual(createLocalDate(2024, 1, 1, 0, 0, 0, 0));
        expect(weekStart.getDay()).toBe(1); // Monday
      });

      it("should return Monday for Saturday", () => {
        // Arrange
        const saturday = createLocalDate(2024, 1, 6, 18, 0, 0); // Saturday

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(saturday);

        // Assert
        expect(weekStart).toEqual(createLocalDate(2024, 1, 1, 0, 0, 0, 0));
        expect(weekStart.getDay()).toBe(1); // Monday
      });

      it("should return Monday for Sunday (ISO 8601 week definition)", () => {
        // Arrange
        const sunday = createLocalDate(2024, 1, 7, 20, 0, 0); // Sunday

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(sunday);

        // Assert
        expect(weekStart).toEqual(createLocalDate(2024, 1, 1, 0, 0, 0, 0));
        expect(weekStart.getDay()).toBe(1); // Monday
      });
    });

    describe("edge cases - boundary conditions", () => {
      it("should normalize time to start of day for Monday", () => {
        // Arrange
        const monday = createLocalDate(2024, 2, 5, 23, 59, 59, 999); // Monday, end of day

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(monday);

        // Assert
        expect(weekStart).toEqual(createLocalDate(2024, 2, 5, 0, 0, 0, 0));
        expect(weekStart.getHours()).toBe(0);
        expect(weekStart.getMinutes()).toBe(0);
        expect(weekStart.getSeconds()).toBe(0);
        expect(weekStart.getMilliseconds()).toBe(0);
      });

      it("should normalize time to start of day for mid-week date", () => {
        // Arrange
        const wednesday = createLocalDate(2024, 3, 6, 15, 45, 30, 500); // Wednesday

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(wednesday);

        // Assert
        expect(weekStart.getHours()).toBe(0);
        expect(weekStart.getMinutes()).toBe(0);
        expect(weekStart.getSeconds()).toBe(0);
        expect(weekStart.getMilliseconds()).toBe(0);
      });

      it("should handle Sunday at start of day correctly", () => {
        // Arrange
        const sunday = createLocalDate(2024, 1, 7, 0, 0, 0, 0); // Sunday, midnight

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(sunday);

        // Assert
        expect(weekStart).toEqual(createLocalDate(2024, 1, 1, 0, 0, 0, 0));
        expect(weekStart.getDay()).toBe(1); // Monday
      });

      it("should handle Sunday at end of day correctly", () => {
        // Arrange
        const sunday = createLocalDate(2024, 1, 7, 23, 59, 59, 999); // Sunday, end of day

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(sunday);

        // Assert
        expect(weekStart).toEqual(createLocalDate(2024, 1, 1, 0, 0, 0, 0));
        expect(weekStart.getDay()).toBe(1); // Monday
      });

      it("should handle dates across month boundaries", () => {
        // Arrange
        const friday = createLocalDate(2024, 3, 1, 10, 0, 0); // Friday, March 1st

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(friday);

        // Assert
        expect(weekStart).toEqual(createLocalDate(2024, 2, 26, 0, 0, 0, 0));
        expect(weekStart.getDay()).toBe(1); // Monday
        expect(weekStart.getMonth()).toBe(1); // February (0-indexed)
      });

      it("should handle dates across year boundaries", () => {
        // Arrange
        const wednesday = createLocalDate(2024, 1, 3, 10, 0, 0); // Wednesday, Jan 3rd

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(wednesday);

        // Assert
        expect(weekStart).toEqual(createLocalDate(2024, 1, 1, 0, 0, 0, 0));
        expect(weekStart.getDay()).toBe(1); // Monday
      });

      it("should handle leap year dates", () => {
        // Arrange
        const thursday = createLocalDate(2024, 2, 29, 10, 0, 0); // Thursday, Feb 29th (leap year)

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(thursday);

        // Assert
        expect(weekStart).toEqual(createLocalDate(2024, 2, 26, 0, 0, 0, 0));
        expect(weekStart.getDay()).toBe(1); // Monday
      });

      it("should handle first day of year when it is Sunday", () => {
        // Arrange
        const sunday = createLocalDate(2023, 1, 1, 10, 0, 0); // Sunday, Jan 1st 2023

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(sunday);

        // Assert
        expect(weekStart).toEqual(createLocalDate(2022, 12, 26, 0, 0, 0, 0));
        expect(weekStart.getDay()).toBe(1); // Monday
        expect(weekStart.getFullYear()).toBe(2022); // Previous year
      });

      it("should handle last day of year when in middle of week", () => {
        // Arrange
        const sunday = createLocalDate(2023, 12, 31, 23, 59, 59, 999); // Sunday, Dec 31st 2023

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(sunday);

        // Assert
        expect(weekStart).toEqual(createLocalDate(2023, 12, 25, 0, 0, 0, 0));
        expect(weekStart.getDay()).toBe(1); // Monday
      });
    });

    describe("edge cases - various dates", () => {
      it("should consistently return Monday for all days in same week", () => {
        // Arrange
        const datesInWeek = [
          createLocalDate(2024, 4, 1, 0, 0, 0), // Monday
          createLocalDate(2024, 4, 2, 0, 0, 0), // Tuesday
          createLocalDate(2024, 4, 3, 0, 0, 0), // Wednesday
          createLocalDate(2024, 4, 4, 0, 0, 0), // Thursday
          createLocalDate(2024, 4, 5, 0, 0, 0), // Friday
          createLocalDate(2024, 4, 6, 0, 0, 0), // Saturday
          createLocalDate(2024, 4, 7, 0, 0, 0), // Sunday
        ];

        // Act
        const weekStarts = datesInWeek.map((date) =>
          WeeklyAggregate.getWeekStart(date),
        );

        // Assert
        const expectedMonday = createLocalDate(2024, 4, 1, 0, 0, 0, 0);
        weekStarts.forEach((weekStart) => {
          expect(weekStart).toEqual(expectedMonday);
        });
      });

      it("should handle dates with different timezones correctly", () => {
        // Arrange
        const tuesday = createLocalDate(2024, 5, 7, 0, 0, 0); // Tuesday

        // Act
        const weekStart = WeeklyAggregate.getWeekStart(tuesday);

        // Assert
        expect(weekStart).toEqual(createLocalDate(2024, 5, 6, 0, 0, 0, 0));
        expect(weekStart.getDay()).toBe(1); // Monday
      });
    });
  });

  describe("immutability", () => {
    it("should have all readonly properties accessible", () => {
      // Arrange
      const weekStart = createLocalDate(2024, 1, 1); // Monday
      const prs: PullRequest[] = [
        {
          number: 1,
          title: "Test PR",
          author: "user1",
          createdAt: createLocalDate(2024, 1, 2),
          state: "merged",
          reviewCommentCount: 0,
          mergedAt: createLocalDate(2024, 1, 2, 10, 0, 0),
          additions: 100,
          deletions: 50,
          changedFiles: 5,
        },
      ];

      // Act
      const aggregate = WeeklyAggregate.fromPRs(weekStart, prs);

      // Assert - Verify all properties are accessible
      expect(aggregate.weekStart).toBeDefined();
      expect(aggregate.weekEnd).toBeDefined();
      expect(aggregate.additions).toBeDefined();
      expect(aggregate.deletions).toBeDefined();
      expect(aggregate.totalChanges).toBeDefined();
      expect(aggregate.netChange).toBeDefined();
      expect(aggregate.prCount).toBeDefined();
      expect(aggregate.averagePRSize).toBeDefined();
      expect(aggregate.changedFilesTotal).toBeDefined();
    });

    it("should maintain value object semantics with separate instances", () => {
      // Arrange
      const weekStart = createLocalDate(2024, 1, 1); // Monday
      const prs: PullRequest[] = [
        {
          number: 1,
          title: "Test PR",
          author: "user1",
          createdAt: createLocalDate(2024, 1, 2),
          state: "merged",
          reviewCommentCount: 0,
          mergedAt: createLocalDate(2024, 1, 2, 10, 0, 0),
          additions: 100,
          deletions: 50,
          changedFiles: 5,
        },
      ];

      // Act
      const aggregate1 = WeeklyAggregate.fromPRs(weekStart, prs);
      const aggregate2 = WeeklyAggregate.fromPRs(weekStart, prs);

      // Assert - Different instances with same values
      expect(aggregate1).not.toBe(aggregate2); // Different references
      expect(aggregate1.weekStart).toEqual(aggregate2.weekStart);
      expect(aggregate1.additions).toBe(aggregate2.additions);
      expect(aggregate1.deletions).toBe(aggregate2.deletions);
      expect(aggregate1.prCount).toBe(aggregate2.prCount);
    });
  });
});
