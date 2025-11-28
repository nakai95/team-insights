import { describe, it, expect } from "vitest";
import { ReviewActivity } from "@/domain/value-objects/ReviewActivity";

describe("ReviewActivity", () => {
  describe("create", () => {
    it("should create valid review activity", () => {
      const result = ReviewActivity.create({
        pullRequestCount: 10,
        reviewCommentCount: 50,
        pullRequestsReviewed: 20,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.pullRequestCount).toBe(10);
        expect(result.value.reviewCommentCount).toBe(50);
        expect(result.value.pullRequestsReviewed).toBe(20);
      }
    });

    it("should create activity with zero values", () => {
      const result = ReviewActivity.create({
        pullRequestCount: 0,
        reviewCommentCount: 0,
        pullRequestsReviewed: 0,
      });

      expect(result.ok).toBe(true);
    });

    it.each([
      { field: "pullRequestCount", value: -1, name: "pull request count" },
      { field: "reviewCommentCount", value: -50, name: "review comment count" },
      {
        field: "pullRequestsReviewed",
        value: -20,
        name: "pull requests reviewed",
      },
    ])("should reject negative $name", ({ field, value }) => {
      const params = {
        pullRequestCount: 10,
        reviewCommentCount: 50,
        pullRequestsReviewed: 20,
        [field]: value,
      };

      const result = ReviewActivity.create(params);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("must be non-negative");
      }
    });

    it.each([
      { field: "pullRequestCount", value: 10.5, name: "pull request count" },
      {
        field: "reviewCommentCount",
        value: 50.7,
        name: "review comment count",
      },
      {
        field: "pullRequestsReviewed",
        value: 20.3,
        name: "pull requests reviewed",
      },
    ])("should reject non-integer $name", ({ field, value }) => {
      const params = {
        pullRequestCount: 10,
        reviewCommentCount: 50,
        pullRequestsReviewed: 20,
        [field]: value,
      };

      const result = ReviewActivity.create(params);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("must be integers");
      }
    });
  });

  describe("zero", () => {
    it("should create activity with all zero values", () => {
      const activity = ReviewActivity.zero();

      expect(activity.pullRequestCount).toBe(0);
      expect(activity.reviewCommentCount).toBe(0);
      expect(activity.pullRequestsReviewed).toBe(0);
    });
  });

  describe("reviewScore", () => {
    it("should calculate review score", () => {
      const result = ReviewActivity.create({
        pullRequestCount: 10,
        reviewCommentCount: 50,
        pullRequestsReviewed: 20,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Score = pullRequestCount * 5 + reviewCommentCount * 2
        // Score = 10 * 5 + 50 * 2 = 50 + 100 = 150
        expect(result.value.reviewScore).toBe(150);
      }
    });

    it("should return 0 for zero activity", () => {
      const activity = ReviewActivity.zero();
      expect(activity.reviewScore).toBe(0);
    });
  });

  describe("averageCommentsPerReview", () => {
    it("should calculate average comments per review", () => {
      const result = ReviewActivity.create({
        pullRequestCount: 10,
        reviewCommentCount: 50,
        pullRequestsReviewed: 10,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.averageCommentsPerReview).toBe(5); // 50 / 10
      }
    });

    it("should return 0 when no reviews done", () => {
      const result = ReviewActivity.create({
        pullRequestCount: 10,
        reviewCommentCount: 0,
        pullRequestsReviewed: 0,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.averageCommentsPerReview).toBe(0);
      }
    });

    it("should handle fractional averages", () => {
      const result = ReviewActivity.create({
        pullRequestCount: 10,
        reviewCommentCount: 25,
        pullRequestsReviewed: 10,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.averageCommentsPerReview).toBe(2.5); // 25 / 10
      }
    });
  });
});
