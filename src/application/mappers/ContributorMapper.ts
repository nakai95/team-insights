import { Contributor } from "@/domain/entities/Contributor";
import {
  ContributorDto,
  ImplementationActivityDto,
  ReviewActivityDto,
  ActivitySnapshotDto,
} from "@/application/dto/ContributorDto";
import { ActivitySnapshot } from "@/domain/value-objects/ActivitySnapshot";
import { Email } from "@/domain/value-objects/Email";
import { ImplementationActivity } from "@/domain/value-objects/ImplementationActivity";
import { ReviewActivity } from "@/domain/value-objects/ReviewActivity";
import { Period } from "@/domain/types";

/**
 * Mapper to convert between domain entities and DTOs
 */
export class ContributorMapper {
  /**
   * Convert Contributor entity to DTO
   */
  static toDto(contributor: Contributor): ContributorDto {
    return {
      id: contributor.id,
      primaryEmail: contributor.primaryEmail.value,
      mergedEmails: contributor.mergedEmails.map((e) => e.value),
      displayName: contributor.displayName,
      implementationActivity: this.mapImplementationActivity(
        contributor.implementationActivity,
      ),
      reviewActivity: this.mapReviewActivity(contributor.reviewActivity),
      activityTimeline: contributor.activityTimeline.map((snapshot) =>
        this.mapActivitySnapshot(snapshot),
      ),
    };
  }

  /**
   * Convert DTO to Contributor entity
   */
  static toDomain(dto: ContributorDto): Contributor | null {
    // Create Email value objects
    const primaryEmailResult = Email.create(dto.primaryEmail);
    if (!primaryEmailResult.ok) {
      return null;
    }

    const mergedEmails: Email[] = [];
    for (const emailStr of dto.mergedEmails) {
      const emailResult = Email.create(emailStr);
      if (emailResult.ok) {
        mergedEmails.push(emailResult.value);
      }
    }

    // Create ImplementationActivity value object
    const implActivityResult = ImplementationActivity.create({
      commitCount: dto.implementationActivity.commitCount,
      linesAdded: dto.implementationActivity.linesAdded,
      linesDeleted: dto.implementationActivity.linesDeleted,
      linesModified: dto.implementationActivity.linesModified,
      filesChanged: dto.implementationActivity.filesChanged,
    });
    if (!implActivityResult.ok) {
      return null;
    }

    // Create ReviewActivity value object
    const reviewActivityResult = ReviewActivity.create({
      pullRequestCount: dto.reviewActivity.pullRequestCount,
      reviewCommentCount: dto.reviewActivity.reviewCommentCount,
      pullRequestsReviewed: dto.reviewActivity.pullRequestsReviewed,
    });
    if (!reviewActivityResult.ok) {
      return null;
    }

    // Create ActivitySnapshot value objects
    const timeline: ActivitySnapshot[] = [];
    for (const snapshotDto of dto.activityTimeline || []) {
      const implResult = ImplementationActivity.create({
        commitCount: snapshotDto.implementationActivity.commitCount,
        linesAdded: snapshotDto.implementationActivity.linesAdded,
        linesDeleted: snapshotDto.implementationActivity.linesDeleted,
        linesModified: snapshotDto.implementationActivity.linesModified,
        filesChanged: snapshotDto.implementationActivity.filesChanged,
      });

      const revResult = ReviewActivity.create({
        pullRequestCount: snapshotDto.reviewActivity.pullRequestCount,
        reviewCommentCount: snapshotDto.reviewActivity.reviewCommentCount,
        pullRequestsReviewed: snapshotDto.reviewActivity.pullRequestsReviewed,
      });

      if (implResult.ok && revResult.ok) {
        const snapshotResult = ActivitySnapshot.create(
          new Date(snapshotDto.date),
          snapshotDto.period as Period,
          implResult.value,
          revResult.value,
        );

        if (snapshotResult.ok) {
          timeline.push(snapshotResult.value);
        }
      }
    }

    // Create Contributor entity
    const contributorResult = Contributor.create({
      id: dto.id,
      primaryEmail: primaryEmailResult.value,
      mergedEmails,
      displayName: dto.displayName,
      implementationActivity: implActivityResult.value,
      reviewActivity: reviewActivityResult.value,
      activityTimeline: timeline,
    });

    return contributorResult.ok ? contributorResult.value : null;
  }

  /**
   * Map ImplementationActivity to DTO with derived fields
   */
  private static mapImplementationActivity(
    activity: ImplementationActivity,
  ): ImplementationActivityDto {
    return {
      commitCount: activity.commitCount,
      linesAdded: activity.linesAdded,
      linesDeleted: activity.linesDeleted,
      linesModified: activity.linesModified,
      filesChanged: activity.filesChanged,
      // Derived fields
      totalLineChanges: activity.totalLineChanges,
      netLineChanges: activity.netLineChanges,
      activityScore: activity.activityScore,
    };
  }

  /**
   * Map ReviewActivity to DTO with derived fields
   */
  private static mapReviewActivity(
    activity: ReviewActivity,
  ): ReviewActivityDto {
    return {
      pullRequestCount: activity.pullRequestCount,
      reviewCommentCount: activity.reviewCommentCount,
      pullRequestsReviewed: activity.pullRequestsReviewed,
      // Derived fields
      reviewScore: activity.reviewScore,
      averageCommentsPerReview: activity.averageCommentsPerReview,
    };
  }

  /**
   * Map ActivitySnapshot to DTO
   */
  private static mapActivitySnapshot(
    snapshot: ActivitySnapshot,
  ): ActivitySnapshotDto {
    return {
      date: snapshot.date.toISOString(),
      period: snapshot.period,
      implementationActivity: this.mapImplementationActivity(
        snapshot.implementationActivity,
      ),
      reviewActivity: this.mapReviewActivity(snapshot.reviewActivity),
    };
  }
}
