import { describe, it, expect } from "vitest";
import { PRThroughput, DateRange } from "@/domain/entities/PRThroughput";
import { PullRequest } from "@/domain/interfaces/IGitHubRepository";
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

describe("PRThroughput", () => {
  describe("create", () => {
    describe("happy path - normal cases", () => {
      it("should create valid PRThroughput with multiple merged PRs", () => {
        // Arrange
        const pullRequests = [
          createMergedPR({
            number: 1,
            additions: 30,
            deletions: 20,
            createdAt: new Date("2024-01-01T10:00:00Z"),
            mergedAt: new Date("2024-01-02T10:00:00Z"),
          }),
          createMergedPR({
            number: 2,
            additions: 100,
            deletions: 50,
            createdAt: new Date("2024-01-03T10:00:00Z"),
            mergedAt: new Date("2024-01-04T10:00:00Z"),
          }),
          createMergedPR({
            number: 3,
            additions: 250,
            deletions: 150,
            createdAt: new Date("2024-01-05T10:00:00Z"),
            mergedAt: new Date("2024-01-06T10:00:00Z"),
          }),
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = PRThroughput.create(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.repositoryUrl).toBe(
            "https://github.com/owner/repo",
          );
          expect(result.value.totalMergedPRs).toBe(3);
          expect(result.value.dateRange).toEqual(dateRange);
          expect(result.value.prData).toHaveLength(3);
          expect(result.value.sizeBuckets).toHaveLength(4);
          expect(result.value.isValid()).toBe(true);
        }
      });

      it("should create PRThroughput with single merged PR", () => {
        // Arrange
        const pullRequests = [
          createMergedPR({
            number: 1,
            additions: 25,
            deletions: 15,
          }),
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = PRThroughput.create(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.totalMergedPRs).toBe(1);
          expect(result.value.prData).toHaveLength(1);
        }
      });

      it("should create PRThroughput with PRs across all size buckets", () => {
        // Arrange: S(40), M(150), L(400), XL(600)
        const pullRequests = [
          createMergedPR({
            number: 1,
            additions: 20,
            deletions: 20,
            createdAt: new Date("2024-01-01T10:00:00Z"),
            mergedAt: new Date("2024-01-01T12:00:00Z"),
          }), // S: 40 lines, 2h
          createMergedPR({
            number: 2,
            additions: 100,
            deletions: 50,
            createdAt: new Date("2024-01-02T10:00:00Z"),
            mergedAt: new Date("2024-01-02T14:00:00Z"),
          }), // M: 150 lines, 4h
          createMergedPR({
            number: 3,
            additions: 250,
            deletions: 150,
            createdAt: new Date("2024-01-03T10:00:00Z"),
            mergedAt: new Date("2024-01-03T16:00:00Z"),
          }), // L: 400 lines, 6h
          createMergedPR({
            number: 4,
            additions: 400,
            deletions: 200,
            createdAt: new Date("2024-01-04T10:00:00Z"),
            mergedAt: new Date("2024-01-04T18:00:00Z"),
          }), // XL: 600 lines, 8h
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = PRThroughput.create(
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

      it("should trim whitespace from repository URL", () => {
        // Arrange
        const pullRequests = [createMergedPR()];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = PRThroughput.create(
          "  https://github.com/owner/repo  ",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.repositoryUrl).toBe(
            "https://github.com/owner/repo",
          );
        }
      });

      it("should filter out non-merged PRs automatically", () => {
        // Arrange
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
        const result = PRThroughput.create(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.totalMergedPRs).toBe(1);
        }
      });

      it("should create PRThroughput when date range start equals end", () => {
        // Arrange
        const pullRequests = [createMergedPR()];
        const singleDate = new Date("2024-01-15");
        const dateRange: DateRange = {
          start: singleDate,
          end: singleDate,
        };

        // Act
        const result = PRThroughput.create(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.isValid()).toBe(true);
        }
      });
    });

    describe("edge cases - empty data", () => {
      it("should create PRThroughput with no merged PRs", () => {
        // Arrange
        const pullRequests: PullRequest[] = [];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = PRThroughput.create(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.totalMergedPRs).toBe(0);
          expect(result.value.prData).toHaveLength(0);
          expect(result.value.sizeBuckets).toHaveLength(4);
          expect(result.value.averageLeadTimeHours).toBe(0);
          expect(result.value.medianLeadTimeHours).toBe(0);
          expect(result.value.insight.type).toBe(InsightType.INSUFFICIENT_DATA);
        }
      });

      it("should create PRThroughput when all PRs are non-merged", () => {
        // Arrange
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
        const result = PRThroughput.create(
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

      it("should create PRThroughput with PRs having zero additions, deletions, and files", () => {
        // Arrange
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
        const result = PRThroughput.create(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.totalMergedPRs).toBe(1);
          expect(result.value.prData[0]?.size).toBe(0);
        }
      });
    });

    describe("validation errors", () => {
      it("should reject empty repository URL", () => {
        // Arrange
        const pullRequests = [createMergedPR()];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = PRThroughput.create("", pullRequests, dateRange);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "Repository URL cannot be empty",
          );
        }
      });

      it("should reject repository URL with only whitespace", () => {
        // Arrange
        const pullRequests = [createMergedPR()];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };

        // Act
        const result = PRThroughput.create("   ", pullRequests, dateRange);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "Repository URL cannot be empty",
          );
        }
      });

      it("should reject when date range end is before start", () => {
        // Arrange
        const pullRequests = [createMergedPR()];
        const dateRange: DateRange = {
          start: new Date("2024-01-31"),
          end: new Date("2024-01-01"),
        };

        // Act
        const result = PRThroughput.create(
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

      it("should filter out merged PR without mergedAt field", () => {
        // Arrange: PR marked as merged but missing mergedAt gets filtered out
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
        const result = PRThroughput.create(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert: Should succeed with 0 PRs (filtered out)
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.totalMergedPRs).toBe(0);
        }
      });

      it("should reject when merged PR is missing additions field", () => {
        // Arrange
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
        const result = PRThroughput.create(
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

      it("should reject when merged PR is missing deletions field", () => {
        // Arrange
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
        const result = PRThroughput.create(
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

      it("should reject when merged PR is missing changedFiles field", () => {
        // Arrange
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
        const result = PRThroughput.create(
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

      it("should propagate PRThroughputData validation errors", () => {
        // Arrange: PR with invalid data (mergedAt before createdAt)
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
        const result = PRThroughput.create(
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

    describe("insight generation", () => {
      it("should generate optimal insight when sufficient data with clear winner", () => {
        // Arrange: Small PRs merge much faster (10 PRs total)
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
        const result = PRThroughput.create(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.insight.type).toBe(InsightType.OPTIMAL);
          expect(result.value.insight.optimalBucket).toBe(SizeBucketType.S);
        }
      });

      it("should generate no_difference insight when lead times are similar", () => {
        // Arrange: All PRs have similar lead time (within 20%)
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
        const result = PRThroughput.create(
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

      it("should generate insufficient_data insight when less than 10 PRs", () => {
        // Arrange: Only 9 PRs
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
        const result = PRThroughput.create(
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

  describe("totalMergedPRs", () => {
    it("should return count of all merged PRs", () => {
      // Arrange
      const pullRequests = [
        createMergedPR({ number: 1 }),
        createMergedPR({ number: 2 }),
        createMergedPR({ number: 3 }),
      ];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.totalMergedPRs).toBe(3);
      }
    });

    it("should return 0 when no PRs", () => {
      // Arrange
      const pullRequests: PullRequest[] = [];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.totalMergedPRs).toBe(0);
      }
    });
  });

  describe("averageLeadTimeHours", () => {
    it("should calculate average lead time correctly with multiple PRs", () => {
      // Arrange: 24h, 48h, 72h => avg = 48h
      const pullRequests = [
        createMergedPR({
          number: 1,
          createdAt: new Date("2024-01-01T00:00:00Z"),
          mergedAt: new Date("2024-01-02T00:00:00Z"), // 24h
        }),
        createMergedPR({
          number: 2,
          createdAt: new Date("2024-01-03T00:00:00Z"),
          mergedAt: new Date("2024-01-05T00:00:00Z"), // 48h
        }),
        createMergedPR({
          number: 3,
          createdAt: new Date("2024-01-06T00:00:00Z"),
          mergedAt: new Date("2024-01-09T00:00:00Z"), // 72h
        }),
      ];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.averageLeadTimeHours).toBe(48);
      }
    });

    it("should return 0 when no PRs", () => {
      // Arrange
      const pullRequests: PullRequest[] = [];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.averageLeadTimeHours).toBe(0);
      }
    });

    it("should handle single PR correctly", () => {
      // Arrange
      const pullRequests = [
        createMergedPR({
          number: 1,
          createdAt: new Date("2024-01-01T00:00:00Z"),
          mergedAt: new Date("2024-01-01T12:00:00Z"), // 12h
        }),
      ];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.averageLeadTimeHours).toBe(12);
      }
    });

    it("should handle fractional hours correctly", () => {
      // Arrange: 10.5h, 15.5h => avg = 13h
      const pullRequests = [
        createMergedPR({
          number: 1,
          createdAt: new Date("2024-01-01T00:00:00Z"),
          mergedAt: new Date("2024-01-01T10:30:00Z"), // 10.5h
        }),
        createMergedPR({
          number: 2,
          createdAt: new Date("2024-01-02T00:00:00Z"),
          mergedAt: new Date("2024-01-02T15:30:00Z"), // 15.5h
        }),
      ];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.averageLeadTimeHours).toBe(13);
      }
    });
  });

  describe("averageLeadTimeDays", () => {
    it("should convert hours to days correctly", () => {
      // Arrange: 24h, 48h => avg = 36h = 1.5 days
      const pullRequests = [
        createMergedPR({
          number: 1,
          createdAt: new Date("2024-01-01T00:00:00Z"),
          mergedAt: new Date("2024-01-02T00:00:00Z"), // 24h
        }),
        createMergedPR({
          number: 2,
          createdAt: new Date("2024-01-03T00:00:00Z"),
          mergedAt: new Date("2024-01-05T00:00:00Z"), // 48h
        }),
      ];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.averageLeadTimeDays).toBe(1.5);
      }
    });

    it("should return 0 when no PRs", () => {
      // Arrange
      const pullRequests: PullRequest[] = [];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.averageLeadTimeDays).toBe(0);
      }
    });
  });

  describe("medianLeadTimeHours", () => {
    it("should calculate median correctly with odd number of PRs", () => {
      // Arrange: 10h, 20h, 30h => median = 20h
      const pullRequests = [
        createMergedPR({
          number: 1,
          createdAt: new Date("2024-01-01T00:00:00Z"),
          mergedAt: new Date("2024-01-01T10:00:00Z"), // 10h
        }),
        createMergedPR({
          number: 2,
          createdAt: new Date("2024-01-02T00:00:00Z"),
          mergedAt: new Date("2024-01-02T20:00:00Z"), // 20h
        }),
        createMergedPR({
          number: 3,
          createdAt: new Date("2024-01-03T00:00:00Z"),
          mergedAt: new Date("2024-01-04T06:00:00Z"), // 30h
        }),
      ];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.medianLeadTimeHours).toBe(20);
      }
    });

    it("should calculate median correctly with even number of PRs", () => {
      // Arrange: 10h, 20h, 30h, 40h => median = (20+30)/2 = 25h
      const pullRequests = [
        createMergedPR({
          number: 1,
          createdAt: new Date("2024-01-01T00:00:00Z"),
          mergedAt: new Date("2024-01-01T10:00:00Z"), // 10h
        }),
        createMergedPR({
          number: 2,
          createdAt: new Date("2024-01-02T00:00:00Z"),
          mergedAt: new Date("2024-01-02T20:00:00Z"), // 20h
        }),
        createMergedPR({
          number: 3,
          createdAt: new Date("2024-01-03T00:00:00Z"),
          mergedAt: new Date("2024-01-04T06:00:00Z"), // 30h
        }),
        createMergedPR({
          number: 4,
          createdAt: new Date("2024-01-05T00:00:00Z"),
          mergedAt: new Date("2024-01-06T16:00:00Z"), // 40h
        }),
      ];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.medianLeadTimeHours).toBe(25);
      }
    });

    it("should return 0 when no PRs", () => {
      // Arrange
      const pullRequests: PullRequest[] = [];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.medianLeadTimeHours).toBe(0);
      }
    });

    it("should handle single PR correctly", () => {
      // Arrange
      const pullRequests = [
        createMergedPR({
          number: 1,
          createdAt: new Date("2024-01-01T00:00:00Z"),
          mergedAt: new Date("2024-01-01T15:00:00Z"), // 15h
        }),
      ];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.medianLeadTimeHours).toBe(15);
      }
    });

    it("should not be affected by unsorted input order", () => {
      // Arrange: 40h, 10h, 30h, 20h (unsorted) => median = 25h
      const pullRequests = [
        createMergedPR({
          number: 1,
          createdAt: new Date("2024-01-01T00:00:00Z"),
          mergedAt: new Date("2024-01-02T16:00:00Z"), // 40h
        }),
        createMergedPR({
          number: 2,
          createdAt: new Date("2024-01-03T00:00:00Z"),
          mergedAt: new Date("2024-01-03T10:00:00Z"), // 10h
        }),
        createMergedPR({
          number: 3,
          createdAt: new Date("2024-01-05T00:00:00Z"),
          mergedAt: new Date("2024-01-06T06:00:00Z"), // 30h
        }),
        createMergedPR({
          number: 4,
          createdAt: new Date("2024-01-07T00:00:00Z"),
          mergedAt: new Date("2024-01-07T20:00:00Z"), // 20h
        }),
      ];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.medianLeadTimeHours).toBe(25);
      }
    });
  });

  describe("medianLeadTimeDays", () => {
    it("should convert median hours to days correctly", () => {
      // Arrange: 24h, 48h, 72h => median = 48h = 2 days
      const pullRequests = [
        createMergedPR({
          number: 1,
          createdAt: new Date("2024-01-01T00:00:00Z"),
          mergedAt: new Date("2024-01-02T00:00:00Z"), // 24h
        }),
        createMergedPR({
          number: 2,
          createdAt: new Date("2024-01-03T00:00:00Z"),
          mergedAt: new Date("2024-01-05T00:00:00Z"), // 48h
        }),
        createMergedPR({
          number: 3,
          createdAt: new Date("2024-01-06T00:00:00Z"),
          mergedAt: new Date("2024-01-09T00:00:00Z"), // 72h
        }),
      ];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.medianLeadTimeDays).toBe(2);
      }
    });

    it("should return 0 when no PRs", () => {
      // Arrange
      const pullRequests: PullRequest[] = [];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.medianLeadTimeDays).toBe(0);
      }
    });
  });

  describe("isValid", () => {
    describe("valid cases", () => {
      it("should return true for valid PRThroughput with data", () => {
        // Arrange
        const pullRequests = [
          createMergedPR({ number: 1, additions: 20, deletions: 10 }),
          createMergedPR({ number: 2, additions: 100, deletions: 50 }),
          createMergedPR({ number: 3, additions: 250, deletions: 150 }),
          createMergedPR({ number: 4, additions: 400, deletions: 300 }),
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };
        const result = PRThroughput.create(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Act & Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.isValid()).toBe(true);
        }
      });

      it("should return true for empty PRThroughput", () => {
        // Arrange
        const pullRequests: PullRequest[] = [];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };
        const result = PRThroughput.create(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Act & Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.isValid()).toBe(true);
        }
      });

      it("should return true when date range start equals end", () => {
        // Arrange
        const pullRequests = [createMergedPR()];
        const singleDate = new Date("2024-01-15");
        const dateRange: DateRange = {
          start: singleDate,
          end: singleDate,
        };
        const result = PRThroughput.create(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Act & Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.isValid()).toBe(true);
        }
      });
    });

    describe("invariant checks", () => {
      it("should validate that sizeBuckets has exactly 4 elements", () => {
        // Arrange
        const pullRequests = [createMergedPR()];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };
        const result = PRThroughput.create(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Act & Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.sizeBuckets).toHaveLength(4);
          expect(result.value.isValid()).toBe(true);
        }
      });

      it("should validate that sum of bucket PR counts equals total PRs", () => {
        // Arrange
        const pullRequests = [
          createMergedPR({ number: 1, additions: 20, deletions: 10 }), // S
          createMergedPR({ number: 2, additions: 100, deletions: 50 }), // M
          createMergedPR({ number: 3, additions: 250, deletions: 150 }), // L
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };
        const result = PRThroughput.create(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Act & Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          const totalBucketCount = result.value.sizeBuckets.reduce(
            (sum, bucket) => sum + bucket.prCount,
            0,
          );
          expect(totalBucketCount).toBe(result.value.totalMergedPRs);
          expect(result.value.isValid()).toBe(true);
        }
      });

      it("should validate that percentages sum to 100 (within rounding)", () => {
        // Arrange
        const pullRequests = [
          createMergedPR({ number: 1, additions: 20, deletions: 10 }),
          createMergedPR({ number: 2, additions: 100, deletions: 50 }),
          createMergedPR({ number: 3, additions: 250, deletions: 150 }),
        ];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };
        const result = PRThroughput.create(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Act & Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          const totalPercentage = result.value.sizeBuckets.reduce(
            (sum, bucket) => sum + bucket.percentage,
            0,
          );
          expect(Math.abs(totalPercentage - 100)).toBeLessThanOrEqual(0.1);
          expect(result.value.isValid()).toBe(true);
        }
      });

      it("should validate that empty PRThroughput has 0% total percentage", () => {
        // Arrange
        const pullRequests: PullRequest[] = [];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };
        const result = PRThroughput.create(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Act & Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          const totalPercentage = result.value.sizeBuckets.reduce(
            (sum, bucket) => sum + bucket.percentage,
            0,
          );
          expect(totalPercentage).toBe(0);
          expect(result.value.isValid()).toBe(true);
        }
      });

      it("should validate that date range end is not before start", () => {
        // Arrange
        const pullRequests = [createMergedPR()];
        const dateRange: DateRange = {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        };
        const result = PRThroughput.create(
          "https://github.com/owner/repo",
          pullRequests,
          dateRange,
        );

        // Act & Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(
            result.value.dateRange.end >= result.value.dateRange.start,
          ).toBe(true);
          expect(result.value.isValid()).toBe(true);
        }
      });
    });
  });

  describe("sizeBuckets", () => {
    it("should always create exactly 4 size buckets", () => {
      // Arrange
      const pullRequests = [createMergedPR()];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sizeBuckets).toHaveLength(4);
        expect(
          result.value.sizeBuckets.find((b) => b.bucket === SizeBucketType.S),
        ).toBeDefined();
        expect(
          result.value.sizeBuckets.find((b) => b.bucket === SizeBucketType.M),
        ).toBeDefined();
        expect(
          result.value.sizeBuckets.find((b) => b.bucket === SizeBucketType.L),
        ).toBeDefined();
        expect(
          result.value.sizeBuckets.find((b) => b.bucket === SizeBucketType.XL),
        ).toBeDefined();
      }
    });

    it("should distribute PRs correctly across buckets", () => {
      // Arrange: 1 S, 2 M, 3 L, 4 XL
      const pullRequests = [
        createMergedPR({ number: 1, additions: 25, deletions: 15 }), // S: 40
        createMergedPR({ number: 2, additions: 60, deletions: 40 }), // M: 100
        createMergedPR({ number: 3, additions: 70, deletions: 50 }), // M: 120
        createMergedPR({ number: 4, additions: 200, deletions: 100 }), // L: 300
        createMergedPR({ number: 5, additions: 250, deletions: 150 }), // L: 400
        createMergedPR({ number: 6, additions: 300, deletions: 200 }), // L: 500
        createMergedPR({ number: 7, additions: 350, deletions: 200 }), // XL: 550
        createMergedPR({ number: 8, additions: 400, deletions: 300 }), // XL: 700
        createMergedPR({ number: 9, additions: 500, deletions: 400 }), // XL: 900
        createMergedPR({ number: 10, additions: 600, deletions: 500 }), // XL: 1100
      ];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
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
        expect(mBucket?.prCount).toBe(2);
        expect(lBucket?.prCount).toBe(3);
        expect(xlBucket?.prCount).toBe(4);
      }
    });

    it("should have empty buckets when no PRs in that size range", () => {
      // Arrange: Only Small PRs
      const pullRequests = [
        createMergedPR({ number: 1, additions: 10, deletions: 5 }),
        createMergedPR({ number: 2, additions: 15, deletions: 10 }),
      ];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        const mBucket = result.value.sizeBuckets.find(
          (b) => b.bucket === SizeBucketType.M,
        );
        const lBucket = result.value.sizeBuckets.find(
          (b) => b.bucket === SizeBucketType.L,
        );
        const xlBucket = result.value.sizeBuckets.find(
          (b) => b.bucket === SizeBucketType.XL,
        );

        expect(mBucket?.prCount).toBe(0);
        expect(lBucket?.prCount).toBe(0);
        expect(xlBucket?.prCount).toBe(0);
      }
    });
  });

  describe("integration with value objects", () => {
    it("should correctly use PRThroughputData for calculations", () => {
      // Arrange
      const pullRequests = [
        createMergedPR({
          number: 1,
          title: "Feature A",
          author: "alice",
          createdAt: new Date("2024-01-01T00:00:00Z"),
          mergedAt: new Date("2024-01-02T00:00:00Z"),
          additions: 30,
          deletions: 20,
          changedFiles: 5,
        }),
      ];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        const prData = result.value.prData[0];
        expect(prData).toBeDefined();
        if (prData) {
          expect(prData.prNumber).toBe(1);
          expect(prData.title).toBe("Feature A");
          expect(prData.author).toBe("alice");
          expect(prData.size).toBe(50); // 30 + 20
          expect(prData.leadTimeHours).toBe(24);
          expect(prData.sizeBucket).toBe(SizeBucketType.S);
        }
      }
    });

    it("should correctly use SizeBucket for grouping", () => {
      // Arrange
      const pullRequests = [
        createMergedPR({
          number: 1,
          additions: 20,
          deletions: 10,
          createdAt: new Date("2024-01-01T00:00:00Z"),
          mergedAt: new Date("2024-01-01T10:00:00Z"),
        }), // S: 30 lines, 10h
        createMergedPR({
          number: 2,
          additions: 25,
          deletions: 15,
          createdAt: new Date("2024-01-02T00:00:00Z"),
          mergedAt: new Date("2024-01-02T20:00:00Z"),
        }), // S: 40 lines, 20h
      ];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        const sBucket = result.value.sizeBuckets.find(
          (b) => b.bucket === SizeBucketType.S,
        );
        expect(sBucket?.prCount).toBe(2);
        expect(sBucket?.averageLeadTimeHours).toBe(15); // (10+20)/2
        expect(sBucket?.percentage).toBe(100);
      }
    });

    it("should correctly use ThroughputInsight for analysis", () => {
      // Arrange: Create scenario with clear optimal bucket
      const pullRequests = [
        ...Array.from({ length: 6 }, (_, i) =>
          createMergedPR({
            number: i + 1,
            additions: 20,
            deletions: 10,
            createdAt: new Date("2024-01-01T00:00:00Z"),
            mergedAt: new Date("2024-01-01T05:00:00Z"), // 5h
          }),
        ),
        ...Array.from({ length: 4 }, (_, i) =>
          createMergedPR({
            number: i + 7,
            additions: 400,
            deletions: 300,
            createdAt: new Date("2024-01-02T00:00:00Z"),
            mergedAt: new Date("2024-01-03T00:00:00Z"), // 24h
          }),
        ),
      ];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.insight.type).toBe(InsightType.OPTIMAL);
        expect(result.value.insight.optimalBucket).toBe(SizeBucketType.S);
        expect(result.value.insight.message).toContain(
          "Small PRs merge fastest",
        );
      }
    });
  });

  describe("analyzedAt timestamp", () => {
    it("should set analyzedAt to current time when created", () => {
      // Arrange
      const pullRequests = [createMergedPR()];
      const dateRange: DateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const beforeCreate = new Date();

      // Act
      const result = PRThroughput.create(
        "https://github.com/owner/repo",
        pullRequests,
        dateRange,
      );

      const afterCreate = new Date();

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.analyzedAt.getTime()).toBeGreaterThanOrEqual(
          beforeCreate.getTime(),
        );
        expect(result.value.analyzedAt.getTime()).toBeLessThanOrEqual(
          afterCreate.getTime(),
        );
      }
    });
  });
});
