import { describe, it, expect } from "vitest";
import { ContributorService } from "../ContributorService";
import { Contributor } from "@/domain/entities/Contributor";
import { Email } from "@/domain/value-objects/Email";
import { ImplementationActivity } from "@/domain/value-objects/ImplementationActivity";
import { ReviewActivity } from "@/domain/value-objects/ReviewActivity";
import { ActivitySnapshot } from "@/domain/value-objects/ActivitySnapshot";
import { Period } from "@/domain/types";

describe("ContributorService", () => {
  const createEmail = (value: string): Email => {
    const result = Email.create(value);
    if (!result.ok)
      throw new Error(`Failed to create email: ${result.error.message}`);
    return result.value;
  };

  const email1 = createEmail("user1@example.com");
  const email2 = createEmail("user2@example.com");
  const email3 = createEmail("user3@example.com");

  const createContributor = (
    id: string,
    primaryEmail: Email,
    commits: number,
    linesAdded: number,
    prsReviewed: number,
  ): Contributor => {
    const implResult = ImplementationActivity.create({
      commitCount: commits,
      linesAdded,
      linesDeleted: 0,
      linesModified: linesAdded,
      filesChanged: 0,
    });
    if (!implResult.ok)
      throw new Error(
        `Failed to create ImplementationActivity: ${implResult.error.message}`,
      );

    const reviewResult = ReviewActivity.create({
      pullRequestCount: prsReviewed,
      reviewCommentCount: 0,
      pullRequestsReviewed: prsReviewed,
    });
    if (!reviewResult.ok)
      throw new Error(
        `Failed to create ReviewActivity: ${reviewResult.error.message}`,
      );

    const snapshotResult = ActivitySnapshot.create(
      new Date("2024-01-01"),
      Period.DAY,
      implResult.value,
      reviewResult.value,
    );
    if (!snapshotResult.ok)
      throw new Error(
        `Failed to create ActivitySnapshot: ${snapshotResult.error.message}`,
      );

    const contributorResult = Contributor.create({
      id,
      primaryEmail,
      mergedEmails: [],
      displayName: primaryEmail.value.split("@")[0] || "unknown",
      implementationActivity: implResult.value,
      reviewActivity: reviewResult.value,
      activityTimeline: [snapshotResult.value],
    });
    if (!contributorResult.ok)
      throw new Error(
        `Failed to create Contributor: ${contributorResult.error.message}`,
      );

    return contributorResult.value;
  };

  describe("mergeContributors", () => {
    it("merges two contributors with combined metrics", () => {
      const primary = createContributor("c1", email1, 10, 100, 5);
      const merged = createContributor("c2", email2, 20, 200, 10);

      const result = ContributorService.mergeContributors(primary, [merged]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const contributor = result.value;
        expect(contributor.id).toBe("c1");
        expect(contributor.primaryEmail).toBe(email1);
        expect(contributor.implementationActivity.commitCount).toBe(30);
        expect(contributor.implementationActivity.linesAdded).toBe(300);
        expect(contributor.reviewActivity.pullRequestsReviewed).toBe(15);
      }
    });

    it("merges multiple contributors", () => {
      const primary = createContributor("c1", email1, 10, 100, 5);
      const merged1 = createContributor("c2", email2, 20, 200, 10);
      const merged2 = createContributor("c3", email3, 30, 300, 15);

      const result = ContributorService.mergeContributors(primary, [
        merged1,
        merged2,
      ]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.implementationActivity.commitCount).toBe(60);
        expect(result.value.implementationActivity.linesAdded).toBe(600);
        expect(result.value.reviewActivity.pullRequestsReviewed).toBe(30);
      }
    });

    it("combines all emails from merged contributors", () => {
      const primary = createContributor("c1", email1, 10, 100, 5);
      const merged = createContributor("c2", email2, 20, 200, 10);

      const result = ContributorService.mergeContributors(primary, [merged]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const allEmails = result.value.allEmails;
        expect(allEmails).toHaveLength(2);
        expect(allEmails[0]).toBe(email1);
        expect(result.value.mergedEmails).toContain(email2);
      }
    });

    it("preserves primary email as primary", () => {
      const primary = createContributor("c1", email1, 10, 100, 5);
      const merged = createContributor("c2", email2, 20, 200, 10);

      const result = ContributorService.mergeContributors(primary, [merged]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.primaryEmail).toBe(email1);
        expect(result.value.primaryEmail.value).toBe("user1@example.com");
      }
    });

    it("merges activity timelines chronologically", () => {
      const date1 = new Date("2024-01-01");
      const date2 = new Date("2024-01-02");

      const impl1Result = ImplementationActivity.create({
        commitCount: 10,
        linesAdded: 100,
        linesDeleted: 0,
        linesModified: 100,
        filesChanged: 0,
      });
      if (!impl1Result.ok) throw new Error("Failed to create impl1");
      const impl1 = impl1Result.value;

      const review1Result = ReviewActivity.create({
        pullRequestCount: 5,
        reviewCommentCount: 0,
        pullRequestsReviewed: 5,
      });
      if (!review1Result.ok) throw new Error("Failed to create review1");
      const review1 = review1Result.value;

      const snapshot1Result = ActivitySnapshot.create(
        date1,
        Period.DAY,
        impl1,
        review1,
      );
      if (!snapshot1Result.ok) throw new Error("Failed to create snapshot1");

      const primaryResult = Contributor.create({
        id: "c1",
        primaryEmail: email1,
        mergedEmails: [],
        displayName: "user1",
        implementationActivity: impl1,
        reviewActivity: review1,
        activityTimeline: [snapshot1Result.value],
      });
      if (!primaryResult.ok) throw new Error("Failed to create primary");

      const impl2Result = ImplementationActivity.create({
        commitCount: 20,
        linesAdded: 200,
        linesDeleted: 0,
        linesModified: 200,
        filesChanged: 0,
      });
      if (!impl2Result.ok) throw new Error("Failed to create impl2");

      const review2Result = ReviewActivity.create({
        pullRequestCount: 10,
        reviewCommentCount: 0,
        pullRequestsReviewed: 10,
      });
      if (!review2Result.ok) throw new Error("Failed to create review2");

      const snapshot2Result = ActivitySnapshot.create(
        date2,
        Period.DAY,
        impl2Result.value,
        review2Result.value,
      );
      if (!snapshot2Result.ok) throw new Error("Failed to create snapshot2");

      const mergedResult = Contributor.create({
        id: "c2",
        primaryEmail: email2,
        mergedEmails: [],
        displayName: "user2",
        implementationActivity: impl2Result.value,
        reviewActivity: review2Result.value,
        activityTimeline: [snapshot2Result.value],
      });
      if (!mergedResult.ok) throw new Error("Failed to create merged");

      const result = ContributorService.mergeContributors(primaryResult.value, [
        mergedResult.value,
      ]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const timeline = result.value.activityTimeline;
        expect(timeline).toHaveLength(2);
        expect(timeline[0]!.date).toEqual(date1);
        expect(timeline[1]!.date).toEqual(date2);
      }
    });

    it("combines snapshots on same date", () => {
      const date = new Date("2024-01-01");

      // Create activities for snapshot 1
      const impl1Result = ImplementationActivity.create({
        commitCount: 10,
        linesAdded: 100,
        linesDeleted: 0,
        linesModified: 100,
        filesChanged: 0,
      });
      if (!impl1Result.ok) throw new Error("Failed to create impl1");

      const review1Result = ReviewActivity.create({
        pullRequestCount: 5,
        reviewCommentCount: 0,
        pullRequestsReviewed: 5,
      });
      if (!review1Result.ok) throw new Error("Failed to create review1");

      const snapshot1Result = ActivitySnapshot.create(
        date,
        Period.DAY,
        impl1Result.value,
        review1Result.value,
      );
      if (!snapshot1Result.ok) throw new Error("Failed to create snapshot1");

      const primaryResult = Contributor.create({
        id: "c1",
        primaryEmail: email1,
        mergedEmails: [],
        displayName: "user1",
        implementationActivity: impl1Result.value,
        reviewActivity: review1Result.value,
        activityTimeline: [snapshot1Result.value],
      });
      if (!primaryResult.ok) throw new Error("Failed to create primary");

      // Create activities for snapshot 2
      const impl2Result = ImplementationActivity.create({
        commitCount: 20,
        linesAdded: 200,
        linesDeleted: 0,
        linesModified: 200,
        filesChanged: 0,
      });
      if (!impl2Result.ok) throw new Error("Failed to create impl2");

      const review2Result = ReviewActivity.create({
        pullRequestCount: 10,
        reviewCommentCount: 0,
        pullRequestsReviewed: 10,
      });
      if (!review2Result.ok) throw new Error("Failed to create review2");

      const snapshot2Result = ActivitySnapshot.create(
        date,
        Period.DAY,
        impl2Result.value,
        review2Result.value,
      );
      if (!snapshot2Result.ok) throw new Error("Failed to create snapshot2");

      const mergedResult = Contributor.create({
        id: "c2",
        primaryEmail: email2,
        mergedEmails: [],
        displayName: "user2",
        implementationActivity: impl2Result.value,
        reviewActivity: review2Result.value,
        activityTimeline: [snapshot2Result.value],
      });
      if (!mergedResult.ok) throw new Error("Failed to create merged");

      const result = ContributorService.mergeContributors(primaryResult.value, [
        mergedResult.value,
      ]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const timeline = result.value.activityTimeline;
        expect(timeline).toHaveLength(1);
        expect(timeline[0]!.implementationActivity.commitCount).toBe(30);
        expect(timeline[0]!.implementationActivity.linesAdded).toBe(300);
        expect(timeline[0]!.reviewActivity.pullRequestsReviewed).toBe(15);
      }
    });

    it("rejects empty merged array", () => {
      const primary = createContributor("c1", email1, 10, 100, 5);

      const result = ContributorService.mergeContributors(primary, []);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Must provide at least one contributor to merge",
        );
      }
    });

    it("rejects merging contributor with itself", () => {
      const primary = createContributor("c1", email1, 10, 100, 5);

      const result = ContributorService.mergeContributors(primary, [primary]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Cannot merge a contributor with itself",
        );
      }
    });

    it("rejects duplicate contributors in merged array", () => {
      const primary = createContributor("c1", email1, 10, 100, 5);
      const merged = createContributor("c2", email2, 20, 200, 10);

      const result = ContributorService.mergeContributors(primary, [
        merged,
        merged,
      ]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Merged contributors must be unique",
        );
      }
    });

    it("removes duplicate emails across contributors", () => {
      // Create primary with email1
      const primary = createContributor("c1", email1, 10, 100, 5);

      // Create merged contributor with email1 as primary (same email)
      const merged = createContributor("c2", email1, 20, 200, 10);

      const result = ContributorService.mergeContributors(primary, [merged]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should only have email1 once
        const allEmails = result.value.allEmails;
        expect(allEmails).toHaveLength(1);
        expect(allEmails[0]).toBe(email1);
      }
    });
  });

  describe("canMerge", () => {
    it("returns true for valid merge candidates", () => {
      const primary = createContributor("c1", email1, 10, 100, 5);
      const merged = createContributor("c2", email2, 20, 200, 10);

      expect(ContributorService.canMerge(primary, [merged])).toBe(true);
    });

    it("returns false for empty merged array", () => {
      const primary = createContributor("c1", email1, 10, 100, 5);

      expect(ContributorService.canMerge(primary, [])).toBe(false);
    });

    it("returns false when merging contributor with itself", () => {
      const primary = createContributor("c1", email1, 10, 100, 5);

      expect(ContributorService.canMerge(primary, [primary])).toBe(false);
    });

    it("returns false for duplicate contributors in merged array", () => {
      const primary = createContributor("c1", email1, 10, 100, 5);
      const merged = createContributor("c2", email2, 20, 200, 10);

      expect(ContributorService.canMerge(primary, [merged, merged])).toBe(
        false,
      );
    });
  });
});
