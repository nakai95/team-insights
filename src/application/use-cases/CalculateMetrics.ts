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

      // Group commits by email
      const commitsByEmail = this.groupCommitsByEmail(input.commits);

      // Group PRs by author
      const prsByAuthor = this.groupPRsByAuthor(input.pullRequests);

      // Group review comments by author
      const commentsByAuthor = this.groupCommentsByAuthor(input.reviewComments);

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
        error: error instanceof Error ? error.message : String(error),
      });

      return err(
        new Error(
          `Failed to calculate metrics: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }
  }

  /**
   * Group commits by email address
   */
  private groupCommitsByEmail(commits: GitCommit[]): Map<string, GitCommit[]> {
    const grouped = new Map<string, GitCommit[]>();

    for (const commit of commits) {
      const email = commit.email.toLowerCase();
      const existing = grouped.get(email);

      if (existing) {
        existing.push(commit);
      } else {
        grouped.set(email, [commit]);
      }
    }

    return grouped;
  }

  /**
   * Group PRs by author username
   */
  private groupPRsByAuthor(prs: PullRequest[]): Map<string, PullRequest[]> {
    const grouped = new Map<string, PullRequest[]>();

    for (const pr of prs) {
      const author = pr.author.toLowerCase();
      const existing = grouped.get(author);

      if (existing) {
        existing.push(pr);
      } else {
        grouped.set(author, [pr]);
      }
    }

    return grouped;
  }

  /**
   * Group review comments by author username
   */
  private groupCommentsByAuthor(
    comments: ReviewComment[],
  ): Map<string, ReviewComment[]> {
    const grouped = new Map<string, ReviewComment[]>();

    for (const comment of comments) {
      const author = comment.author.toLowerCase();
      const existing = grouped.get(author);

      if (existing) {
        existing.push(comment);
      } else {
        grouped.set(author, [comment]);
      }
    }

    return grouped;
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
   */
  private calculateReviewActivity(
    prs: PullRequest[],
    comments: ReviewComment[],
  ): Result<ReviewActivity> {
    // Count unique PRs reviewed (PRs where user left comments)
    const reviewedPRs = new Set(comments.map((c) => c.pullRequestNumber));

    return ReviewActivity.create({
      pullRequestCount: prs.length,
      reviewCommentCount: comments.length,
      pullRequestsReviewed: reviewedPRs.size,
    });
  }
}
