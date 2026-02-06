/**
 * GraphQL to Domain Model Mappers
 *
 * This module contains pure functions that transform GitHub GraphQL API responses
 * into domain models. These mappers are responsible for:
 * - Type conversion (e.g., ISO strings to Date objects)
 * - Null/undefined handling
 * - State mapping (e.g., GraphQL "MERGED" to domain "merged")
 * - Data structure transformation
 */

import {
  GitCommit,
  PullRequest,
  ReviewComment,
  RateLimitInfo,
  Release,
  Deployment,
  Tag,
} from "@/domain/interfaces/IGitHubRepository";
import { GitHubGraphQLPullRequest } from "../graphql/pullRequests";
import { GitHubGraphQLCommit } from "../graphql/commits";
import { GitHubGraphQLRelease } from "../graphql/releases";
import { GitHubGraphQLDeployment } from "../graphql/deployments";
import { GitHubGraphQLTag } from "../graphql/tags";

/**
 * Map GraphQL PR state to domain PR state
 */
function mapPRState(
  gqlState: "OPEN" | "CLOSED" | "MERGED",
): "open" | "closed" | "merged" {
  if (gqlState === "MERGED") {
    return "merged";
  } else if (gqlState === "CLOSED") {
    return "closed";
  }
  return "open";
}

/**
 * Map GraphQL PullRequest to domain PullRequest
 */
export function mapPullRequest(gqlPR: GitHubGraphQLPullRequest): PullRequest {
  // Handle null author (deleted users)
  const author = gqlPR.author?.login ?? "unknown";

  const pullRequest: PullRequest = {
    number: gqlPR.number,
    title: gqlPR.title,
    author,
    createdAt: new Date(gqlPR.createdAt),
    state: mapPRState(gqlPR.state),
    reviewCommentCount: gqlPR.reviews.totalCount,
  };

  // Add optional fields for merged PRs
  if (gqlPR.mergedAt) {
    pullRequest.mergedAt = new Date(gqlPR.mergedAt);
  }

  // Add code change statistics (always available in GraphQL)
  pullRequest.additions = gqlPR.additions;
  pullRequest.deletions = gqlPR.deletions;
  pullRequest.changedFiles = gqlPR.changedFiles;

  return pullRequest;
}

/**
 * Map GraphQL Commit to domain GitCommit
 */
export function mapCommit(gqlCommit: GitHubGraphQLCommit): GitCommit {
  const author = gqlCommit.author?.name || "Unknown";
  const email = gqlCommit.author?.email || "";
  const date = new Date(gqlCommit.author?.date || "");
  const message = gqlCommit.message.split("\n")[0] || ""; // First line only

  return {
    hash: gqlCommit.oid,
    author,
    email,
    date,
    message,
    filesChanged: gqlCommit.changedFilesIfAvailable,
    linesAdded: gqlCommit.additions,
    linesDeleted: gqlCommit.deletions,
  };
}

/**
 * Check if a commit is a merge commit
 */
export function isMergeCommit(gqlCommit: GitHubGraphQLCommit): boolean {
  return gqlCommit.parents.totalCount > 1;
}

/**
 * Map GraphQL review comment to domain ReviewComment
 */
export function mapReviewComment(
  gqlComment: {
    id: string;
    body: string;
    createdAt: string;
    author: {
      login: string;
    } | null;
  },
  pullRequestNumber: number,
): ReviewComment {
  return {
    id: parseInt(gqlComment.id, 10),
    author: gqlComment.author?.login ?? "unknown",
    createdAt: new Date(gqlComment.createdAt),
    body: gqlComment.body,
    pullRequestNumber,
  };
}

/**
 * Map GraphQL rate limit response to domain RateLimitInfo
 */
export function mapRateLimit(gqlRateLimit: {
  limit: number;
  remaining: number;
  resetAt: string;
}): RateLimitInfo {
  return {
    limit: gqlRateLimit.limit,
    remaining: gqlRateLimit.remaining,
    resetAt: new Date(gqlRateLimit.resetAt),
  };
}

/**
 * Map GraphQL Release to domain Release
 */
export function mapRelease(gqlRelease: GitHubGraphQLRelease): Release {
  return {
    name: gqlRelease.name,
    tagName: gqlRelease.tagName,
    createdAt: gqlRelease.createdAt,
    publishedAt: gqlRelease.publishedAt,
    isPrerelease: gqlRelease.isPrerelease,
    isDraft: gqlRelease.isDraft,
  };
}

/**
 * Map GraphQL Deployment to domain Deployment
 */
export function mapDeployment(
  gqlDeployment: GitHubGraphQLDeployment,
): Deployment {
  return {
    id: gqlDeployment.id,
    createdAt: gqlDeployment.createdAt,
    environment: gqlDeployment.environment,
    state: gqlDeployment.state,
    ref: gqlDeployment.ref?.name ?? null,
    latestStatus: gqlDeployment.latestStatus,
  };
}

/**
 * Map GraphQL Tag to domain Tag
 */
export function mapTag(gqlTag: GitHubGraphQLTag): Tag {
  return {
    name: gqlTag.name,
    target: {
      committedDate: gqlTag.target.committedDate,
      tagger: gqlTag.target.tagger,
    },
  };
}
