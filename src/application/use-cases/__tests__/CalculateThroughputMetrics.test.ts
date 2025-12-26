import { describe, it, expect } from "vitest";
import { CalculateThroughputMetrics } from "../CalculateThroughputMetrics";
import { PullRequest } from "@/domain/interfaces/IGitHubRepository";
import { DateRange } from "@/domain/entities/PRThroughput";
import { SizeBucketType } from "@/domain/value-objects/SizeBucket";
import { InsightType } from "@/domain/value-objects/ThroughputInsight";

// Helper function to create a valid merged PullRequest
function createMergedPR(
  overrides: Partial<
    PullRequest & {
      mergedAt?: Date;
      additions?: number;
      deletions?: number;
      changedFiles?: number;
    }
  > = {},
): PullRequest & {
  mergedAt: Date;
  additions: number;
  deletions: number;
  changedFiles: number;
} {
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

describe("CalculateThroughputMetrics", () => {
  describe("execute", () => {
    describe("happy path - normal cases", () => {
      it("should calculate throughput metrics with valid merged PRs", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [
          createMergedPR({
            number: 1,
            additions: 30,
            deletions: 20,
            createdAt: new Date("2024-01-01T10:00:00Z"),
            mergedAt: new Date("2024-01-02T10:00:00Z"), // 24h
          }),
          createMergedPR({
            number: 2,
            additions: 100,
            deletions: 50,
            createdAt: new Date("2024-01-03T10:00:00Z"),
            mergedAt: new Date("2024-01-04T10:00:00Z"), // 24h
          }),
          createMergedPR({
            number: 3,
            additions: 250,
            deletions: 150,
            createdAt: new Date("2024-01-05T10:00:00Z"),
            mergedAt: new Date("2024-01-06T10:00:00Z"), // 24h
          }),
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.totalMergedPRs).toBe(3);
          expect(result.value.averageLeadTimeHours).toBe(24);
          expect(result.value.medianLeadTimeHours).toBe(24);
          expect(result.value.sizeBuckets).toHaveLength(4);
          expect(result.value.scatterData).toHaveLength(3);
        }
      });

      it("should calculate throughput metrics with single merged PR", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [
          createMergedPR({
            number: 1,
            additions: 25,
            deletions: 15,
            createdAt: new Date("2024-01-01T10:00:00Z"),
            mergedAt: new Date("2024-01-01T22:00:00Z"), // 12h
          }),
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.totalMergedPRs).toBe(1);
          expect(result.value.averageLeadTimeHours).toBe(12);
          expect(result.value.medianLeadTimeHours).toBe(12);
          expect(result.value.averageLeadTimeDays).toBe(0.5);
          expect(result.value.medianLeadTimeDays).toBe(0.5);
        }
      });

      it("should calculate throughput metrics with PRs across all size buckets", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [
          createMergedPR({
            number: 1,
            additions: 20,
            deletions: 20,
            createdAt: new Date("2024-01-01T10:00:00Z"),
            mergedAt: new Date("2024-01-01T12:00:00Z"),
          }), // S: 40 lines
          createMergedPR({
            number: 2,
            additions: 100,
            deletions: 50,
            createdAt: new Date("2024-01-02T10:00:00Z"),
            mergedAt: new Date("2024-01-02T14:00:00Z"),
          }), // M: 150 lines
          createMergedPR({
            number: 3,
            additions: 250,
            deletions: 150,
            createdAt: new Date("2024-01-03T10:00:00Z"),
            mergedAt: new Date("2024-01-03T16:00:00Z"),
          }), // L: 400 lines
          createMergedPR({
            number: 4,
            additions: 400,
            deletions: 200,
            createdAt: new Date("2024-01-04T10:00:00Z"),
            mergedAt: new Date("2024-01-04T18:00:00Z"),
          }), // XL: 600 lines
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.totalMergedPRs).toBe(4);
          expect(result.value.sizeBuckets).toHaveLength(4);

          const sBucket = result.value.sizeBuckets.find(
            (b) => b.bucket === SizeBucketType.S,
          );
          const mBucket = result.value.sizeBuckets.find(
            (b) => b.bucket === SizeBucketType.M,
          );
          const lBucket = result.value.sizeBuckets.find(
            (b) => b.bucket === SizeBucketType.L,
          );
          const xlBucket = result.value.sizeBuckets.find(
            (b) => b.bucket === SizeBucketType.XL,
          );

          expect(sBucket?.prCount).toBe(1);
          expect(mBucket?.prCount).toBe(1);
          expect(lBucket?.prCount).toBe(1);
          expect(xlBucket?.prCount).toBe(1);
        }
      });

      it("should correctly convert domain entity to DTO", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [
          createMergedPR({
            number: 1,
            title: "Feature A",
            author: "alice",
            additions: 30,
            deletions: 20,
            createdAt: new Date("2024-01-01T00:00:00Z"),
            mergedAt: new Date("2024-01-02T00:00:00Z"), // 24h
          }),
          createMergedPR({
            number: 2,
            title: "Feature B",
            author: "bob",
            additions: 100,
            deletions: 50,
            createdAt: new Date("2024-01-03T00:00:00Z"),
            mergedAt: new Date("2024-01-05T00:00:00Z"), // 48h
          }),
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          // Verify DTO structure
          expect(result.value).toHaveProperty("totalMergedPRs");
          expect(result.value).toHaveProperty("averageLeadTimeHours");
          expect(result.value).toHaveProperty("averageLeadTimeDays");
          expect(result.value).toHaveProperty("medianLeadTimeHours");
          expect(result.value).toHaveProperty("medianLeadTimeDays");
          expect(result.value).toHaveProperty("scatterData");
          expect(result.value).toHaveProperty("sizeBuckets");
          expect(result.value).toHaveProperty("insight");

          // Verify scatter data mapping
          expect(result.value.scatterData).toHaveLength(2);
          expect(result.value.scatterData[0]).toEqual({
            prNumber: 1,
            size: 50, // 30 + 20
            leadTime: 24,
          });
          expect(result.value.scatterData[1]).toEqual({
            prNumber: 2,
            size: 150, // 100 + 50
            leadTime: 48,
          });

          // Verify size buckets
          expect(result.value.sizeBuckets).toHaveLength(4);

          // Verify insight
          expect(result.value.insight).toHaveProperty("type");
          expect(result.value.insight).toHaveProperty("message");
          expect(result.value.insight).toHaveProperty("optimalBucket");
        }
      });

      it("should trim whitespace from repository URL", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [createMergedPR()];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "  https://github.com/owner/repo  ",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.totalMergedPRs).toBe(1);
        }
      });
    });

    describe("edge cases - empty and filtered data", () => {
      it("should handle empty pull requests array", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests: PullRequest[] = [];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.totalMergedPRs).toBe(0);
          expect(result.value.averageLeadTimeHours).toBe(0);
          expect(result.value.medianLeadTimeHours).toBe(0);
          expect(result.value.scatterData).toHaveLength(0);
          expect(result.value.insight.type).toBe(InsightType.INSUFFICIENT_DATA);
        }
      });

      it("should filter out non-merged PRs automatically", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests: PullRequest[] = [
          createMergedPR({ number: 1 }),
          {
            number: 2,
            title: "Open PR",
            author: "user",
            createdAt: new Date("2024-01-01"),
            state: "open",
            reviewCommentCount: 0,
          },
          {
            number: 3,
            title: "Closed PR",
            author: "user",
            createdAt: new Date("2024-01-01"),
            state: "closed",
            reviewCommentCount: 0,
          },
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.totalMergedPRs).toBe(1);
          expect(result.value.scatterData).toHaveLength(1);
        }
      });

      it("should handle all non-merged PRs by returning empty metrics", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
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
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.totalMergedPRs).toBe(0);
          expect(result.value.averageLeadTimeHours).toBe(0);
          expect(result.value.medianLeadTimeHours).toBe(0);
        }
      });

      it("should handle merged PR without mergedAt field by filtering it out", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests: PullRequest[] = [
          {
            number: 1,
            title: "PR with no mergedAt",
            author: "user",
            createdAt: new Date("2024-01-01"),
            state: "merged",
            reviewCommentCount: 0,
          },
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.totalMergedPRs).toBe(0);
        }
      });

      it("should handle PRs with zero additions, deletions, and files", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [
          createMergedPR({
            number: 1,
            additions: 0,
            deletions: 0,
            changedFiles: 0,
          }),
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.totalMergedPRs).toBe(1);
          expect(result.value.scatterData[0]?.size).toBe(0);
        }
      });
    });

    describe("validation errors", () => {
      it("should reject empty repository URL", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [createMergedPR()];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute("", pullRequests, dateRange);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toBe("Repository URL cannot be empty");
        }
      });

      it("should reject repository URL with only whitespace", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [createMergedPR()];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute("   ", pullRequests, dateRange);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toBe("Repository URL cannot be empty");
        }
      });

      it("should reject null pull requests array", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          null as unknown as PullRequest[],
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toBe(
            "Pull requests array cannot be null or undefined",
          );
        }
      });

      it("should reject undefined pull requests array", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          undefined as unknown as PullRequest[],
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toBe(
            "Pull requests array cannot be null or undefined",
          );
        }
      });

      it("should reject null date range", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [createMergedPR()];

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          null as unknown as DateRange,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toBe(
            "Date range cannot be null or undefined",
          );
        }
      });

      it("should reject undefined date range", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [createMergedPR()];

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          undefined as unknown as DateRange,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toBe(
            "Date range cannot be null or undefined",
          );
        }
      });

      it("should reject date range missing start date", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [createMergedPR()];
        const dateRange = {
          end: new Date("2024-01-31"),
        } as DateRange;

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toBe(
            "Date range must have both start and end dates",
          );
        }
      });

      it("should reject date range missing end date", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [createMergedPR()];
        const dateRange = {
          start: new Date("2024-01-01"),
        } as DateRange;

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toBe(
            "Date range must have both start and end dates",
          );
        }
      });

      it("should reject date range with both start and end missing", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [createMergedPR()];
        const dateRange = {} as DateRange;

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toBe(
            "Date range must have both start and end dates",
          );
        }
      });
    });

    describe("error propagation from PRThroughput.create", () => {
      it("should propagate error when date range end is before start", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [createMergedPR()];
        const dateRange: DateRange = {
          start: new Date("2024-01-31"),
          end: new Date("2024-01-01"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "Date range end cannot be before start",
          );
        }
      });

      it("should propagate error when merged PR is missing additions field", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [
          {
            number: 1,
            title: "PR",
            author: "user",
            createdAt: new Date("2024-01-01"),
            state: "merged" as const,
            reviewCommentCount: 0,
            mergedAt: new Date("2024-01-02"),
            deletions: 5,
            changedFiles: 2,
          } as PullRequest & {
            mergedAt: Date;
            deletions: number;
            changedFiles: number;
          },
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "PR #1 is missing additions field",
          );
        }
      });

      it("should propagate error when merged PR is missing deletions field", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [
          {
            number: 2,
            title: "PR",
            author: "user",
            createdAt: new Date("2024-01-01"),
            state: "merged" as const,
            reviewCommentCount: 0,
            mergedAt: new Date("2024-01-02"),
            additions: 10,
            changedFiles: 2,
          } as PullRequest & {
            mergedAt: Date;
            additions: number;
            changedFiles: number;
          },
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "PR #2 is missing deletions field",
          );
        }
      });

      it("should propagate error when merged PR is missing changedFiles field", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [
          {
            number: 3,
            title: "PR",
            author: "user",
            createdAt: new Date("2024-01-01"),
            state: "merged" as const,
            reviewCommentCount: 0,
            mergedAt: new Date("2024-01-02"),
            additions: 10,
            deletions: 5,
          } as PullRequest & {
            mergedAt: Date;
            additions: number;
            deletions: number;
          },
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "PR #3 is missing changedFiles field",
          );
        }
      });

      it("should propagate error when PR has invalid data (mergedAt before createdAt)", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = [
          createMergedPR({
            number: 1,
            createdAt: new Date("2024-01-05"),
            mergedAt: new Date("2024-01-01"),
          }),
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "Failed to create PRThroughputData",
          );
          expect(result.error.message).toContain("PR #1");
        }
      });
    });

    describe("insight generation through DTO", () => {
      it("should include optimal insight when sufficient data with clear winner", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        // Create 10 PRs: 5 small (fast merge) + 5 XL (slow merge)
        const pullRequests = [
          ...Array.from({ length: 5 }, (_, i) =>
            createMergedPR({
              number: i + 1,
              additions: 20,
              deletions: 10,
              createdAt: new Date("2024-01-01T10:00:00Z"),
              mergedAt: new Date("2024-01-01T12:00:00Z"), // 2h
            }),
          ),
          ...Array.from({ length: 5 }, (_, i) =>
            createMergedPR({
              number: i + 6,
              additions: 300,
              deletions: 250,
              createdAt: new Date("2024-01-02T10:00:00Z"),
              mergedAt: new Date("2024-01-03T10:00:00Z"), // 24h
            }),
          ),
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.insight.type).toBe(InsightType.OPTIMAL);
          expect(result.value.insight.optimalBucket).toBe(SizeBucketType.S);
          expect(result.value.insight.message).toContain(
            "Small PRs merge fastest",
          );
        }
      });

      it("should include no_difference insight when lead times are similar", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        // Create 10 PRs with similar lead times
        const pullRequests = [
          ...Array.from({ length: 5 }, (_, i) =>
            createMergedPR({
              number: i + 1,
              additions: 20,
              deletions: 10,
              createdAt: new Date("2024-01-01T10:00:00Z"),
              mergedAt: new Date("2024-01-01T20:00:00Z"), // 10h
            }),
          ),
          ...Array.from({ length: 5 }, (_, i) =>
            createMergedPR({
              number: i + 6,
              additions: 300,
              deletions: 250,
              createdAt: new Date("2024-01-02T10:00:00Z"),
              mergedAt: new Date("2024-01-02T21:00:00Z"), // 11h
            }),
          ),
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.insight.type).toBe(InsightType.NO_DIFFERENCE);
          expect(result.value.insight.optimalBucket).toBeNull();
        }
      });

      it("should include insufficient_data insight when less than 10 PRs", () => {
        // Arrange
        const useCase = new CalculateThroughputMetrics();
        const pullRequests = Array.from({ length: 9 }, (_, i) =>
          createMergedPR({
            number: i + 1,
            additions: 20,
            deletions: 10,
          }),
        );
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = useCase.execute(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.insight.type).toBe(InsightType.INSUFFICIENT_DATA);
          expect(result.value.insight.optimalBucket).toBeNull();
        }
      });
    });
  });
});
