import simpleGit, { SimpleGit, SimpleGitOptions } from "simple-git";
import { IGitOperations, GitCommit } from "@/domain/interfaces/IGitOperations";
import { ISessionProvider } from "@/domain/interfaces/ISessionProvider";
import { Result, ok, err } from "@/lib/result";
import { logger } from "@/lib/utils/logger";
import { maskToken } from "@/lib/utils/tokenMasker";
import { parseNumstat } from "@/lib/utils/numstatParser";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { execSync } from "child_process";

/**
 * Adapter for Git operations using simple-git library
 * Implements IGitOperations interface for repository cloning and log parsing
 *
 * Modified to use ISessionProvider for OAuth token retrieval.
 * Token is injected into HTTPS URLs for authenticated cloning.
 */
export class SimpleGitAdapter implements IGitOperations {
  private git: SimpleGit;

  constructor(
    private sessionProvider: ISessionProvider,
    options?: Partial<SimpleGitOptions>,
  ) {
    this.git = options ? simpleGit(options) : simpleGit();
  }

  /**
   * Get GitHub access token from session
   * @throws Error if token retrieval fails
   */
  private async getToken(): Promise<string> {
    const tokenResult = await this.sessionProvider.getAccessToken();
    if (!tokenResult.ok) {
      throw tokenResult.error;
    }
    return tokenResult.value;
  }

  /**
   * Clone a repository to a target directory
   * Token is automatically injected from session into the URL
   * @param url Repository URL (HTTPS GitHub URL)
   * @param targetPath Directory to clone to
   * @param sinceDate Optional date to limit history (not used - full clone for accuracy)
   */
  async clone(
    url: string,
    targetPath: string,
    sinceDate?: Date,
  ): Promise<Result<void>> {
    try {
      const token = await this.getToken();

      // Inject token into URL: https://oauth2:<token>@github.com/owner/repo.git
      const authenticatedUrl = url.replace(
        "https://github.com",
        `https://oauth2:${token}@github.com`,
      );

      logger.debug(`Cloning repository to ${targetPath}`, {
        url: maskToken(authenticatedUrl),
        sinceDate: sinceDate?.toISOString(),
      });

      // Always use full clone to ensure accurate git log results
      // Note: shallow clones (--shallow-since, --depth) can cause git log to miss commits
      // due to missing parent commit history
      await this.git.clone(authenticatedUrl, targetPath);

      logger.info(`Successfully cloned repository to ${targetPath}`);
      return ok(undefined);
    } catch (error) {
      logger.error("Failed to clone repository", {
        targetPath,
        error: getErrorMessage(error),
      });

      return err(
        new Error(`Failed to clone repository: ${getErrorMessage(error)}`),
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
      logger.debug(`Fetching git log from ${repoPath}`, {
        sinceDate: sinceDate?.toISOString(),
        untilDate: untilDate?.toISOString(),
      });

      // Build git log command
      const logOptions: string[] = [
        "log",
        "--all", // Include all branches
        "--no-merges", // Exclude merge commits to avoid double-counting
        "--numstat", // Include file change statistics
        "--format=format:COMMIT_START%nHASH:%H%nAUTHOR:%an%nEMAIL:%ae%nDATE:%aI%nMESSAGE:%s%n", // Labeled format for easy parsing
      ];

      if (sinceDate) logOptions.push(`--since=${sinceDate.toISOString()}`);

      if (untilDate) logOptions.push(`--until=${untilDate.toISOString()}`);

      // Build command string
      const gitCommand = `git ${logOptions.join(" ")}`;
      logger.debug(`Executing git command: ${gitCommand}`);

      // Execute git command directly using execSync to avoid simple-git output truncation
      const logResult = execSync(gitCommand, {
        cwd: repoPath,
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large repos
      }).toString();

      // Log raw output details only in debug mode
      logger.debug(`Raw log output length: ${logResult.length} chars`);
      const commitStartCount = (logResult.match(/COMMIT_START/g) || []).length;
      logger.debug(
        `COMMIT_START occurrences in raw output: ${commitStartCount}`,
      );
      logger.debug(`First 1000 chars of raw log:`);
      logger.debug(logResult.substring(0, 1000));

      // Parse the log output
      const commits = this.parseGitLog(logResult);

      logger.info(
        `Successfully fetched ${commits.length} commits from ${repoPath}`,
      );
      return ok(commits);
    } catch (error) {
      logger.error("Failed to fetch git log", {
        repoPath,
        error: getErrorMessage(error),
      });

      return err(
        new Error(`Failed to fetch git log: ${getErrorMessage(error)}`),
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

    logger.info(`Parsing ${commitBlocks.length} commit blocks`);

    let totalNumstatLines = 0;

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
        logger.warn("Skipping commit block: missing hash or date");
        continue;
      }

      // Parse date
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        logger.warn(`Invalid date in commit ${hash}: ${dateStr}`);
        continue;
      }

      totalNumstatLines += numstatLines.length;

      // Parse numstat lines
      const { filesChanged, linesAdded, linesDeleted } =
        parseNumstat(numstatLines);

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

    // Log summary statistics instead of per-commit details
    logger.debug("Numstat parsing summary", {
      totalCommits: commits.length,
      totalNumstatLines,
      avgNumstatLinesPerCommit:
        commits.length > 0 ? Math.round(totalNumstatLines / commits.length) : 0,
    });

    return commits;
  }
}
