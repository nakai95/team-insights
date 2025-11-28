import { Contributor } from "@/domain/entities/Contributor";
import {
  ContributorDto,
  ImplementationActivityDto,
  ReviewActivityDto,
  ActivitySnapshotDto,
} from "@/application/dto/ContributorDto";
import { ActivitySnapshot } from "@/domain/value-objects/ActivitySnapshot";

/**
 * Mapper to convert domain entities to DTOs
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
   * Map ImplementationActivity to DTO with derived fields
   */
  private static mapImplementationActivity(
    activity: any,
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
  private static mapReviewActivity(activity: any): ReviewActivityDto {
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
