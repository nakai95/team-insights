import { Result, ok, err } from "@/lib/result";
import { Contributor } from "@/domain/entities/Contributor";
import { ImplementationActivity } from "@/domain/value-objects/ImplementationActivity";
import { ReviewActivity } from "@/domain/value-objects/ReviewActivity";
import { ActivitySnapshot } from "@/domain/value-objects/ActivitySnapshot";

export class ContributorService {
  /**
   * Merge multiple contributors into a single contributor
   * Combines all metrics and emails from merged contributors into the primary
   *
   * @param primary The primary contributor to merge into
   * @param merged Array of contributors to merge into the primary
   * @returns Result with the merged contributor or error
   */
  static mergeContributors(
    primary: Contributor,
    merged: Contributor[],
  ): Result<Contributor> {
    // Validate input
    if (merged.length === 0) {
      return err(new Error("Must provide at least one contributor to merge"));
    }

    // Check for duplicate contributors
    const mergedIds = merged.map((c) => c.id);
    if (mergedIds.includes(primary.id)) {
      return err(new Error("Cannot merge a contributor with itself"));
    }

    const uniqueIds = new Set(mergedIds);
    if (uniqueIds.size !== mergedIds.length) {
      return err(new Error("Merged contributors must be unique"));
    }

    // Collect all emails
    const allEmails = [
      ...primary.allEmails,
      ...merged.flatMap((c) => c.allEmails),
    ];

    // Remove duplicates and ensure primary email is first
    const emailValues = new Set(allEmails.map((e) => e.value));
    const uniqueEmails = Array.from(emailValues).map(
      (value) => allEmails.find((e) => e.value === value)!,
    );

    // Primary email stays the same, others go to mergedEmails
    const primaryEmail = primary.primaryEmail;
    const mergedEmails = uniqueEmails.filter(
      (e) => e.value !== primaryEmail.value,
    );

    // Merge implementation activity
    const totalCommits =
      primary.implementationActivity.commitCount +
      merged.reduce((sum, c) => sum + c.implementationActivity.commitCount, 0);
    const totalLinesAdded =
      primary.implementationActivity.linesAdded +
      merged.reduce((sum, c) => sum + c.implementationActivity.linesAdded, 0);
    const totalLinesDeleted =
      primary.implementationActivity.linesDeleted +
      merged.reduce((sum, c) => sum + c.implementationActivity.linesDeleted, 0);
    const totalLinesModified =
      primary.implementationActivity.linesModified +
      merged.reduce(
        (sum, c) => sum + c.implementationActivity.linesModified,
        0,
      );
    const totalFilesChanged =
      primary.implementationActivity.filesChanged +
      merged.reduce((sum, c) => sum + c.implementationActivity.filesChanged, 0);

    const implementationResult = ImplementationActivity.create({
      commitCount: totalCommits,
      linesAdded: totalLinesAdded,
      linesDeleted: totalLinesDeleted,
      linesModified: totalLinesModified,
      filesChanged: totalFilesChanged,
    });

    if (!implementationResult.ok) {
      return err(implementationResult.error);
    }

    // Merge review activity
    const totalPRCount =
      primary.reviewActivity.pullRequestCount +
      merged.reduce((sum, c) => sum + c.reviewActivity.pullRequestCount, 0);
    const totalReviewCommentCount =
      primary.reviewActivity.reviewCommentCount +
      merged.reduce((sum, c) => sum + c.reviewActivity.reviewCommentCount, 0);
    const totalPRsReviewed =
      primary.reviewActivity.pullRequestsReviewed +
      merged.reduce((sum, c) => sum + c.reviewActivity.pullRequestsReviewed, 0);

    const reviewResult = ReviewActivity.create({
      pullRequestCount: totalPRCount,
      reviewCommentCount: totalReviewCommentCount,
      pullRequestsReviewed: totalPRsReviewed,
    });

    if (!reviewResult.ok) {
      return err(reviewResult.error);
    }

    // Merge activity timelines
    const allSnapshots = [
      ...primary.activityTimeline,
      ...merged.flatMap((c) => c.activityTimeline),
    ];

    // Group snapshots by date and sum metrics
    const snapshotMap = new Map<string, ActivitySnapshot>();

    for (const snapshot of allSnapshots) {
      const dateKey = snapshot.date.toISOString();
      const existing = snapshotMap.get(dateKey);

      if (existing) {
        // Merge implementation activities
        const mergedImplResult = ImplementationActivity.create({
          commitCount:
            existing.implementationActivity.commitCount +
            snapshot.implementationActivity.commitCount,
          linesAdded:
            existing.implementationActivity.linesAdded +
            snapshot.implementationActivity.linesAdded,
          linesDeleted:
            existing.implementationActivity.linesDeleted +
            snapshot.implementationActivity.linesDeleted,
          linesModified:
            existing.implementationActivity.linesModified +
            snapshot.implementationActivity.linesModified,
          filesChanged:
            existing.implementationActivity.filesChanged +
            snapshot.implementationActivity.filesChanged,
        });

        if (!mergedImplResult.ok) {
          return err(mergedImplResult.error);
        }

        // Merge review activities
        const mergedReviewResult = ReviewActivity.create({
          pullRequestCount:
            existing.reviewActivity.pullRequestCount +
            snapshot.reviewActivity.pullRequestCount,
          reviewCommentCount:
            existing.reviewActivity.reviewCommentCount +
            snapshot.reviewActivity.reviewCommentCount,
          pullRequestsReviewed:
            existing.reviewActivity.pullRequestsReviewed +
            snapshot.reviewActivity.pullRequestsReviewed,
        });

        if (!mergedReviewResult.ok) {
          return err(mergedReviewResult.error);
        }

        // Create merged snapshot
        const mergedSnapshotResult = ActivitySnapshot.create(
          snapshot.date,
          snapshot.period,
          mergedImplResult.value,
          mergedReviewResult.value,
        );

        if (!mergedSnapshotResult.ok) {
          return err(mergedSnapshotResult.error);
        }

        snapshotMap.set(dateKey, mergedSnapshotResult.value);
      } else {
        snapshotMap.set(dateKey, snapshot);
      }
    }

    // Sort snapshots chronologically
    const mergedTimeline = Array.from(snapshotMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    // Create merged contributor
    return Contributor.create({
      id: primary.id,
      primaryEmail,
      mergedEmails,
      displayName: primary.displayName,
      implementationActivity: implementationResult.value,
      reviewActivity: reviewResult.value,
      activityTimeline: mergedTimeline,
    });
  }

  /**
   * Check if two contributors can be merged
   * Returns true if they have no conflicting constraints
   */
  static canMerge(primary: Contributor, merged: Contributor[]): boolean {
    if (merged.length === 0) return false;

    // Check for self-merge
    const mergedIds = merged.map((c) => c.id);
    if (mergedIds.includes(primary.id)) return false;

    // Check for duplicates
    const uniqueIds = new Set(mergedIds);
    if (uniqueIds.size !== mergedIds.length) return false;

    return true;
  }
}
