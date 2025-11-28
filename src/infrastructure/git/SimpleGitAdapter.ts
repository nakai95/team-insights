import simpleGit, { SimpleGit, SimpleGitOptions } from "simple-git";
import { IGitOperations, GitCommit } from "@/domain/interfaces/IGitOperations";
import { Result, ok, err } from "@/lib/result";
import { logger } from "@/lib/utils/logger";
import { maskToken } from "@/lib/utils/tokenMasker";

/**
 * Adapter for Git operations using simple-git library
 * Implements IGitOperations interface for repository cloning and log parsing
 */
export class SimpleGitAdapter implements IGitOperations {
  private git: SimpleGit;

  constructor(options?: Partial<SimpleGitOptions>) {
    this.git = options ? simpleGit(options) : simpleGit();
  }

  /**
   * Clone a repository to a target directory
   * @param url Repository URL (may contain token)
   * @param targetPath Directory to clone to
   * @param sinceDate Optional date to limit history with --shallow-since
   */
  async clone(
    url: string,
    targetPath: string,
    sinceDate?: Date,
  ): Promise<Result<void>> {
    try {
      logger.info(`Cloning repository to ${targetPath}`, {
        url: maskToken(url),
        sinceDate: sinceDate?.toISOString(),
      });

      const cloneOptions: string[] = [];

      // Note: We don't use --depth 1 because we need full history for accurate metrics
      // However, we can use --shallow-since if a date is provided
      if (sinceDate) {
        const sinceStr = sinceDate.toISOString().split("T")[0]; // YYYY-MM-DD
        cloneOptions.push(`--shallow-since=${sinceStr}`);
      }

      await this.git.clone(url, targetPath, cloneOptions);

      logger.info(`Successfully cloned repository to ${targetPath}`);
      return ok(undefined);
    } catch (error) {
      logger.error("Failed to clone repository", {
        url: maskToken(url),
        targetPath,
        error: error instanceof Error ? error.message : String(error),
      });

      return err(
        new Error(
          `Failed to clone repository: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }
  }

  /**
   * Get commit log from repository
   * @param repoPath Path to cloned repository
   * @param sinceDate Optional date to filter commits (inclusive)
   * @param untilDate Optional end date to filter commits (inclusive)
   */
  async getLog(
    repoPath: string,
    sinceDate?: Date,
    untilDate?: Date,
  ): Promise<Result<GitCommit[]>> {
    try {
      logger.info(`Fetching git log from ${repoPath}`, {
        sinceDate: sinceDate?.toISOString(),
        untilDate: untilDate?.toISOString(),
      });

      // Create a new git instance for the specific repository
      const repoGit = simpleGit(repoPath);

      // Build git log command
      const logOptions: string[] = [
        "log",
        "--all", // Include all branches
        "--numstat", // Include file change statistics
        "--format=%H%n%an%n%ae%n%aI%n%s%n%b%n--END-COMMIT--", // Custom format for parsing
      ];

      if (sinceDate) {
        logOptions.push(`--since=${sinceDate.toISOString()}`);
      }

      if (untilDate) {
        logOptions.push(`--until=${untilDate.toISOString()}`);
      }

      // Get raw log output
      const logResult = await repoGit.raw(logOptions);

      // Parse the log output
      const commits = this.parseGitLog(logResult);

      logger.info(
        `Successfully fetched ${commits.length} commits from ${repoPath}`,
      );
      return ok(commits);
    } catch (error) {
      logger.error("Failed to fetch git log", {
        repoPath,
        error: error instanceof Error ? error.message : String(error),
      });

      return err(
        new Error(
          `Failed to fetch git log: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }
  }

  /**
   * Parse raw git log output into structured GitCommit objects
   * Format: hash, author name, author email, date, subject, body, --END-COMMIT--, numstat entries
   */
  private parseGitLog(logOutput: string): GitCommit[] {
    const commits: GitCommit[] = [];

    // Split by commit delimiter
    const commitBlocks = logOutput
      .split("--END-COMMIT--")
      .filter((block) => block.trim());

    for (const block of commitBlocks) {
      const lines = block.trim().split("\n");

      if (lines.length < 5) {
        // Skip malformed entries
        continue;
      }

      const hash = lines[0]?.trim() || "";
      const author = lines[1]?.trim() || "";
      const email = lines[2]?.trim() || "";
      const dateStr = lines[3]?.trim() || "";
      const message = lines[4]?.trim() || "";

      // Parse date
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        logger.warn(`Invalid date in commit ${hash}: ${dateStr}`);
        continue;
      }

      // Parse numstat lines (after message and empty line)
      let filesChanged = 0;
      let linesAdded = 0;
      let linesDeleted = 0;

      // Find where numstat data starts (after message lines)
      let numstatStartIndex = 5;
      while (numstatStartIndex < lines.length) {
        const line = lines[numstatStartIndex];
        if (!line || line.trim() === "") {
          numstatStartIndex++;
          continue;
        }

        // Numstat format: additions deletions filename
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const additions = parts[0];
          const deletions = parts[1];

          // Skip if parts are undefined
          if (!additions || !deletions) continue;

          // Handle binary files (marked with -)
          if (additions !== "-" && deletions !== "-") {
            const addNum = parseInt(additions, 10);
            const delNum = parseInt(deletions, 10);

            if (!isNaN(addNum) && !isNaN(delNum)) {
              linesAdded += addNum;
              linesDeleted += delNum;
              filesChanged++;
            }
          } else {
            // Binary file, count as changed but no line stats
            filesChanged++;
          }
        }

        numstatStartIndex++;
      }

      commits.push({
        hash,
        author,
        email,
        date,
        message,
        filesChanged,
        linesAdded,
        linesDeleted,
      });
    }

    return commits;
  }
}
