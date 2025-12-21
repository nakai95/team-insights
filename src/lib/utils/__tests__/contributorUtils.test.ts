import { describe, expect, it } from "vitest";
import { getTotalActivityScore } from "../contributorUtils";
import { ContributorDto } from "@/application/dto/ContributorDto";

// Helper to create a minimal contributor for testing
function createTestContributor(
  implementationScore: number,
  reviewScore: number,
): ContributorDto {
  return {
    id: "test-id",
    primaryEmail: "test@example.com",
    mergedEmails: [],
    displayName: "Test User",
    implementationActivity: {
      commitCount: 0,
      linesAdded: 0,
      linesDeleted: 0,
      linesModified: 0,
      filesChanged: 0,
      totalLineChanges: 0,
      netLineChanges: 0,
      activityScore: implementationScore,
    },
    reviewActivity: {
      pullRequestCount: 0,
      reviewCommentCount: 0,
      pullRequestsReviewed: 0,
      reviewScore: reviewScore,
      averageCommentsPerReview: 0,
    },
  };
}

describe("getTotalActivityScore", () => {
  it("should calculate total score from implementation and review scores", () => {
    const contributor = createTestContributor(50, 30);

    const result = getTotalActivityScore(contributor);

    expect(result).toBe(80);
  });

  it("should handle zero implementation score", () => {
    const contributor = createTestContributor(0, 45);

    const result = getTotalActivityScore(contributor);

    expect(result).toBe(45);
  });

  it("should handle zero review score", () => {
    const contributor = createTestContributor(75, 0);

    const result = getTotalActivityScore(contributor);

    expect(result).toBe(75);
  });

  it("should handle both scores being zero", () => {
    const contributor = createTestContributor(0, 0);

    const result = getTotalActivityScore(contributor);

    expect(result).toBe(0);
  });

  it("should handle decimal scores", () => {
    const contributor = createTestContributor(12.5, 7.3);

    const result = getTotalActivityScore(contributor);

    expect(result).toBeCloseTo(19.8);
  });

  it("should handle large scores", () => {
    const contributor = createTestContributor(1000000, 500000);

    const result = getTotalActivityScore(contributor);

    expect(result).toBe(1500000);
  });

  it("should handle negative scores (edge case)", () => {
    // Although unlikely in production, the function should handle it
    const contributor = createTestContributor(-10, 50);

    const result = getTotalActivityScore(contributor);

    expect(result).toBe(40);
  });

  it("should correctly sum very small decimal values", () => {
    const contributor = createTestContributor(0.1, 0.2);

    const result = getTotalActivityScore(contributor);

    expect(result).toBeCloseTo(0.3);
  });

  it("should be used for sorting contributors (integration scenario)", () => {
    const contributors = [
      createTestContributor(30, 20), // total: 50
      createTestContributor(100, 50), // total: 150
      createTestContributor(40, 40), // total: 80
    ];

    const sorted = contributors.sort(
      (a, b) => getTotalActivityScore(b) - getTotalActivityScore(a),
    );

    expect(getTotalActivityScore(sorted[0]!)).toBe(150);
    expect(getTotalActivityScore(sorted[1]!)).toBe(80);
    expect(getTotalActivityScore(sorted[2]!)).toBe(50);
  });

  it("should produce consistent results when called multiple times", () => {
    const contributor = createTestContributor(42.7, 57.3);

    const result1 = getTotalActivityScore(contributor);
    const result2 = getTotalActivityScore(contributor);

    expect(result1).toBe(result2);
    expect(result1).toBe(100);
  });
});
