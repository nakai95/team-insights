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
        "--format=format:COMMIT_START%nHASH:%H%nAUTHOR:%an%nEMAIL:%ae%nDATE:%aI%nMESSAGE:%s%n", // Labeled format for easy parsing
      ];

      if (sinceDate) logOptions.push(`--since=${sinceDate.toISOString()}`);

      if (untilDate) logOptions.push(`--until=${untilDate.toISOString()}`);

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
   * Format: COMMIT_START followed by labeled fields (HASH:, AUTHOR:, etc.) and numstat entries
   */
  private parseGitLog(logOutput: string): GitCommit[] {
    const commits: GitCommit[] = [];

    // Split by COMMIT_START delimiter
    const commitBlocks = logOutput
      .split("COMMIT_START")
      .filter((block) => block.trim());

    for (const block of commitBlocks) {
      const lines = block.trim().split("\n");

      // Parse labeled commit fields
      let hash = "";
      let author = "";
      let email = "";
      let dateStr = "";
      let message = "";
      const numstatLines: string[] = [];

      for (const line of lines) {
        // Extract value after label prefix (e.g., "HASH:" is 5 chars, "AUTHOR:" is 7 chars)
        if (line.startsWith("HASH:")) {
          hash = line.substring(5).trim(); // Skip "HASH:" (5 chars)
        } else if (line.startsWith("AUTHOR:")) {
          author = line.substring(7).trim(); // Skip "AUTHOR:" (7 chars)
        } else if (line.startsWith("EMAIL:")) {
          email = line.substring(6).trim(); // Skip "EMAIL:" (6 chars)
        } else if (line.startsWith("DATE:")) {
          dateStr = line.substring(5).trim(); // Skip "DATE:" (5 chars)
        } else if (line.startsWith("MESSAGE:")) {
          message = line.substring(8).trim(); // Skip "MESSAGE:" (8 chars)
        } else if (line.includes("\t")) {
          // This is a numstat line (TAB-separated: additions, deletions, filename)
          numstatLines.push(line);
        }
      }

      // Skip if essential fields are missing
      if (!hash || !dateStr) {
        continue;
      }

      // Parse date
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        logger.warn(`Invalid date in commit ${hash}: ${dateStr}`);
        continue;
      }

      // Parse numstat lines
      const { filesChanged, linesAdded, linesDeleted } =
        this.parseNumstat(numstatLines);

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

  /**
   * Parse numstat lines to extract file change statistics
   */
  private parseNumstat(numstatLines: string[]): {
    filesChanged: number;
    linesAdded: number;
    linesDeleted: number;
  } {
    let filesChanged = 0;
    let linesAdded = 0;
    let linesDeleted = 0;

    for (const line of numstatLines) {
      const parts = line.split("\t");
      if (parts.length >= 3) {
        const additions = parts[0];
        const deletions = parts[1];

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
    }

    return { filesChanged, linesAdded, linesDeleted };
  }
}
