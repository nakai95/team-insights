import { Period } from "@/domain/types";

/**
 * DTO for contributor data in API responses
 * Includes derived/calculated fields for client consumption
 */
export interface ContributorDto {
  id: string;
  primaryEmail: string;
  mergedEmails: string[];
  displayName: string;
  implementationActivity: ImplementationActivityDto;
  reviewActivity: ReviewActivityDto;
  activityTimeline?: ActivitySnapshotDto[]; // Optional for summary views
}

/**
 * DTO for implementation activity metrics
 * Includes derived fields calculated server-side
 */
export interface ImplementationActivityDto {
  commitCount: number;
  linesAdded: number;
  linesDeleted: number;
  linesModified: number;
  filesChanged: number;
  // Derived fields (calculated server-side)
  totalLineChanges: number;
  netLineChanges: number;
  activityScore: number;
}

/**
 * DTO for review activity metrics
 * Includes derived fields calculated server-side
 */
export interface ReviewActivityDto {
  pullRequestCount: number;
  reviewCommentCount: number;
  pullRequestsReviewed: number;
  // Derived fields
  reviewScore: number;
  averageCommentsPerReview: number;
}

/**
 * DTO for activity timeline snapshots
 */
export interface ActivitySnapshotDto {
  date: string; // ISO 8601
  period: Period;
  implementationActivity: ImplementationActivityDto;
  reviewActivity: ReviewActivityDto;
}
