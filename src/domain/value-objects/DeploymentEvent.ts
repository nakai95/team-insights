/**
 * DeploymentEvent Value Object
 *
 * Represents a single deployment event from any source (Release, Deployment, Tag).
 * Provides factory methods for creating events from different sources and
 * helper methods for aggregation.
 *
 * Immutable - all properties are readonly.
 */

import {
  Release,
  Deployment,
  Tag,
} from "@/domain/interfaces/IGitHubRepository";
import { format, startOfISOWeek } from "date-fns";

export const DeploymentSource = {
  RELEASE: "release",
  DEPLOYMENT: "deployment",
  TAG: "tag",
} as const;
export type DeploymentSource =
  (typeof DeploymentSource)[keyof typeof DeploymentSource];

/**
 * Normalize tag name for deduplication
 * Removes common prefixes and converts to lowercase
 */
export function normalizeTagName(tagName: string | null): string | null {
  if (!tagName) return null;

  return tagName
    .replace(/^refs\/tags\//, "") // Remove refs/tags/ prefix
    .toLowerCase() // Convert to lowercase first
    .replace(/^v/, ""); // Remove leading 'v' after lowercase
}

export class DeploymentEvent {
  private constructor(
    readonly id: string,
    readonly tagName: string | null,
    readonly timestamp: Date,
    readonly source: DeploymentSource,
    readonly environment?: string,
    readonly displayName: string = "",
  ) {
    // Validation
    if (!id) {
      throw new Error("DeploymentEvent: id is required");
    }
    if (!timestamp || isNaN(timestamp.getTime())) {
      throw new Error("DeploymentEvent: valid timestamp is required");
    }
  }

  /**
   * Create DeploymentEvent from GitHub Release
   */
  static fromRelease(release: Release): DeploymentEvent {
    const timestamp = new Date(release.publishedAt ?? release.createdAt);
    const normalizedTagName = normalizeTagName(release.tagName);

    return new DeploymentEvent(
      `release-${release.tagName}`,
      normalizedTagName,
      timestamp,
      DeploymentSource.RELEASE,
      undefined,
      release.name ?? release.tagName,
    );
  }

  /**
   * Create DeploymentEvent from GitHub Deployment
   */
  static fromDeployment(deployment: Deployment): DeploymentEvent {
    const timestamp = new Date(deployment.createdAt);
    const normalizedTagName = normalizeTagName(deployment.ref);

    return new DeploymentEvent(
      `deployment-${deployment.id}`,
      normalizedTagName,
      timestamp,
      DeploymentSource.DEPLOYMENT,
      deployment.environment ?? undefined,
      deployment.ref ?? deployment.id,
    );
  }

  /**
   * Create DeploymentEvent from Git Tag
   */
  static fromTag(tag: Tag): DeploymentEvent {
    // Get date from either annotated tag or lightweight tag (commit)
    const dateString =
      tag.target.tagger?.date ?? tag.target.committedDate ?? "";
    const timestamp = new Date(dateString);
    const normalizedTagName = normalizeTagName(tag.name);

    return new DeploymentEvent(
      `tag-${tag.name}`,
      normalizedTagName,
      timestamp,
      DeploymentSource.TAG,
      undefined,
      tag.name,
    );
  }

  /**
   * Get ISO 8601 week key for aggregation (e.g., "2024-W03")
   */
  getWeekKey(): string {
    const weekStart = startOfISOWeek(this.timestamp);
    return format(weekStart, "'W'II-yyyy"); // "W03-2024"
  }

  /**
   * Get ISO 8601 month key for aggregation (e.g., "2024-01")
   */
  getMonthKey(): string {
    return format(this.timestamp, "yyyy-MM"); // "2024-01"
  }

  /**
   * Get week start date for display
   */
  getWeekStartDate(): Date {
    return startOfISOWeek(this.timestamp);
  }

  /**
   * Check if event is within date range
   */
  isWithinRange(startDate?: Date, endDate?: Date): boolean {
    if (startDate && this.timestamp < startDate) return false;
    if (endDate && this.timestamp > endDate) return false;
    return true;
  }

  /**
   * Compare two events by timestamp (for sorting)
   */
  static compareByTimestamp(a: DeploymentEvent, b: DeploymentEvent): number {
    return b.timestamp.getTime() - a.timestamp.getTime(); // Descending (newest first)
  }
}
