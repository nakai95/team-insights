import { Result, ok, err } from "@/lib/result";
import {
  IGitHubRepository,
  GitCommit,
  PullRequest,
  ReviewComment,
} from "@/domain/interfaces/IGitHubRepository";
import { RepositoryUrl } from "@/domain/value-objects/RepositoryUrl";
import { DateRange } from "@/domain/value-objects/DateRange";
import { logger } from "@/lib/utils/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";

/**
 * Input for FetchGitData use case
 * GitHub token is now sourced from session via ISessionProvider
 */
export interface FetchGitDataInput {
  repositoryUrl: string;
  dateRange: DateRange;
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
 * Fetches commit history, pull requests, and review comments from GitHub API
 */
export class FetchGitData {
  constructor(private readonly githubRepository: IGitHubRepository) {}

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

      // Step 1: Validate GitHub access
      logger.debug("Validating GitHub access");
      const accessResult = await this.githubRepository.validateAccess(
        owner,
        repo,
      );

      if (!accessResult.ok) {
        return err(accessResult.error);
      }

      // Step 2: Fetch commit log from GitHub API
      logger.debug("Fetching commit log");
      const logResult = await this.githubRepository.getLog(
        input.repositoryUrl,
        input.dateRange.start,
        input.dateRange.end,
      );

      if (!logResult.ok) {
        return err(logResult.error);
      }

      const commits = logResult.value;
      logger.info(`Fetched ${commits.length} commits`);

      // Step 3: Fetch pull requests
      logger.debug("Fetching pull requests");
      const prsResult = await this.githubRepository.getPullRequests(
        owner,
        repo,
        input.dateRange.start,
      );

      if (!prsResult.ok) {
        return err(prsResult.error);
      }

      const pullRequests = prsResult.value;
      logger.info(`Fetched ${pullRequests.length} pull requests`);

      // Step 4: Fetch review comments for all PRs
      logger.debug("Fetching review comments");
      const prNumbers = pullRequests.map((pr) => pr.number);
      const commentsResult = await this.githubRepository.getReviewComments(
        owner,
        repo,
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
        error: getErrorMessage(error),
      });

      return err(
        new Error(`Failed to fetch Git data: ${getErrorMessage(error)}`),
      );
    }
  }
}
