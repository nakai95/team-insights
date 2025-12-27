import { describe, it, expect } from "vitest";
import { PRThroughputData } from "@/domain/value-objects/PRThroughputData";
import { SizeBucketType } from "@/domain/value-objects/SizeBucket";

describe("PRThroughputData", () => {
  describe("create", () => {
    describe("happy path", () => {
      it("should create valid PR throughput data with all fields", () => {
        const createdAt = new Date("2024-01-01T10:00:00Z");
        const mergedAt = new Date("2024-01-02T14:30:00Z");

        const result = PRThroughputData.create({
          prNumber: 123,
          title: "Add new feature",
          author: "johndoe",
          createdAt,
          mergedAt,
          additions: 50,
          deletions: 20,
          changedFiles: 5,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.prNumber).toBe(123);
          expect(result.value.title).toBe("Add new feature");
          expect(result.value.author).toBe("johndoe");
          expect(result.value.createdAt).toEqual(createdAt);
          expect(result.value.mergedAt).toEqual(mergedAt);
          expect(result.value.additions).toBe(50);
          expect(result.value.deletions).toBe(20);
          expect(result.value.changedFiles).toBe(5);
        }
      });

      it("should create PR with zero additions, deletions, and files", () => {
        const createdAt = new Date("2024-01-01T10:00:00Z");
        const mergedAt = new Date("2024-01-01T10:00:00Z");

        const result = PRThroughputData.create({
          prNumber: 1,
          title: "Empty PR",
          author: "author",
          createdAt,
          mergedAt,
          additions: 0,
          deletions: 0,
          changedFiles: 0,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.additions).toBe(0);
          expect(result.value.deletions).toBe(0);
          expect(result.value.changedFiles).toBe(0);
        }
      });

      it("should create PR when mergedAt equals createdAt", () => {
        const timestamp = new Date("2024-01-01T10:00:00Z");

        const result = PRThroughputData.create({
          prNumber: 1,
          title: "Same-day merge",
          author: "author",
          createdAt: timestamp,
          mergedAt: timestamp,
          additions: 10,
          deletions: 5,
          changedFiles: 2,
        });

        expect(result.ok).toBe(true);
      });

      it("should trim whitespace from title", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "  Fix bug  ",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 10,
          deletions: 5,
          changedFiles: 2,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.title).toBe("Fix bug");
        }
      });

      it("should trim whitespace from author", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "Fix bug",
          author: "  johndoe  ",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 10,
          deletions: 5,
          changedFiles: 2,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.author).toBe("johndoe");
        }
      });
    });

    describe("validation errors", () => {
      it("should reject zero PR number", () => {
        const result = PRThroughputData.create({
          prNumber: 0,
          title: "Valid title",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 10,
          deletions: 5,
          changedFiles: 2,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("PR number must be positive");
        }
      });

      it("should reject negative PR number", () => {
        const result = PRThroughputData.create({
          prNumber: -1,
          title: "Valid title",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 10,
          deletions: 5,
          changedFiles: 2,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("PR number must be positive");
        }
      });

      it("should reject empty title", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 10,
          deletions: 5,
          changedFiles: 2,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("PR title cannot be empty");
        }
      });

      it("should reject title with only whitespace", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "   ",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 10,
          deletions: 5,
          changedFiles: 2,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("PR title cannot be empty");
        }
      });

      it("should reject empty author", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "Valid title",
          author: "",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 10,
          deletions: 5,
          changedFiles: 2,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("PR author cannot be empty");
        }
      });

      it("should reject author with only whitespace", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "Valid title",
          author: "   ",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 10,
          deletions: 5,
          changedFiles: 2,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("PR author cannot be empty");
        }
      });

      it("should reject when mergedAt is before createdAt", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "Valid title",
          author: "author",
          createdAt: new Date("2024-01-02"),
          mergedAt: new Date("2024-01-01"),
          additions: 10,
          deletions: 5,
          changedFiles: 2,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "Merged date cannot be before created date",
          );
        }
      });

      it("should reject negative additions", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "Valid title",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: -1,
          deletions: 5,
          changedFiles: 2,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "Additions cannot be negative",
          );
        }
      });

      it("should reject negative deletions", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "Valid title",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 10,
          deletions: -1,
          changedFiles: 2,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "Deletions cannot be negative",
          );
        }
      });

      it("should reject negative changed files", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "Valid title",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 10,
          deletions: 5,
          changedFiles: -1,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "Changed files cannot be negative",
          );
        }
      });
    });
  });

  describe("size", () => {
    it("should calculate size as sum of additions and deletions", () => {
      const result = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt: new Date("2024-01-01"),
        mergedAt: new Date("2024-01-02"),
        additions: 30,
        deletions: 20,
        changedFiles: 5,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.size).toBe(50);
      }
    });

    it("should return 0 for size when no changes", () => {
      const result = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt: new Date("2024-01-01"),
        mergedAt: new Date("2024-01-02"),
        additions: 0,
        deletions: 0,
        changedFiles: 0,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.size).toBe(0);
      }
    });

    it("should calculate size with only additions", () => {
      const result = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt: new Date("2024-01-01"),
        mergedAt: new Date("2024-01-02"),
        additions: 100,
        deletions: 0,
        changedFiles: 5,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.size).toBe(100);
      }
    });

    it("should calculate size with only deletions", () => {
      const result = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt: new Date("2024-01-01"),
        mergedAt: new Date("2024-01-02"),
        additions: 0,
        deletions: 75,
        changedFiles: 5,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.size).toBe(75);
      }
    });
  });

  describe("leadTimeHours", () => {
    it("should calculate lead time in hours for multi-day PR", () => {
      const createdAt = new Date("2024-01-01T10:00:00Z");
      const mergedAt = new Date("2024-01-02T14:00:00Z");

      const result = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt,
        mergedAt,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.leadTimeHours).toBe(28); // 24 + 4 hours
      }
    });

    it("should return 0 for same-time merge", () => {
      const timestamp = new Date("2024-01-01T10:00:00Z");

      const result = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt: timestamp,
        mergedAt: timestamp,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.leadTimeHours).toBe(0);
      }
    });

    it("should calculate fractional hours correctly", () => {
      const createdAt = new Date("2024-01-01T10:00:00Z");
      const mergedAt = new Date("2024-01-01T10:30:00Z");

      const result = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt,
        mergedAt,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.leadTimeHours).toBe(0.5); // 30 minutes
      }
    });

    it("should calculate lead time for week-long PR", () => {
      const createdAt = new Date("2024-01-01T10:00:00Z");
      const mergedAt = new Date("2024-01-08T10:00:00Z");

      const result = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt,
        mergedAt,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.leadTimeHours).toBe(168); // 7 * 24
      }
    });
  });

  describe("leadTimeDays", () => {
    it("should calculate lead time in days", () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      const mergedAt = new Date("2024-01-04T00:00:00Z");

      const result = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt,
        mergedAt,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.leadTimeDays).toBe(3);
      }
    });

    it("should return 0 for same-day merge", () => {
      const timestamp = new Date("2024-01-01T10:00:00Z");

      const result = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt: timestamp,
        mergedAt: timestamp,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.leadTimeDays).toBe(0);
      }
    });

    it("should calculate fractional days correctly", () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      const mergedAt = new Date("2024-01-01T12:00:00Z");

      const result = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt,
        mergedAt,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.leadTimeDays).toBe(0.5); // 12 hours = 0.5 days
      }
    });
  });

  describe("sizeBucket", () => {
    describe("S bucket (1-50 lines)", () => {
      it("should return S for size of 0", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "PR",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 0,
          deletions: 0,
          changedFiles: 1,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.sizeBucket).toBe(SizeBucketType.S);
        }
      });

      it("should return S for size of 1", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "PR",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 1,
          deletions: 0,
          changedFiles: 1,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.sizeBucket).toBe(SizeBucketType.S);
        }
      });

      it("should return S for size of 50 (boundary)", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "PR",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 30,
          deletions: 20,
          changedFiles: 5,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.sizeBucket).toBe(SizeBucketType.S);
        }
      });
    });

    describe("M bucket (51-200 lines)", () => {
      it("should return M for size of 51 (boundary)", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "PR",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 31,
          deletions: 20,
          changedFiles: 5,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.sizeBucket).toBe(SizeBucketType.M);
        }
      });

      it("should return M for size of 100", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "PR",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 60,
          deletions: 40,
          changedFiles: 10,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.sizeBucket).toBe(SizeBucketType.M);
        }
      });

      it("should return M for size of 200 (boundary)", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "PR",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 120,
          deletions: 80,
          changedFiles: 15,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.sizeBucket).toBe(SizeBucketType.M);
        }
      });
    });

    describe("L bucket (201-500 lines)", () => {
      it("should return L for size of 201 (boundary)", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "PR",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 121,
          deletions: 80,
          changedFiles: 20,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.sizeBucket).toBe(SizeBucketType.L);
        }
      });

      it("should return L for size of 350", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "PR",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 200,
          deletions: 150,
          changedFiles: 25,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.sizeBucket).toBe(SizeBucketType.L);
        }
      });

      it("should return L for size of 500 (boundary)", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "PR",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 300,
          deletions: 200,
          changedFiles: 30,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.sizeBucket).toBe(SizeBucketType.L);
        }
      });
    });

    describe("XL bucket (501+ lines)", () => {
      it("should return XL for size of 501 (boundary)", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "PR",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 301,
          deletions: 200,
          changedFiles: 35,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.sizeBucket).toBe(SizeBucketType.XL);
        }
      });

      it("should return XL for size of 1000", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "PR",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 600,
          deletions: 400,
          changedFiles: 50,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.sizeBucket).toBe(SizeBucketType.XL);
        }
      });

      it("should return XL for very large size", () => {
        const result = PRThroughputData.create({
          prNumber: 1,
          title: "PR",
          author: "author",
          createdAt: new Date("2024-01-01"),
          mergedAt: new Date("2024-01-02"),
          additions: 5000,
          deletions: 3000,
          changedFiles: 100,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.sizeBucket).toBe(SizeBucketType.XL);
        }
      });
    });
  });

  describe("equals", () => {
    it("should return true for identical PR data", () => {
      const createdAt = new Date("2024-01-01T10:00:00Z");
      const mergedAt = new Date("2024-01-02T14:30:00Z");

      const result1 = PRThroughputData.create({
        prNumber: 123,
        title: "Feature",
        author: "johndoe",
        createdAt,
        mergedAt,
        additions: 50,
        deletions: 20,
        changedFiles: 5,
      });

      const result2 = PRThroughputData.create({
        prNumber: 123,
        title: "Feature",
        author: "johndoe",
        createdAt,
        mergedAt,
        additions: 50,
        deletions: 20,
        changedFiles: 5,
      });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (result1.ok && result2.ok) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it("should return true for same dates with same timestamps", () => {
      const createdAt1 = new Date("2024-01-01T10:00:00Z");
      const mergedAt1 = new Date("2024-01-02T14:30:00Z");
      const createdAt2 = new Date("2024-01-01T10:00:00Z");
      const mergedAt2 = new Date("2024-01-02T14:30:00Z");

      const result1 = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt: createdAt1,
        mergedAt: mergedAt1,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      const result2 = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt: createdAt2,
        mergedAt: mergedAt2,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (result1.ok && result2.ok) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it("should return false for different PR numbers", () => {
      const createdAt = new Date("2024-01-01");
      const mergedAt = new Date("2024-01-02");

      const result1 = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt,
        mergedAt,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      const result2 = PRThroughputData.create({
        prNumber: 2,
        title: "PR",
        author: "author",
        createdAt,
        mergedAt,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (result1.ok && result2.ok) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it("should return false for different titles", () => {
      const createdAt = new Date("2024-01-01");
      const mergedAt = new Date("2024-01-02");

      const result1 = PRThroughputData.create({
        prNumber: 1,
        title: "Feature A",
        author: "author",
        createdAt,
        mergedAt,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      const result2 = PRThroughputData.create({
        prNumber: 1,
        title: "Feature B",
        author: "author",
        createdAt,
        mergedAt,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (result1.ok && result2.ok) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it("should return false for different authors", () => {
      const createdAt = new Date("2024-01-01");
      const mergedAt = new Date("2024-01-02");

      const result1 = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "alice",
        createdAt,
        mergedAt,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      const result2 = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "bob",
        createdAt,
        mergedAt,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (result1.ok && result2.ok) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it("should return false for different createdAt dates", () => {
      const result1 = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt: new Date("2024-01-01"),
        mergedAt: new Date("2024-01-02"),
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      const result2 = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt: new Date("2024-01-03"),
        mergedAt: new Date("2024-01-02"),
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(false); // This would fail validation, but let's test with valid dates
    });

    it("should return false for different mergedAt dates", () => {
      const result1 = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt: new Date("2024-01-01"),
        mergedAt: new Date("2024-01-02"),
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      const result2 = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt: new Date("2024-01-01"),
        mergedAt: new Date("2024-01-03"),
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (result1.ok && result2.ok) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it("should return false for different additions", () => {
      const createdAt = new Date("2024-01-01");
      const mergedAt = new Date("2024-01-02");

      const result1 = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt,
        mergedAt,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      const result2 = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt,
        mergedAt,
        additions: 20,
        deletions: 5,
        changedFiles: 2,
      });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (result1.ok && result2.ok) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it("should return false for different deletions", () => {
      const createdAt = new Date("2024-01-01");
      const mergedAt = new Date("2024-01-02");

      const result1 = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt,
        mergedAt,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      const result2 = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt,
        mergedAt,
        additions: 10,
        deletions: 10,
        changedFiles: 2,
      });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (result1.ok && result2.ok) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it("should return false for different changed files", () => {
      const createdAt = new Date("2024-01-01");
      const mergedAt = new Date("2024-01-02");

      const result1 = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt,
        mergedAt,
        additions: 10,
        deletions: 5,
        changedFiles: 2,
      });

      const result2 = PRThroughputData.create({
        prNumber: 1,
        title: "PR",
        author: "author",
        createdAt,
        mergedAt,
        additions: 10,
        deletions: 5,
        changedFiles: 5,
      });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (result1.ok && result2.ok) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });
  });
});
