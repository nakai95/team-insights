import { describe, it, expect } from "vitest";
import { IdentityMerge } from "../IdentityMerge";
import { RepositoryUrl } from "@/domain/value-objects/RepositoryUrl";

describe("IdentityMerge", () => {
  const validRepoUrl = RepositoryUrl.create(
    "https://github.com/owner/repo",
  ).value!;
  const now = new Date("2024-01-01T12:00:00Z");
  const later = new Date("2024-01-02T12:00:00Z");

  const validParams = {
    id: "merge-123",
    repositoryUrl: validRepoUrl,
    primaryContributorId: "contributor-1",
    mergedContributorIds: ["contributor-2", "contributor-3"],
    createdAt: now,
    lastAppliedAt: now,
  };

  describe("create", () => {
    it("creates valid IdentityMerge with correct properties", () => {
      const result = IdentityMerge.create(validParams);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("merge-123");
        expect(result.value.repositoryUrl).toBe(validRepoUrl);
        expect(result.value.primaryContributorId).toBe("contributor-1");
        expect(result.value.mergedContributorIds).toEqual([
          "contributor-2",
          "contributor-3",
        ]);
        expect(result.value.createdAt).toEqual(now);
        expect(result.value.lastAppliedAt).toEqual(now);
      }
    });

    it("rejects empty ID", () => {
      const result = IdentityMerge.create({
        ...validParams,
        id: "",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("ID cannot be empty");
      }
    });

    it("rejects whitespace-only ID", () => {
      const result = IdentityMerge.create({
        ...validParams,
        id: "   ",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("ID cannot be empty");
      }
    });

    it("rejects empty primary contributor ID", () => {
      const result = IdentityMerge.create({
        ...validParams,
        primaryContributorId: "",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Primary contributor ID cannot be empty",
        );
      }
    });

    it("rejects empty merged contributors array", () => {
      const result = IdentityMerge.create({
        ...validParams,
        mergedContributorIds: [],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Must have at least one merged contributor ID",
        );
      }
    });

    it("rejects primary contributor ID in merged list", () => {
      const result = IdentityMerge.create({
        ...validParams,
        mergedContributorIds: ["contributor-1", "contributor-2"],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Merged contributors must be distinct from primary",
        );
      }
    });

    it("rejects duplicate merged contributor IDs", () => {
      const result = IdentityMerge.create({
        ...validParams,
        mergedContributorIds: ["contributor-2", "contributor-2"],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "All merged contributor IDs must be unique",
        );
      }
    });

    it("rejects empty string in merged contributor IDs", () => {
      const result = IdentityMerge.create({
        ...validParams,
        mergedContributorIds: ["contributor-2", ""],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Merged contributor IDs cannot be empty",
        );
      }
    });

    it("rejects lastAppliedAt before createdAt", () => {
      const result = IdentityMerge.create({
        ...validParams,
        createdAt: later,
        lastAppliedAt: now,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Last applied date cannot be before created date",
        );
      }
    });

    it("accepts lastAppliedAt equal to createdAt", () => {
      const result = IdentityMerge.create({
        ...validParams,
        createdAt: now,
        lastAppliedAt: now,
      });

      expect(result.ok).toBe(true);
    });

    it("accepts lastAppliedAt after createdAt", () => {
      const result = IdentityMerge.create({
        ...validParams,
        createdAt: now,
        lastAppliedAt: later,
      });

      expect(result.ok).toBe(true);
    });
  });

  describe("includes", () => {
    it("returns true for primary contributor ID", () => {
      const merge = IdentityMerge.create(validParams).value!;

      expect(merge.includes("contributor-1")).toBe(true);
    });

    it("returns true for merged contributor ID", () => {
      const merge = IdentityMerge.create(validParams).value!;

      expect(merge.includes("contributor-2")).toBe(true);
      expect(merge.includes("contributor-3")).toBe(true);
    });

    it("returns false for non-included contributor ID", () => {
      const merge = IdentityMerge.create(validParams).value!;

      expect(merge.includes("contributor-999")).toBe(false);
    });
  });

  describe("allContributorIds", () => {
    it("returns all contributor IDs including primary", () => {
      const merge = IdentityMerge.create(validParams).value!;

      expect(merge.allContributorIds).toEqual([
        "contributor-1",
        "contributor-2",
        "contributor-3",
      ]);
    });

    it("maintains order with primary first", () => {
      const merge = IdentityMerge.create(validParams).value!;

      expect(merge.allContributorIds[0]).toBe("contributor-1");
    });
  });

  describe("updateLastApplied", () => {
    it("updates lastAppliedAt timestamp", () => {
      const merge = IdentityMerge.create(validParams).value!;
      const newTime = new Date("2024-01-03T12:00:00Z");

      const result = merge.updateLastApplied(newTime);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.lastAppliedAt).toEqual(newTime);
        expect(result.value.createdAt).toEqual(now);
        expect(result.value.id).toBe(merge.id);
      }
    });

    it("rejects timestamp before createdAt", () => {
      const merge = IdentityMerge.create({
        ...validParams,
        createdAt: later,
        lastAppliedAt: later,
      }).value!;

      const result = merge.updateLastApplied(now);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Last applied timestamp cannot be before created date",
        );
      }
    });

    it("accepts timestamp equal to createdAt", () => {
      const merge = IdentityMerge.create({
        ...validParams,
        createdAt: now,
        lastAppliedAt: later,
      }).value!;

      const result = merge.updateLastApplied(now);

      expect(result.ok).toBe(true);
    });
  });
});
