import { describe, it, expect } from "vitest";
import {
  SizeBucket,
  SizeBucketType,
  type PRThroughputData,
} from "../SizeBucket";

describe("SizeBucket", () => {
  describe("fromPRs", () => {
    describe("happy path - normal cases", () => {
      it("should create Small bucket with valid data and correct calculations", () => {
        // Arrange
        const prs: PRThroughputData[] = [
          { leadTimeHours: 24 },
          { leadTimeHours: 48 },
          { leadTimeHours: 72 },
        ];
        const totalPRCount = 10;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.S, prs, totalPRCount);

        // Assert
        expect(bucket.bucket).toBe(SizeBucketType.S);
        expect(bucket.lineRange).toBe("1-50");
        expect(bucket.prCount).toBe(3);
        expect(bucket.averageLeadTimeHours).toBe(48); // (24+48+72)/3
        expect(bucket.percentage).toBe(30); // 3/10 * 100
        expect(bucket.isValid()).toBe(true);
      });

      it("should create Medium bucket with correct line range", () => {
        // Arrange
        const prs: PRThroughputData[] = [{ leadTimeHours: 100 }];
        const totalPRCount = 5;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.M, prs, totalPRCount);

        // Assert
        expect(bucket.bucket).toBe(SizeBucketType.M);
        expect(bucket.lineRange).toBe("51-200");
        expect(bucket.prCount).toBe(1);
        expect(bucket.percentage).toBe(20);
      });

      it("should create Large bucket with correct line range", () => {
        // Arrange
        const prs: PRThroughputData[] = [{ leadTimeHours: 200 }];
        const totalPRCount = 4;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.L, prs, totalPRCount);

        // Assert
        expect(bucket.bucket).toBe(SizeBucketType.L);
        expect(bucket.lineRange).toBe("201-500");
        expect(bucket.prCount).toBe(1);
        expect(bucket.percentage).toBe(25);
      });

      it("should create Extra Large bucket with correct line range", () => {
        // Arrange
        const prs: PRThroughputData[] = [{ leadTimeHours: 500 }];
        const totalPRCount = 2;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.XL, prs, totalPRCount);

        // Assert
        expect(bucket.bucket).toBe(SizeBucketType.XL);
        expect(bucket.lineRange).toBe("501+");
        expect(bucket.prCount).toBe(1);
        expect(bucket.percentage).toBe(50);
      });

      it("should calculate average lead time correctly with multiple PRs", () => {
        // Arrange
        const prs: PRThroughputData[] = [
          { leadTimeHours: 10 },
          { leadTimeHours: 20 },
          { leadTimeHours: 30 },
          { leadTimeHours: 40 },
          { leadTimeHours: 50 },
        ];
        const totalPRCount = 5;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.S, prs, totalPRCount);

        // Assert
        expect(bucket.averageLeadTimeHours).toBe(30); // (10+20+30+40+50)/5
        expect(bucket.prCount).toBe(5);
      });

      it("should calculate percentage correctly when all PRs in one bucket", () => {
        // Arrange
        const prs: PRThroughputData[] = [
          { leadTimeHours: 10 },
          { leadTimeHours: 20 },
        ];
        const totalPRCount = 2;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.M, prs, totalPRCount);

        // Assert
        expect(bucket.percentage).toBe(100); // 2/2 * 100
      });

      it("should handle decimal percentages correctly", () => {
        // Arrange
        const prs: PRThroughputData[] = [{ leadTimeHours: 24 }];
        const totalPRCount = 3;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.S, prs, totalPRCount);

        // Assert
        expect(bucket.percentage).toBeCloseTo(33.333, 2); // 1/3 * 100
      });

      it("should handle decimal average lead time correctly", () => {
        // Arrange
        const prs: PRThroughputData[] = [
          { leadTimeHours: 10 },
          { leadTimeHours: 15 },
        ];
        const totalPRCount = 10;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.L, prs, totalPRCount);

        // Assert
        expect(bucket.averageLeadTimeHours).toBe(12.5); // (10+15)/2
      });
    });

    describe("edge cases - empty buckets", () => {
      it("should create empty Small bucket when no PRs provided", () => {
        // Arrange
        const prs: PRThroughputData[] = [];
        const totalPRCount = 10;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.S, prs, totalPRCount);

        // Assert
        expect(bucket.bucket).toBe(SizeBucketType.S);
        expect(bucket.lineRange).toBe("1-50");
        expect(bucket.prCount).toBe(0);
        expect(bucket.averageLeadTimeHours).toBe(0);
        expect(bucket.percentage).toBe(0);
        expect(bucket.isValid()).toBe(true);
      });

      it("should create empty Medium bucket when no PRs provided", () => {
        // Arrange
        const prs: PRThroughputData[] = [];
        const totalPRCount = 5;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.M, prs, totalPRCount);

        // Assert
        expect(bucket.prCount).toBe(0);
        expect(bucket.averageLeadTimeHours).toBe(0);
        expect(bucket.percentage).toBe(0);
      });

      it("should create empty Large bucket when no PRs provided", () => {
        // Arrange
        const prs: PRThroughputData[] = [];
        const totalPRCount = 1;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.L, prs, totalPRCount);

        // Assert
        expect(bucket.prCount).toBe(0);
        expect(bucket.averageLeadTimeHours).toBe(0);
        expect(bucket.percentage).toBe(0);
      });

      it("should create empty Extra Large bucket when no PRs provided", () => {
        // Arrange
        const prs: PRThroughputData[] = [];
        const totalPRCount = 20;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.XL, prs, totalPRCount);

        // Assert
        expect(bucket.prCount).toBe(0);
        expect(bucket.averageLeadTimeHours).toBe(0);
        expect(bucket.percentage).toBe(0);
      });
    });

    describe("edge cases - boundary values", () => {
      it("should handle single PR in bucket", () => {
        // Arrange
        const prs: PRThroughputData[] = [{ leadTimeHours: 100 }];
        const totalPRCount = 1;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.S, prs, totalPRCount);

        // Assert
        expect(bucket.prCount).toBe(1);
        expect(bucket.averageLeadTimeHours).toBe(100);
        expect(bucket.percentage).toBe(100);
      });

      it("should handle zero lead time hours", () => {
        // Arrange
        const prs: PRThroughputData[] = [
          { leadTimeHours: 0 },
          { leadTimeHours: 0 },
        ];
        const totalPRCount = 10;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.M, prs, totalPRCount);

        // Assert
        expect(bucket.averageLeadTimeHours).toBe(0);
        expect(bucket.prCount).toBe(2);
        expect(bucket.percentage).toBe(20);
      });

      it("should handle very large lead time hours", () => {
        // Arrange
        const prs: PRThroughputData[] = [
          { leadTimeHours: 10000 },
          { leadTimeHours: 20000 },
        ];
        const totalPRCount = 2;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.XL, prs, totalPRCount);

        // Assert
        expect(bucket.averageLeadTimeHours).toBe(15000);
        expect(bucket.prCount).toBe(2);
      });

      it("should handle very large PR count", () => {
        // Arrange
        const prs: PRThroughputData[] = Array.from({ length: 1000 }, () => ({
          leadTimeHours: 50,
        }));
        const totalPRCount = 1000;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.S, prs, totalPRCount);

        // Assert
        expect(bucket.prCount).toBe(1000);
        expect(bucket.averageLeadTimeHours).toBe(50);
        expect(bucket.percentage).toBe(100);
      });

      it("should handle fractional lead times that result in whole number average", () => {
        // Arrange
        const prs: PRThroughputData[] = [
          { leadTimeHours: 12.5 },
          { leadTimeHours: 37.5 },
        ];
        const totalPRCount = 5;

        // Act
        const bucket = SizeBucket.fromPRs(SizeBucketType.L, prs, totalPRCount);

        // Assert
        expect(bucket.averageLeadTimeHours).toBe(25);
      });
    });
  });

  describe("averageLeadTimeDays", () => {
    it("should convert hours to days correctly", () => {
      // Arrange
      const prs: PRThroughputData[] = [{ leadTimeHours: 48 }];
      const totalPRCount = 1;
      const bucket = SizeBucket.fromPRs("S", prs, totalPRCount);

      // Act
      const days = bucket.averageLeadTimeDays;

      // Assert
      expect(days).toBe(2); // 48/24
    });

    it("should return 0 days for empty bucket", () => {
      // Arrange
      const prs: PRThroughputData[] = [];
      const totalPRCount = 10;
      const bucket = SizeBucket.fromPRs("M", prs, totalPRCount);

      // Act
      const days = bucket.averageLeadTimeDays;

      // Assert
      expect(days).toBe(0);
    });

    it("should handle fractional days", () => {
      // Arrange
      const prs: PRThroughputData[] = [{ leadTimeHours: 36 }];
      const totalPRCount = 1;
      const bucket = SizeBucket.fromPRs("L", prs, totalPRCount);

      // Act
      const days = bucket.averageLeadTimeDays;

      // Assert
      expect(days).toBe(1.5); // 36/24
    });

    it("should handle very small fractional days", () => {
      // Arrange
      const prs: PRThroughputData[] = [{ leadTimeHours: 1 }];
      const totalPRCount = 1;
      const bucket = SizeBucket.fromPRs("XL", prs, totalPRCount);

      // Act
      const days = bucket.averageLeadTimeDays;

      // Assert
      expect(days).toBeCloseTo(0.04167, 4); // 1/24
    });

    it("should handle large number of days", () => {
      // Arrange
      const prs: PRThroughputData[] = [{ leadTimeHours: 720 }]; // 30 days
      const totalPRCount = 1;
      const bucket = SizeBucket.fromPRs("S", prs, totalPRCount);

      // Act
      const days = bucket.averageLeadTimeDays;

      // Assert
      expect(days).toBe(30);
    });
  });

  describe("isValid", () => {
    describe("valid cases", () => {
      it("should return true for valid bucket with data", () => {
        // Arrange
        const prs: PRThroughputData[] = [{ leadTimeHours: 24 }];
        const totalPRCount = 2;
        const bucket = SizeBucket.fromPRs(SizeBucketType.S, prs, totalPRCount);

        // Act & Assert
        expect(bucket.isValid()).toBe(true);
      });

      it("should return true for empty bucket with all zeros", () => {
        // Arrange
        const prs: PRThroughputData[] = [];
        const totalPRCount = 10;
        const bucket = SizeBucket.fromPRs(SizeBucketType.M, prs, totalPRCount);

        // Act & Assert
        expect(bucket.isValid()).toBe(true);
      });

      it("should return true for bucket with 100% percentage", () => {
        // Arrange
        const prs: PRThroughputData[] = [{ leadTimeHours: 50 }];
        const totalPRCount = 1;
        const bucket = SizeBucket.fromPRs(SizeBucketType.L, prs, totalPRCount);

        // Act & Assert
        expect(bucket.isValid()).toBe(true);
        expect(bucket.percentage).toBe(100);
      });

      it("should return true for bucket with 0% percentage but non-zero total", () => {
        // Arrange
        const prs: PRThroughputData[] = [];
        const totalPRCount = 100;
        const bucket = SizeBucket.fromPRs(SizeBucketType.XL, prs, totalPRCount);

        // Act & Assert
        expect(bucket.isValid()).toBe(true);
        expect(bucket.percentage).toBe(0);
      });
    });

    describe("invalid cases - violated invariants", () => {
      it("should return false when prCount is negative", () => {
        // Arrange: Create bucket through reflection (bypassing factory)
        const bucket = new (SizeBucket as unknown as {
          new (
            bucket: SizeBucketType,
            lineRange: string,
            averageLeadTimeHours: number,
            prCount: number,
            percentage: number,
          ): SizeBucket;
        })(SizeBucketType.S, "1-50", 24, -1, 10);

        // Act & Assert
        expect(bucket.isValid()).toBe(false);
      });

      it("should return false when averageLeadTimeHours is negative", () => {
        // Arrange: Create bucket through reflection
        const bucket = new (SizeBucket as unknown as {
          new (
            bucket: SizeBucketType,
            lineRange: string,
            averageLeadTimeHours: number,
            prCount: number,
            percentage: number,
          ): SizeBucket;
        })(SizeBucketType.M, "51-200", -10, 5, 50);

        // Act & Assert
        expect(bucket.isValid()).toBe(false);
      });

      it("should return false when percentage is negative", () => {
        // Arrange: Create bucket through reflection
        const bucket = new (SizeBucket as unknown as {
          new (
            bucket: SizeBucketType,
            lineRange: string,
            averageLeadTimeHours: number,
            prCount: number,
            percentage: number,
          ): SizeBucket;
        })(SizeBucketType.L, "201-500", 48, 3, -5);

        // Act & Assert
        expect(bucket.isValid()).toBe(false);
      });

      it("should return false when percentage is greater than 100", () => {
        // Arrange: Create bucket through reflection
        const bucket = new (SizeBucket as unknown as {
          new (
            bucket: SizeBucketType,
            lineRange: string,
            averageLeadTimeHours: number,
            prCount: number,
            percentage: number,
          ): SizeBucket;
        })(SizeBucketType.XL, "501+", 100, 10, 150);

        // Act & Assert
        expect(bucket.isValid()).toBe(false);
      });

      it("should return false when prCount is 0 but averageLeadTimeHours is not 0", () => {
        // Arrange: Create bucket through reflection
        const bucket = new (SizeBucket as unknown as {
          new (
            bucket: SizeBucketType,
            lineRange: string,
            averageLeadTimeHours: number,
            prCount: number,
            percentage: number,
          ): SizeBucket;
        })(SizeBucketType.S, "1-50", 24, 0, 0);

        // Act & Assert
        expect(bucket.isValid()).toBe(false);
      });

      it("should return false when prCount is 0 but percentage is not 0", () => {
        // Arrange: Create bucket through reflection
        const bucket = new (SizeBucket as unknown as {
          new (
            bucket: SizeBucketType,
            lineRange: string,
            averageLeadTimeHours: number,
            prCount: number,
            percentage: number,
          ): SizeBucket;
        })(SizeBucketType.M, "51-200", 0, 0, 10);

        // Act & Assert
        expect(bucket.isValid()).toBe(false);
      });

      it("should return false when prCount is 0 but both averageLeadTimeHours and percentage are not 0", () => {
        // Arrange: Create bucket through reflection
        const bucket = new (SizeBucket as unknown as {
          new (
            bucket: SizeBucketType,
            lineRange: string,
            averageLeadTimeHours: number,
            prCount: number,
            percentage: number,
          ): SizeBucket;
        })(SizeBucketType.L, "201-500", 48, 0, 50);

        // Act & Assert
        expect(bucket.isValid()).toBe(false);
      });
    });
  });

  describe("getBucketName", () => {
    it("should return 'Small' for S bucket", () => {
      // Arrange
      const prs: PRThroughputData[] = [{ leadTimeHours: 24 }];
      const totalPRCount = 1;
      const bucket = SizeBucket.fromPRs("S", prs, totalPRCount);

      // Act
      const name = bucket.getBucketName();

      // Assert
      expect(name).toBe("Small");
    });

    it("should return 'Medium' for M bucket", () => {
      // Arrange
      const prs: PRThroughputData[] = [{ leadTimeHours: 48 }];
      const totalPRCount = 1;
      const bucket = SizeBucket.fromPRs("M", prs, totalPRCount);

      // Act
      const name = bucket.getBucketName();

      // Assert
      expect(name).toBe("Medium");
    });

    it("should return 'Large' for L bucket", () => {
      // Arrange
      const prs: PRThroughputData[] = [{ leadTimeHours: 72 }];
      const totalPRCount = 1;
      const bucket = SizeBucket.fromPRs("L", prs, totalPRCount);

      // Act
      const name = bucket.getBucketName();

      // Assert
      expect(name).toBe("Large");
    });

    it("should return 'Extra Large' for XL bucket", () => {
      // Arrange
      const prs: PRThroughputData[] = [{ leadTimeHours: 100 }];
      const totalPRCount = 1;
      const bucket = SizeBucket.fromPRs("XL", prs, totalPRCount);

      // Act
      const name = bucket.getBucketName();

      // Assert
      expect(name).toBe("Extra Large");
    });

    it("should return correct name for empty bucket", () => {
      // Arrange
      const prs: PRThroughputData[] = [];
      const totalPRCount = 10;
      const bucket = SizeBucket.fromPRs("S", prs, totalPRCount);

      // Act
      const name = bucket.getBucketName();

      // Assert
      expect(name).toBe("Small");
    });
  });

  describe("line range mapping", () => {
    it("should map S bucket to '1-50' line range", () => {
      // Arrange
      const prs: PRThroughputData[] = [{ leadTimeHours: 10 }];
      const totalPRCount = 1;

      // Act
      const bucket = SizeBucket.fromPRs("S", prs, totalPRCount);

      // Assert
      expect(bucket.lineRange).toBe("1-50");
    });

    it("should map M bucket to '51-200' line range", () => {
      // Arrange
      const prs: PRThroughputData[] = [{ leadTimeHours: 20 }];
      const totalPRCount = 1;

      // Act
      const bucket = SizeBucket.fromPRs("M", prs, totalPRCount);

      // Assert
      expect(bucket.lineRange).toBe("51-200");
    });

    it("should map L bucket to '201-500' line range", () => {
      // Arrange
      const prs: PRThroughputData[] = [{ leadTimeHours: 30 }];
      const totalPRCount = 1;

      // Act
      const bucket = SizeBucket.fromPRs("L", prs, totalPRCount);

      // Assert
      expect(bucket.lineRange).toBe("201-500");
    });

    it("should map XL bucket to '501+' line range", () => {
      // Arrange
      const prs: PRThroughputData[] = [{ leadTimeHours: 40 }];
      const totalPRCount = 1;

      // Act
      const bucket = SizeBucket.fromPRs("XL", prs, totalPRCount);

      // Assert
      expect(bucket.lineRange).toBe("501+");
    });
  });

  describe("percentage calculation accuracy", () => {
    it("should calculate exact percentage for simple ratios", () => {
      // Arrange: 1/4 = 25%
      const prs: PRThroughputData[] = [{ leadTimeHours: 24 }];
      const totalPRCount = 4;

      // Act
      const bucket = SizeBucket.fromPRs("S", prs, totalPRCount);

      // Assert
      expect(bucket.percentage).toBe(25);
    });

    it("should calculate exact percentage for half", () => {
      // Arrange: 5/10 = 50%
      const prs: PRThroughputData[] = Array.from({ length: 5 }, () => ({
        leadTimeHours: 24,
      }));
      const totalPRCount = 10;

      // Act
      const bucket = SizeBucket.fromPRs("M", prs, totalPRCount);

      // Assert
      expect(bucket.percentage).toBe(50);
    });

    it("should calculate percentage with repeating decimal", () => {
      // Arrange: 1/3 = 33.333...%
      const prs: PRThroughputData[] = [{ leadTimeHours: 48 }];
      const totalPRCount = 3;

      // Act
      const bucket = SizeBucket.fromPRs("L", prs, totalPRCount);

      // Assert
      expect(bucket.percentage).toBeCloseTo(33.333, 2);
    });

    it("should calculate percentage with multiple decimal places", () => {
      // Arrange: 7/13 = 53.846...%
      const prs: PRThroughputData[] = Array.from({ length: 7 }, () => ({
        leadTimeHours: 10,
      }));
      const totalPRCount = 13;

      // Act
      const bucket = SizeBucket.fromPRs("XL", prs, totalPRCount);

      // Assert
      expect(bucket.percentage).toBeCloseTo(53.846, 2);
    });

    it("should calculate very small percentage accurately", () => {
      // Arrange: 1/1000 = 0.1%
      const prs: PRThroughputData[] = [{ leadTimeHours: 5 }];
      const totalPRCount = 1000;

      // Act
      const bucket = SizeBucket.fromPRs("S", prs, totalPRCount);

      // Assert
      expect(bucket.percentage).toBe(0.1);
    });
  });

  describe("average lead time calculation with multiple PRs", () => {
    it("should calculate average for two PRs", () => {
      // Arrange
      const prs: PRThroughputData[] = [
        { leadTimeHours: 10 },
        { leadTimeHours: 20 },
      ];
      const totalPRCount = 5;

      // Act
      const bucket = SizeBucket.fromPRs("S", prs, totalPRCount);

      // Assert
      expect(bucket.averageLeadTimeHours).toBe(15);
    });

    it("should calculate average for five PRs", () => {
      // Arrange
      const prs: PRThroughputData[] = [
        { leadTimeHours: 5 },
        { leadTimeHours: 10 },
        { leadTimeHours: 15 },
        { leadTimeHours: 20 },
        { leadTimeHours: 25 },
      ];
      const totalPRCount = 10;

      // Act
      const bucket = SizeBucket.fromPRs("M", prs, totalPRCount);

      // Assert
      expect(bucket.averageLeadTimeHours).toBe(15); // (5+10+15+20+25)/5
    });

    it("should calculate average with varying lead times", () => {
      // Arrange
      const prs: PRThroughputData[] = [
        { leadTimeHours: 1 },
        { leadTimeHours: 100 },
        { leadTimeHours: 50 },
      ];
      const totalPRCount = 3;

      // Act
      const bucket = SizeBucket.fromPRs("L", prs, totalPRCount);

      // Assert
      expect(bucket.averageLeadTimeHours).toBeCloseTo(50.333, 2);
    });

    it("should calculate average with all same values", () => {
      // Arrange
      const prs: PRThroughputData[] = [
        { leadTimeHours: 24 },
        { leadTimeHours: 24 },
        { leadTimeHours: 24 },
      ];
      const totalPRCount = 6;

      // Act
      const bucket = SizeBucket.fromPRs("XL", prs, totalPRCount);

      // Assert
      expect(bucket.averageLeadTimeHours).toBe(24);
    });

    it("should calculate average with very large dataset", () => {
      // Arrange: 100 PRs with lead time 10-109 hours
      const prs: PRThroughputData[] = Array.from({ length: 100 }, (_, i) => ({
        leadTimeHours: i + 10,
      }));
      const totalPRCount = 100;

      // Act
      const bucket = SizeBucket.fromPRs("S", prs, totalPRCount);

      // Assert
      // Sum of 10 to 109 = (10+109)*100/2 = 5950
      // Average = 5950/100 = 59.5
      expect(bucket.averageLeadTimeHours).toBe(59.5);
    });

    it("should handle mix of zero and non-zero lead times", () => {
      // Arrange
      const prs: PRThroughputData[] = [
        { leadTimeHours: 0 },
        { leadTimeHours: 0 },
        { leadTimeHours: 60 },
      ];
      const totalPRCount = 5;

      // Act
      const bucket = SizeBucket.fromPRs("M", prs, totalPRCount);

      // Assert
      expect(bucket.averageLeadTimeHours).toBe(20); // (0+0+60)/3
    });
  });

  describe("immutability", () => {
    it("should have all expected readonly properties accessible", () => {
      // Arrange
      const prs: PRThroughputData[] = [{ leadTimeHours: 24 }];
      const totalPRCount = 1;
      const bucket = SizeBucket.fromPRs("S", prs, totalPRCount);

      // Act & Assert: Verify all properties are accessible and have correct values
      // TypeScript's readonly modifier prevents modification at compile time
      expect(bucket.bucket).toBe("S");
      expect(bucket.lineRange).toBe("1-50");
      expect(bucket.averageLeadTimeHours).toBe(24);
      expect(bucket.prCount).toBe(1);
      expect(bucket.percentage).toBe(100);

      // Verify the computed property
      expect(bucket.averageLeadTimeDays).toBe(1); // 24/24
    });

    it("should maintain value object semantics with separate instances", () => {
      // Arrange
      const prs1: PRThroughputData[] = [{ leadTimeHours: 24 }];
      const prs2: PRThroughputData[] = [{ leadTimeHours: 24 }];
      const totalPRCount = 1;

      // Act
      const bucket1 = SizeBucket.fromPRs("S", prs1, totalPRCount);
      const bucket2 = SizeBucket.fromPRs("S", prs2, totalPRCount);

      // Assert: Different instances with same values
      expect(bucket1).not.toBe(bucket2); // Different references
      expect(bucket1.bucket).toBe(bucket2.bucket);
      expect(bucket1.averageLeadTimeHours).toBe(bucket2.averageLeadTimeHours);
      expect(bucket1.prCount).toBe(bucket2.prCount);
      expect(bucket1.percentage).toBe(bucket2.percentage);
    });
  });
});
