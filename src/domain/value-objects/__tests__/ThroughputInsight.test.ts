import { describe, it, expect } from "vitest";
import {
  ThroughputInsight,
  InsightType,
} from "@/domain/value-objects/ThroughputInsight";
import { SizeBucketType } from "@/domain/value-objects/SizeBucket";

describe("ThroughputInsight", () => {
  describe("createFromMetrics", () => {
    describe("insufficient data case", () => {
      it("should return insufficient_data when total PR count is less than 10", () => {
        // Arrange
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 24, prCount: 3 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 48, prCount: 2 },
        ];
        const totalPRCount = 5;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("insufficient_data");
          expect(result.value.message).toContain("Not enough data");
          expect(result.value.message).toContain("at least 10 merged PRs");
          expect(result.value.optimalBucket).toBeNull();
        }
      });

      it("should return insufficient_data when total PR count is exactly 9", () => {
        // Arrange
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 12, prCount: 9 },
        ];
        const totalPRCount = 9;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("insufficient_data");
          expect(result.value.optimalBucket).toBeNull();
        }
      });

      it("should return insufficient_data when total PR count is 0", () => {
        // Arrange
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 0, prCount: 0 },
        ];
        const totalPRCount = 0;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("insufficient_data");
        }
      });
    });

    describe("no difference case", () => {
      it("should return no_difference when all buckets are within 20% of each other", () => {
        // Arrange: min=100, max=110, diff=10% (within 20%)
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 100, prCount: 5 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 105, prCount: 3 },
          { bucket: SizeBucketType.L, averageLeadTimeHours: 110, prCount: 2 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("no_difference");
          expect(result.value.message).toContain("minimal impact");
          expect(result.value.message).toContain("similar merge speeds");
          expect(result.value.optimalBucket).toBeNull();
        }
      });

      it("should return no_difference when max is exactly 20% above min", () => {
        // Arrange: min=100, max=120 (exactly 20%)
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 100, prCount: 5 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 120, prCount: 5 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("no_difference");
        }
      });

      it("should return no_difference when all buckets have identical lead times", () => {
        // Arrange
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 50, prCount: 5 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 50, prCount: 3 },
          { bucket: SizeBucketType.L, averageLeadTimeHours: 50, prCount: 2 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("no_difference");
        }
      });

      it("should return no_difference when only one bucket has PRs", () => {
        // Arrange
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 100, prCount: 10 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 0, prCount: 0 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("no_difference");
        }
      });
    });

    describe("optimal case", () => {
      it("should identify Small as optimal when it has lowest lead time", () => {
        // Arrange: S=24h, M=48h, L=72h (clear difference >20%)
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 24, prCount: 5 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 48, prCount: 3 },
          { bucket: SizeBucketType.L, averageLeadTimeHours: 72, prCount: 2 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("optimal");
          expect(result.value.optimalBucket).toBe(SizeBucketType.S);
          expect(result.value.message).toContain("Small PRs merge fastest");
          expect(result.value.message).toContain(
            "breaking larger changes into smaller",
          );
        }
      });

      it("should identify Medium as optimal when it has lowest lead time", () => {
        // Arrange
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 48, prCount: 3 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 24, prCount: 5 },
          { bucket: SizeBucketType.L, averageLeadTimeHours: 72, prCount: 2 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("optimal");
          expect(result.value.optimalBucket).toBe(SizeBucketType.M);
          expect(result.value.message).toContain("Medium PRs merge fastest");
        }
      });

      it("should identify Large as optimal when it has lowest lead time", () => {
        // Arrange
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 72, prCount: 2 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 48, prCount: 3 },
          { bucket: SizeBucketType.L, averageLeadTimeHours: 24, prCount: 5 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("optimal");
          expect(result.value.optimalBucket).toBe(SizeBucketType.L);
          expect(result.value.message).toContain("Large PRs merge fastest");
        }
      });

      it("should identify Extra Large as optimal when it has lowest lead time", () => {
        // Arrange
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 96, prCount: 2 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 72, prCount: 2 },
          { bucket: SizeBucketType.L, averageLeadTimeHours: 48, prCount: 3 },
          { bucket: SizeBucketType.XL, averageLeadTimeHours: 24, prCount: 3 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("optimal");
          expect(result.value.optimalBucket).toBe(SizeBucketType.XL);
          expect(result.value.message).toContain(
            "Extra Large PRs merge fastest",
          );
        }
      });

      it("should return optimal when max exceeds min by more than 20%", () => {
        // Arrange: min=100, max=121 (21% difference)
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 100, prCount: 5 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 121, prCount: 5 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("optimal");
          expect(result.value.optimalBucket).toBe(SizeBucketType.S);
        }
      });

      it("should select first bucket when multiple buckets have same lowest lead time", () => {
        // Arrange: S and M both have 24h lead time
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 24, prCount: 5 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 24, prCount: 3 },
          { bucket: SizeBucketType.L, averageLeadTimeHours: 72, prCount: 2 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("optimal");
          // Should pick first one in array with lowest value
          expect(result.value.optimalBucket).toBe(SizeBucketType.S);
        }
      });

      it("should ignore buckets with zero PRs when finding optimal", () => {
        // Arrange: M has 0 PRs, so should be ignored
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 48, prCount: 5 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 1, prCount: 0 },
          { bucket: SizeBucketType.L, averageLeadTimeHours: 72, prCount: 5 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("optimal");
          expect(result.value.optimalBucket).toBe(SizeBucketType.S);
        }
      });
    });

    describe("validation errors", () => {
      it("should return error when total PR count is negative", () => {
        // Arrange
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 24, prCount: 5 },
        ];
        const totalPRCount = -1;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "Total PR count cannot be negative",
          );
        }
      });

      it("should return error when bucket metrics array is empty", () => {
        // Arrange
        const bucketMetrics: never[] = [];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "Bucket metrics cannot be empty",
          );
        }
      });

      it("should return error when a bucket has negative PR count", () => {
        // Arrange
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 24, prCount: -5 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 48, prCount: 5 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "PR count cannot be negative for bucket S",
          );
        }
      });

      it("should return error when a bucket has negative lead time", () => {
        // Arrange
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: -24, prCount: 5 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 48, prCount: 5 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "Average lead time cannot be negative for bucket S",
          );
        }
      });

      it("should return error when all buckets have zero PRs despite total count being sufficient", () => {
        // Arrange: totalPRCount=10 but all buckets have 0 PRs (inconsistent data)
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 0, prCount: 0 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 0, prCount: 0 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("No buckets with PRs found");
        }
      });
    });

    describe("edge cases", () => {
      it("should handle zero lead times correctly", () => {
        // Arrange: Some PRs merged instantly (0 hours)
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 0, prCount: 5 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 48, prCount: 5 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("optimal");
          expect(result.value.optimalBucket).toBe(SizeBucketType.S);
        }
      });

      it("should handle all zero lead times as no difference", () => {
        // Arrange: All buckets have 0 lead time
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 0, prCount: 5 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 0, prCount: 5 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("no_difference");
        }
      });

      it("should handle single bucket with sufficient PRs", () => {
        // Arrange: Only one bucket has all PRs
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 24, prCount: 15 },
        ];
        const totalPRCount = 15;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("no_difference");
        }
      });

      it("should handle large lead time values", () => {
        // Arrange: Very large lead times (720h = 30 days)
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 720, prCount: 5 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 1440, prCount: 5 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("optimal");
          expect(result.value.optimalBucket).toBe(SizeBucketType.S);
        }
      });

      it("should handle exactly 10 PRs as sufficient data", () => {
        // Arrange: Boundary case - exactly 10 PRs
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 24, prCount: 5 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 48, prCount: 5 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).not.toBe("insufficient_data");
        }
      });

      it("should handle fractional lead times", () => {
        // Arrange: Lead times with decimals
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 12.5, prCount: 5 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 25.75, prCount: 5 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("optimal");
          expect(result.value.optimalBucket).toBe(SizeBucketType.S);
        }
      });

      it("should handle very small lead time differences", () => {
        // Arrange: min=100, max=100.5 (0.5% difference)
        const bucketMetrics = [
          { bucket: SizeBucketType.S, averageLeadTimeHours: 100, prCount: 5 },
          { bucket: SizeBucketType.M, averageLeadTimeHours: 100.5, prCount: 5 },
        ];
        const totalPRCount = 10;

        // Act
        const result = ThroughputInsight.createFromMetrics(
          bucketMetrics,
          totalPRCount,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("no_difference");
        }
      });
    });
  });

  describe("create", () => {
    describe("successful creation", () => {
      it("should create optimal insight with valid parameters", () => {
        // Arrange
        const type = "optimal";
        const message = "Small PRs merge fastest on average.";
        const optimalBucket = SizeBucketType.S;

        // Act
        const result = ThroughputInsight.create(type, message, optimalBucket);

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe(type);
          expect(result.value.message).toBe(message);
          expect(result.value.optimalBucket).toBe(optimalBucket);
        }
      });

      it("should create no_difference insight with null optimal bucket", () => {
        // Arrange
        const type = "no_difference";
        const message = "All PR sizes show similar merge speeds.";
        const optimalBucket = null;

        // Act
        const result = ThroughputInsight.create(type, message, optimalBucket);

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe(type);
          expect(result.value.message).toBe(message);
          expect(result.value.optimalBucket).toBeNull();
        }
      });

      it("should create insufficient_data insight with null optimal bucket", () => {
        // Arrange
        const type = "insufficient_data";
        const message = "Not enough data to determine optimal PR size.";
        const optimalBucket = null;

        // Act
        const result = ThroughputInsight.create(type, message, optimalBucket);

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe(type);
          expect(result.value.message).toBe(message);
          expect(result.value.optimalBucket).toBeNull();
        }
      });

      it("should trim whitespace from message", () => {
        // Arrange
        const type = "optimal";
        const message = "  Small PRs merge fastest.  ";
        const optimalBucket = SizeBucketType.S;

        // Act
        const result = ThroughputInsight.create(type, message, optimalBucket);

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.message).toBe("Small PRs merge fastest.");
        }
      });

      it("should create optimal insight with all bucket types", () => {
        // Arrange & Act
        const buckets = [
          SizeBucketType.S,
          SizeBucketType.M,
          SizeBucketType.L,
          SizeBucketType.XL,
        ];

        for (const bucket of buckets) {
          const result = ThroughputInsight.create(
            "optimal",
            `${bucket} PRs are best`,
            bucket,
          );

          // Assert
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.value.optimalBucket).toBe(bucket);
          }
        }
      });
    });

    describe("validation errors", () => {
      it("should return error when message is empty string", () => {
        // Arrange
        const type = "optimal";
        const message = "";
        const optimalBucket = SizeBucketType.S;

        // Act
        const result = ThroughputInsight.create(type, message, optimalBucket);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("Message cannot be empty");
        }
      });

      it("should return error when message is only whitespace", () => {
        // Arrange
        const type = "optimal";
        const message = "   ";
        const optimalBucket = SizeBucketType.S;

        // Act
        const result = ThroughputInsight.create(type, message, optimalBucket);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("Message cannot be empty");
        }
      });

      it("should return error when optimal type has null optimal bucket", () => {
        // Arrange
        const type = "optimal";
        const message = "Some message";
        const optimalBucket = null;

        // Act
        const result = ThroughputInsight.create(type, message, optimalBucket);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "Optimal insight type requires a non-null optimal bucket",
          );
        }
      });

      it("should return error when no_difference type has non-null optimal bucket", () => {
        // Arrange
        const type = "no_difference";
        const message = "All sizes are similar";
        const optimalBucket = SizeBucketType.S;

        // Act
        const result = ThroughputInsight.create(type, message, optimalBucket);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "no_difference insight type must have null optimal bucket",
          );
          expect(result.error.message).toContain("got S");
        }
      });

      it("should return error when insufficient_data type has non-null optimal bucket", () => {
        // Arrange
        const type = "insufficient_data";
        const message = "Not enough data";
        const optimalBucket = SizeBucketType.M;

        // Act
        const result = ThroughputInsight.create(type, message, optimalBucket);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "insufficient_data insight type must have null optimal bucket",
          );
          expect(result.error.message).toContain("got M");
        }
      });
    });
  });

  describe("equals", () => {
    it("should return true when all properties are identical", () => {
      // Arrange
      const insight1Result = ThroughputInsight.create(
        "optimal",
        "Small PRs merge fastest",
        SizeBucketType.S,
      );
      const insight2Result = ThroughputInsight.create(
        "optimal",
        "Small PRs merge fastest",
        SizeBucketType.S,
      );

      // Act & Assert
      expect(insight1Result.ok).toBe(true);
      expect(insight2Result.ok).toBe(true);
      if (insight1Result.ok && insight2Result.ok) {
        expect(insight1Result.value.equals(insight2Result.value)).toBe(true);
      }
    });

    it("should return false when types differ", () => {
      // Arrange
      const insight1Result = ThroughputInsight.create(
        "optimal",
        "Small PRs merge fastest",
        SizeBucketType.S,
      );
      const insight2Result = ThroughputInsight.create(
        "no_difference",
        "All sizes are similar",
        null,
      );

      // Act & Assert
      expect(insight1Result.ok).toBe(true);
      expect(insight2Result.ok).toBe(true);
      if (insight1Result.ok && insight2Result.ok) {
        expect(insight1Result.value.equals(insight2Result.value)).toBe(false);
      }
    });

    it("should return false when messages differ", () => {
      // Arrange
      const insight1Result = ThroughputInsight.create(
        "optimal",
        "Small PRs merge fastest",
        SizeBucketType.S,
      );
      const insight2Result = ThroughputInsight.create(
        "optimal",
        "Different message",
        SizeBucketType.S,
      );

      // Act & Assert
      expect(insight1Result.ok).toBe(true);
      expect(insight2Result.ok).toBe(true);
      if (insight1Result.ok && insight2Result.ok) {
        expect(insight1Result.value.equals(insight2Result.value)).toBe(false);
      }
    });

    it("should return false when optimal buckets differ", () => {
      // Arrange
      const insight1Result = ThroughputInsight.create(
        "optimal",
        "Small PRs merge fastest",
        SizeBucketType.S,
      );
      const insight2Result = ThroughputInsight.create(
        "optimal",
        "Small PRs merge fastest",
        SizeBucketType.M,
      );

      // Act & Assert
      expect(insight1Result.ok).toBe(true);
      expect(insight2Result.ok).toBe(true);
      if (insight1Result.ok && insight2Result.ok) {
        expect(insight1Result.value.equals(insight2Result.value)).toBe(false);
      }
    });

    it("should return true when both have null optimal bucket", () => {
      // Arrange
      const insight1Result = ThroughputInsight.create(
        "no_difference",
        "All sizes similar",
        null,
      );
      const insight2Result = ThroughputInsight.create(
        "no_difference",
        "All sizes similar",
        null,
      );

      // Act & Assert
      expect(insight1Result.ok).toBe(true);
      expect(insight2Result.ok).toBe(true);
      if (insight1Result.ok && insight2Result.ok) {
        expect(insight1Result.value.equals(insight2Result.value)).toBe(true);
      }
    });

    it("should return false when one has null and other has non-null optimal bucket", () => {
      // Arrange
      const insight1Result = ThroughputInsight.create(
        "insufficient_data",
        "Not enough data",
        null,
      );
      const insight2Result = ThroughputInsight.create(
        "optimal",
        "Not enough data",
        SizeBucketType.S,
      );

      // Act & Assert
      expect(insight1Result.ok).toBe(true);
      expect(insight2Result.ok).toBe(true);
      if (insight1Result.ok && insight2Result.ok) {
        expect(insight1Result.value.equals(insight2Result.value)).toBe(false);
      }
    });
  });

  describe("toJSON", () => {
    it("should serialize optimal insight correctly", () => {
      // Arrange
      const result = ThroughputInsight.create(
        "optimal",
        "Small PRs merge fastest",
        SizeBucketType.S,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        const json = result.value.toJSON();
        expect(json).toEqual({
          type: "optimal",
          message: "Small PRs merge fastest",
          optimalBucket: SizeBucketType.S,
        });
      }
    });

    it("should serialize no_difference insight correctly", () => {
      // Arrange
      const result = ThroughputInsight.create(
        "no_difference",
        "All sizes similar",
        null,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        const json = result.value.toJSON();
        expect(json).toEqual({
          type: "no_difference",
          message: "All sizes similar",
          optimalBucket: null,
        });
      }
    });

    it("should serialize insufficient_data insight correctly", () => {
      // Arrange
      const result = ThroughputInsight.create(
        "insufficient_data",
        "Not enough data",
        null,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        const json = result.value.toJSON();
        expect(json).toEqual({
          type: "insufficient_data",
          message: "Not enough data",
          optimalBucket: null,
        });
      }
    });

    it("should return plain object that can be JSON stringified", () => {
      // Arrange
      const result = ThroughputInsight.create(
        "optimal",
        "Medium PRs are best",
        SizeBucketType.M,
      );

      // Act & Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        const json = result.value.toJSON();
        const jsonString = JSON.stringify(json);
        const parsed = JSON.parse(jsonString);

        expect(parsed).toEqual({
          type: "optimal",
          message: "Medium PRs are best",
          optimalBucket: SizeBucketType.M,
        });
      }
    });

    it("should preserve all bucket types in JSON", () => {
      // Arrange & Act
      const buckets: Array<"S" | "M" | "L" | "XL"> = ["S", "M", "L", "XL"];

      for (const bucket of buckets) {
        const result = ThroughputInsight.create(
          "optimal",
          `${bucket} is best`,
          bucket,
        );

        // Assert
        expect(result.ok).toBe(true);
        if (result.ok) {
          const json = result.value.toJSON();
          expect(json.optimalBucket).toBe(bucket);
        }
      }
    });
  });
});
