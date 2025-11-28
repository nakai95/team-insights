import { describe, it, expect } from "vitest";
import {
  AnalysisRequestSchema,
  MergeRequestSchema,
} from "@/lib/validation/schemas";

describe("AnalysisRequestSchema", () => {
  describe("repositoryUrl", () => {
    it("should accept valid GitHub URL", () => {
      const result = AnalysisRequestSchema.safeParse({
        repositoryUrl: "https://github.com/owner/repo",
        githubToken: "ghp_1234567890abcdefghij",
      });

      expect(result.success).toBe(true);
    });

    it.each([
      "http://github.com/owner/repo",
      "https://gitlab.com/owner/repo",
      "https://github.com/owner",
      "https://github.com/owner/repo/extra",
      "not-a-url",
    ])("should reject invalid URL: %s", (url) => {
      const result = AnalysisRequestSchema.safeParse({
        repositoryUrl: url,
        githubToken: "ghp_1234567890abcdefghij",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("githubToken", () => {
    it("should accept valid token", () => {
      const result = AnalysisRequestSchema.safeParse({
        repositoryUrl: "https://github.com/owner/repo",
        githubToken: "ghp_1234567890abcdefghij",
      });

      expect(result.success).toBe(true);
    });

    it("should reject token that is too short", () => {
      const result = AnalysisRequestSchema.safeParse({
        repositoryUrl: "https://github.com/owner/repo",
        githubToken: "short",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("too short");
      }
    });

    it("should reject token that is too long", () => {
      const result = AnalysisRequestSchema.safeParse({
        repositoryUrl: "https://github.com/owner/repo",
        githubToken: "a".repeat(101),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("too long");
      }
    });

    it("should reject token with invalid characters", () => {
      const result = AnalysisRequestSchema.safeParse({
        repositoryUrl: "https://github.com/owner/repo",
        githubToken: "invalid-token-with-dashes!",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("invalid characters");
      }
    });
  });

  describe("dateRange", () => {
    it("should accept valid date range", () => {
      const result = AnalysisRequestSchema.safeParse({
        repositoryUrl: "https://github.com/owner/repo",
        githubToken: "ghp_1234567890abcdefghij",
        dateRange: {
          start: "2024-01-01",
          end: "2024-06-01",
        },
      });

      expect(result.success).toBe(true);
    });

    it("should accept request without date range", () => {
      const result = AnalysisRequestSchema.safeParse({
        repositoryUrl: "https://github.com/owner/repo",
        githubToken: "ghp_1234567890abcdefghij",
      });

      expect(result.success).toBe(true);
    });

    it("should reject when start is after end", () => {
      const result = AnalysisRequestSchema.safeParse({
        repositoryUrl: "https://github.com/owner/repo",
        githubToken: "ghp_1234567890abcdefghij",
        dateRange: {
          start: "2024-06-01",
          end: "2024-01-01",
        },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          "Start date must be before end date",
        );
      }
    });

    it("should reject when end is in the future", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = AnalysisRequestSchema.safeParse({
        repositoryUrl: "https://github.com/owner/repo",
        githubToken: "ghp_1234567890abcdefghij",
        dateRange: {
          start: "2024-01-01",
          end: tomorrow.toISOString(),
        },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          "End date cannot be in the future",
        );
      }
    });
  });
});

describe("MergeRequestSchema", () => {
  describe("valid merge request", () => {
    it("should accept valid merge request", () => {
      const result = MergeRequestSchema.safeParse({
        repositoryUrl: "https://github.com/owner/repo",
        primaryContributorId: "123e4567-e89b-12d3-a456-426614174000",
        mergedContributorIds: [
          "223e4567-e89b-12d3-a456-426614174000",
          "323e4567-e89b-12d3-a456-426614174000",
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  describe("repositoryUrl", () => {
    it("should reject invalid URL", () => {
      const result = MergeRequestSchema.safeParse({
        repositoryUrl: "invalid-url",
        primaryContributorId: "123e4567-e89b-12d3-a456-426614174000",
        mergedContributorIds: ["223e4567-e89b-12d3-a456-426614174000"],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("primaryContributorId", () => {
    it("should reject non-UUID", () => {
      const result = MergeRequestSchema.safeParse({
        repositoryUrl: "https://github.com/owner/repo",
        primaryContributorId: "not-a-uuid",
        mergedContributorIds: ["223e4567-e89b-12d3-a456-426614174000"],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("mergedContributorIds", () => {
    it("should reject empty array", () => {
      const result = MergeRequestSchema.safeParse({
        repositoryUrl: "https://github.com/owner/repo",
        primaryContributorId: "123e4567-e89b-12d3-a456-426614174000",
        mergedContributorIds: [],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          "Must merge at least one contributor",
        );
      }
    });

    it("should reject duplicate IDs", () => {
      const duplicateId = "223e4567-e89b-12d3-a456-426614174000";
      const result = MergeRequestSchema.safeParse({
        repositoryUrl: "https://github.com/owner/repo",
        primaryContributorId: "123e4567-e89b-12d3-a456-426614174000",
        mergedContributorIds: [duplicateId, duplicateId],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          "Duplicate contributor IDs not allowed",
        );
      }
    });

    it("should reject non-UUID in array", () => {
      const result = MergeRequestSchema.safeParse({
        repositoryUrl: "https://github.com/owner/repo",
        primaryContributorId: "123e4567-e89b-12d3-a456-426614174000",
        mergedContributorIds: ["not-a-uuid"],
      });

      expect(result.success).toBe(false);
    });
  });
});
