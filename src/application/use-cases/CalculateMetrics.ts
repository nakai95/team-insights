import { Result, ok, err } from "@/lib/result";
import { GitCommit } from "@/domain/interfaces/IGitOperations";
import { PullRequest, ReviewComment } from "@/domain/interfaces/IGitHubAPI";
import { Contributor } from "@/domain/entities/Contributor";
import { Email } from "@/domain/value-objects/Email";
import { ImplementationActivity } from "@/domain/value-objects/ImplementationActivity";
import { ReviewActivity } from "@/domain/value-objects/ReviewActivity";
import { ActivitySnapshot } from "@/domain/value-objects/ActivitySnapshot";
import { Period } from "@/domain/types";
import { logger } from "@/lib/utils/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { groupBy } from "@/lib/utils/collection";

/**
 * Input for CalculateMetrics use case
 */
export interface CalculateMetricsInput {
  commits: GitCommit[];
  pullRequests: PullRequest[];
  reviewComments: ReviewComment[];
}

/**
 * Output from CalculateMetrics use case
 */
export interface CalculateMetricsOutput {
  contributors: Contributor[];
}

/**
 * Use case for calculating contributor metrics from raw Git/GitHub data
 * Aggregates commits, PRs, and review comments by contributor
 */
export class CalculateMetrics {
  async execute(
    input: CalculateMetricsInput,
  ): Promise<Result<CalculateMetricsOutput>> {
    try {
      logger.info("Starting CalculateMetrics use case", {
        commitCount: input.commits.length,
        prCount: input.pullRequests.length,
        commentCount: input.reviewComments.length,
      });

      // Log detailed commit analysis only in debug mode
      logger.debug("=== Detailed Commit Analysis ===");
      for (const commit of input.commits) {
        const totalChanges = commit.linesAdded + commit.linesDeleted;
        logger.debug(`Commit ${commit.hash.substring(0, 7)}`, {
          author: commit.author,
          email: commit.email,
          linesAdded: commit.linesAdded,
          linesDeleted: commit.linesDeleted,
          filesChanged: commit.filesChanged,
          totalChanges,
        });
      }

      // Group commits by email
      const commitsByEmail = groupBy(input.commits, (commit) =>
        commit.email.toLowerCase(),
      );

      // Group PRs by author
      const prsByAuthor = groupBy(input.pullRequests, (pr) =>
        pr.author.toLowerCase(),
      );

      // Group review comments by author
      const commentsByAuthor = groupBy(input.reviewComments, (comment) =>
        comment.author.toLowerCase(),
      );

      // Get all unique contributors (emails from commits + GitHub usernames)
      const contributorKeys = new Set([
        ...commitsByEmail.keys(),
        ...prsByAuthor.keys(),
        ...commentsByAuthor.keys(),
      ]);

      logger.info(`Found ${contributorKeys.size} unique contributors`);

      // Calculate metrics for each contributor
      const contributors: Contributor[] = [];

      for (const key of contributorKeys) {
        const contributorResult = this.createContributor(
          key,
          commitsByEmail.get(key) || [],
          prsByAuthor.get(key) || [],
          commentsByAuthor.get(key) || [],
        );

        if (contributorResult.ok) {
          contributors.push(contributorResult.value);
        } else {
          logger.warn(`Failed to create contributor for ${key}`, {
            error: contributorResult.error.message,
          });
        }
      }

      logger.info(`Successfully created ${contributors.length} contributors`);

      return ok({ contributors });
    } catch (error) {
      logger.error("CalculateMetrics use case failed", {
        error: getErrorMessage(error),
      });

      return err(
        new Error(`Failed to calculate metrics: ${getErrorMessage(error)}`),
      );
    }
  }

  /**
   * Create a Contributor entity from raw data
   */
  private createContributor(
    identifier: string,
    commits: GitCommit[],
    prs: PullRequest[],
    comments: ReviewComment[],
  ): Result<Contributor> {
    // Use email if it looks like an email, otherwise use as display name
    const isEmail = identifier.includes("@");
    const emailStr = isEmail ? identifier : `${identifier}@github.local`;
    const displayName = isEmail ? commits[0]?.author || identifier : identifier;

    const emailResult = Email.create(emailStr);
    if (!emailResult.ok) {
      return err(emailResult.error);
    }

    // Calculate implementation activity from commits
    const implActivityResult = this.calculateImplementationActivity(commits);
    if (!implActivityResult.ok) {
      return err(implActivityResult.error);
    }

    // Calculate review activity from PRs and comments
    const reviewActivityResult = this.calculateReviewActivity(prs, comments);
    if (!reviewActivityResult.ok) {
      return err(reviewActivityResult.error);
    }

    // Create contributor
    const contributorResult = Contributor.create({
      id: `contributor-${identifier.replace(/[^a-zA-Z0-9]/g, "-")}`,
      primaryEmail: emailResult.value,
      mergedEmails: [],
      displayName,
      implementationActivity: implActivityResult.value,
      reviewActivity: reviewActivityResult.value,
      activityTimeline: [], // Timeline can be added later if needed
    });

    return contributorResult;
  }

  /**
   * Calculate implementation activity from commits
   */
  private calculateImplementationActivity(
    commits: GitCommit[],
  ): Result<ImplementationActivity> {
    let totalLinesAdded = 0;
    let totalLinesDeleted = 0;
    let totalLinesModified = 0;
    let totalFilesChanged = 0;

    for (const commit of commits) {
      totalLinesAdded += commit.linesAdded;
      totalLinesDeleted += commit.linesDeleted;
      totalFilesChanged += commit.filesChanged;
    }

    return ImplementationActivity.create({
      commitCount: commits.length,
      linesAdded: totalLinesAdded,
      linesDeleted: totalLinesDeleted,
      linesModified: totalLinesModified,
      filesChanged: totalFilesChanged,
    });
  }

  /**
   * Calculate review activity from PRs and comments
   * Excludes comments on user's own PRs from review metrics
   */
  private calculateReviewActivity(
    prs: PullRequest[],
    comments: ReviewComment[],
  ): Result<ReviewActivity> {
    // Get PR numbers that this user authored
    const authoredPRNumbers = new Set(prs.map((pr) => pr.number));

    // Filter out comments on user's own PRs
    const reviewCommentsOnOthersPRs = comments.filter(
      (comment) => !authoredPRNumbers.has(comment.pullRequestNumber),
    );

    // Count unique PRs reviewed (PRs where user left comments, excluding own PRs)
    const reviewedPRs = new Set(
      reviewCommentsOnOthersPRs.map((c) => c.pullRequestNumber),
    );

    return ReviewActivity.create({
      pullRequestCount: prs.length,
      reviewCommentCount: reviewCommentsOnOthersPRs.length,
      pullRequestsReviewed: reviewedPRs.size,
    });
  }
}
