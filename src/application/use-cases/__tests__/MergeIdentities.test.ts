import { describe, it, expect, beforeEach, vi } from "vitest";
import { MergeIdentities } from "@/application/use-cases/MergeIdentities";
import { Contributor } from "@/domain/entities/Contributor";
import { Email } from "@/domain/value-objects/Email";
import { ImplementationActivity } from "@/domain/value-objects/ImplementationActivity";
import { ReviewActivity } from "@/domain/value-objects/ReviewActivity";
import { IStoragePort } from "@/domain/interfaces/IStoragePort";
import { Result, ok, err } from "@/lib/result";

describe("MergeIdentities", () => {
  // Mock storage
  let mockStorage: IStoragePort;

  // Test contributors
  let contributor1: Contributor;
  let contributor2: Contributor;
  let contributor3: Contributor;

  beforeEach(() => {
    // Create mock storage
    mockStorage = {
      save: vi.fn(async () => ok(undefined)),
      load: vi.fn(async () => ok(null)),
      remove: vi.fn(async () => ok(undefined)),
      exists: vi.fn(async () => ok(false)),
    };

    // Create test contributors
    const email1Result = Email.create("user1@example.com");
    if (!email1Result.ok) throw new Error("Test setup failed: email1");
    const email1 = email1Result.value;

    const email2Result = Email.create("user2@example.com");
    if (!email2Result.ok) throw new Error("Test setup failed: email2");
    const email2 = email2Result.value;

    const email3Result = Email.create("user3@example.com");
    if (!email3Result.ok) throw new Error("Test setup failed: email3");
    const email3 = email3Result.value;

    const impl1Result = ImplementationActivity.create({
      commitCount: 10,
      linesAdded: 100,
      linesDeleted: 10,
      linesModified: 100,
      filesChanged: 5,
    });
    if (!impl1Result.ok) throw new Error("Test setup failed: impl1");
    const impl1 = impl1Result.value;

    const impl2Result = ImplementationActivity.create({
      commitCount: 20,
      linesAdded: 200,
      linesDeleted: 20,
      linesModified: 200,
      filesChanged: 10,
    });
    if (!impl2Result.ok) throw new Error("Test setup failed: impl2");
    const impl2 = impl2Result.value;

    const impl3Result = ImplementationActivity.create({
      commitCount: 30,
      linesAdded: 300,
      linesDeleted: 30,
      linesModified: 300,
      filesChanged: 15,
    });
    if (!impl3Result.ok) throw new Error("Test setup failed: impl3");
    const impl3 = impl3Result.value;

    const review1Result = ReviewActivity.create({
      pullRequestCount: 5,
      reviewCommentCount: 10,
      pullRequestsReviewed: 5,
    });
    if (!review1Result.ok) throw new Error("Test setup failed: review1");
    const review1 = review1Result.value;

    const review2Result = ReviewActivity.create({
      pullRequestCount: 10,
      reviewCommentCount: 20,
      pullRequestsReviewed: 10,
    });
    if (!review2Result.ok) throw new Error("Test setup failed: review2");
    const review2 = review2Result.value;

    const review3Result = ReviewActivity.create({
      pullRequestCount: 15,
      reviewCommentCount: 30,
      pullRequestsReviewed: 15,
    });
    if (!review3Result.ok) throw new Error("Test setup failed: review3");
    const review3 = review3Result.value;

    const contributor1Result = Contributor.create({
      id: "contributor-1",
      primaryEmail: email1,
      mergedEmails: [],
      displayName: "User 1",
      implementationActivity: impl1,
      reviewActivity: review1,
      activityTimeline: [],
    });
    if (!contributor1Result.ok)
      throw new Error("Test setup failed: contributor1");
    contributor1 = contributor1Result.value;

    const contributor2Result = Contributor.create({
      id: "contributor-2",
      primaryEmail: email2,
      mergedEmails: [],
      displayName: "User 2",
      implementationActivity: impl2,
      reviewActivity: review2,
      activityTimeline: [],
    });
    if (!contributor2Result.ok)
      throw new Error("Test setup failed: contributor2");
    contributor2 = contributor2Result.value;

    const contributor3Result = Contributor.create({
      id: "contributor-3",
      primaryEmail: email3,
      mergedEmails: [],
      displayName: "User 3",
      implementationActivity: impl3,
      reviewActivity: review3,
      activityTimeline: [],
    });
    if (!contributor3Result.ok)
      throw new Error("Test setup failed: contributor3");
    contributor3 = contributor3Result.value;
  });

  describe("execute", () => {
    it("successfully merges two contributors", async () => {
      const useCase = new MergeIdentities(mockStorage);

      const result = await useCase.execute({
        repositoryUrl: "https://github.com/owner/repo",
        primaryContributorId: "contributor-1",
        mergedContributorIds: ["contributor-2"],
        contributors: [contributor1, contributor2, contributor3],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.merge).toBeDefined();
        expect(result.value.merge.primaryContributorId).toBe("contributor-1");
        expect(result.value.merge.mergedContributorIds).toEqual([
          "contributor-2",
        ]);

        expect(result.value.mergedContributor).toBeDefined();
        expect(result.value.mergedContributor.id).toBe("contributor-1");
        expect(
          result.value.mergedContributor.implementationActivity.commitCount,
        ).toBe(30);
        expect(
          result.value.mergedContributor.reviewActivity.pullRequestCount,
        ).toBe(15);
      }
    });

    it("successfully merges multiple contributors", async () => {
      const useCase = new MergeIdentities(mockStorage);

      const result = await useCase.execute({
        repositoryUrl: "https://github.com/owner/repo",
        primaryContributorId: "contributor-1",
        mergedContributorIds: ["contributor-2", "contributor-3"],
        contributors: [contributor1, contributor2, contributor3],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(
          result.value.mergedContributor.implementationActivity.commitCount,
        ).toBe(60);
        expect(
          result.value.mergedContributor.reviewActivity.pullRequestCount,
        ).toBe(30);
      }
    });

    it("persists merge preference to storage", async () => {
      const useCase = new MergeIdentities(mockStorage);

      await useCase.execute({
        repositoryUrl: "https://github.com/owner/repo",
        primaryContributorId: "contributor-1",
        mergedContributorIds: ["contributor-2"],
        contributors: [contributor1, contributor2],
      });

      expect(mockStorage.save).toHaveBeenCalled();
    });

    it("rejects invalid repository URL", async () => {
      const useCase = new MergeIdentities(mockStorage);

      const result = await useCase.execute({
        repositoryUrl: "invalid-url",
        primaryContributorId: "contributor-1",
        mergedContributorIds: ["contributor-2"],
        contributors: [contributor1, contributor2],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Invalid repository URL");
      }
    });

    it("rejects when primary contributor not found", async () => {
      const useCase = new MergeIdentities(mockStorage);

      const result = await useCase.execute({
        repositoryUrl: "https://github.com/owner/repo",
        primaryContributorId: "non-existent",
        mergedContributorIds: ["contributor-2"],
        contributors: [contributor1, contributor2],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Primary contributor not found");
      }
    });

    it("rejects when merged contributor not found", async () => {
      const useCase = new MergeIdentities(mockStorage);

      const result = await useCase.execute({
        repositoryUrl: "https://github.com/owner/repo",
        primaryContributorId: "contributor-1",
        mergedContributorIds: ["non-existent"],
        contributors: [contributor1, contributor2],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Merged contributor not found");
      }
    });

    it("rejects when trying to merge contributor with itself", async () => {
      const useCase = new MergeIdentities(mockStorage);

      const result = await useCase.execute({
        repositoryUrl: "https://github.com/owner/repo",
        primaryContributorId: "contributor-1",
        mergedContributorIds: ["contributor-1"],
        contributors: [contributor1],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Cannot merge");
      }
    });

    it("rejects when merged contributors array is empty", async () => {
      const useCase = new MergeIdentities(mockStorage);

      const result = await useCase.execute({
        repositoryUrl: "https://github.com/owner/repo",
        primaryContributorId: "contributor-1",
        mergedContributorIds: [],
        contributors: [contributor1],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Cannot merge");
      }
    });

    it("continues even if storage fails", async () => {
      // Mock storage to fail
      mockStorage.save = vi.fn(async () => err(new Error("Storage error")));

      const useCase = new MergeIdentities(mockStorage);

      const result = await useCase.execute({
        repositoryUrl: "https://github.com/owner/repo",
        primaryContributorId: "contributor-1",
        mergedContributorIds: ["contributor-2"],
        contributors: [contributor1, contributor2],
      });

      // Should still succeed despite storage failure
      expect(result.ok).toBe(true);
      expect(mockStorage.save).toHaveBeenCalled();
    });

    it("combines emails from all merged contributors", async () => {
      const useCase = new MergeIdentities(mockStorage);

      const result = await useCase.execute({
        repositoryUrl: "https://github.com/owner/repo",
        primaryContributorId: "contributor-1",
        mergedContributorIds: ["contributor-2"],
        contributors: [contributor1, contributor2],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const allEmails = result.value.mergedContributor.allEmails;
        expect(allEmails.length).toBe(2);
        expect(allEmails[0]!.value).toBe("user1@example.com");
        expect(
          result.value.mergedContributor.mergedEmails.some(
            (e) => e.value === "user2@example.com",
          ),
        ).toBe(true);
      }
    });
  });

  describe("loadMergePreferences", () => {
    it("loads existing merge preferences", async () => {
      const mockMerges = [
        {
          id: "merge-1",
          repositoryUrl: { value: "https://github.com/owner/repo" },
          primaryContributorId: "contributor-1",
          mergedContributorIds: ["contributor-2"],
          createdAt: new Date(),
          lastAppliedAt: new Date(),
        },
      ];

      mockStorage.load = vi.fn(async () =>
        ok(mockMerges),
      ) as typeof mockStorage.load;

      const useCase = new MergeIdentities(mockStorage);
      const result = await useCase.loadMergePreferences(
        "https://github.com/owner/repo",
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(mockMerges);
      }
    });

    it("returns empty array when no preferences exist", async () => {
      mockStorage.load = vi.fn(async () => ok(null));

      const useCase = new MergeIdentities(mockStorage);
      const result = await useCase.loadMergePreferences(
        "https://github.com/owner/repo",
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it("returns error when storage fails", async () => {
      mockStorage.load = vi.fn(async () => err(new Error("Storage error")));

      const useCase = new MergeIdentities(mockStorage);
      const result = await useCase.loadMergePreferences(
        "https://github.com/owner/repo",
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Storage error");
      }
    });
  });
});
