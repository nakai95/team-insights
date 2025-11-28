import { Result, ok, err } from "@/lib/result";
import { IGitOperations, GitCommit } from "@/domain/interfaces/IGitOperations";
import {
  IGitHubAPI,
  PullRequest,
  ReviewComment,
} from "@/domain/interfaces/IGitHubAPI";
import { RepositoryUrl } from "@/domain/value-objects/RepositoryUrl";
import { DateRange } from "@/domain/value-objects/DateRange";
import { logger } from "@/lib/utils/logger";

/**
 * Input for FetchGitData use case
 */
export interface FetchGitDataInput {
  repositoryUrl: string;
  githubToken: string;
  dateRange: DateRange;
  tempDirectory: string;
}

/**
 * Output from FetchGitData use case
 */
export interface FetchGitDataOutput {
  commits: GitCommit[];
  pullRequests: PullRequest[];
  reviewComments: ReviewComment[];
}

/**
 * Use case for fetching Git and GitHub data
 * Orchestrates repository cloning, commit parsing, and GitHub API calls
 */
export class FetchGitData {
  constructor(
    private readonly gitOperations: IGitOperations,
    private readonly githubAPI: IGitHubAPI,
  ) {}

  async execute(input: FetchGitDataInput): Promise<Result<FetchGitDataOutput>> {
    try {
      logger.info("Starting FetchGitData use case", {
        repositoryUrl: input.repositoryUrl,
        dateRange: {
          start: input.dateRange.start.toISOString(),
          end: input.dateRange.end.toISOString(),
        },
      });

      // Validate repository URL
      const urlResult = RepositoryUrl.create(input.repositoryUrl);
      if (!urlResult.ok) {
        return err(urlResult.error);
      }

      const repoUrl = urlResult.value;
      const owner = repoUrl.owner;
      const repo = repoUrl.repo;

      // Step 1: Validate GitHub token access
      logger.info("Validating GitHub access");
      const accessResult = await this.githubAPI.validateAccess(
        owner,
        repo,
        input.githubToken,
      );

      if (!accessResult.ok) {
        return err(accessResult.error);
      }

      // Step 2: Clone repository
      logger.info("Cloning repository", { tempDirectory: input.tempDirectory });
      const cloneUrl = this.buildCloneUrl(
        input.repositoryUrl,
        input.githubToken,
      );
      const cloneResult = await this.gitOperations.clone(
        cloneUrl,
        input.tempDirectory,
        input.dateRange.start,
      );

      if (!cloneResult.ok) {
        return err(cloneResult.error);
      }

      // Step 3: Fetch commit log
      logger.info("Fetching commit log");
      const logResult = await this.gitOperations.getLog(
        input.tempDirectory,
        input.dateRange.start,
        input.dateRange.end,
      );

      if (!logResult.ok) {
        return err(logResult.error);
      }

      const commits = logResult.value;
      logger.info(`Fetched ${commits.length} commits`);

      // Step 4: Fetch pull requests
      logger.info("Fetching pull requests");
      const prsResult = await this.githubAPI.getPullRequests(
        owner,
        repo,
        input.githubToken,
        input.dateRange.start,
      );

      if (!prsResult.ok) {
        return err(prsResult.error);
      }

      const pullRequests = prsResult.value;
      logger.info(`Fetched ${pullRequests.length} pull requests`);

      // Step 5: Fetch review comments for all PRs
      logger.info("Fetching review comments");
      const prNumbers = pullRequests.map((pr) => pr.number);
      const commentsResult = await this.githubAPI.getReviewComments(
        owner,
        repo,
        input.githubToken,
        prNumbers,
      );

      if (!commentsResult.ok) {
        return err(commentsResult.error);
      }

      const reviewComments = commentsResult.value;
      logger.info(`Fetched ${reviewComments.length} review comments`);

      // Update PR review comment counts
      const commentCountMap = new Map<number, number>();
      for (const comment of reviewComments) {
        const count = commentCountMap.get(comment.pullRequestNumber) || 0;
        commentCountMap.set(comment.pullRequestNumber, count + 1);
      }

      for (const pr of pullRequests) {
        pr.reviewCommentCount = commentCountMap.get(pr.number) || 0;
      }

      logger.info("FetchGitData use case completed successfully");

      return ok({
        commits,
        pullRequests,
        reviewComments,
      });
    } catch (error) {
      logger.error("FetchGitData use case failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      return err(
        new Error(
          `Failed to fetch Git data: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }
  }

  /**
   * Build clone URL with embedded token for authentication
   */
  private buildCloneUrl(repositoryUrl: string, token: string): string {
    // Convert https://github.com/owner/repo to https://token@github.com/owner/repo
    const url = new URL(repositoryUrl);
    url.username = token;
    return url.toString();
  }
}
