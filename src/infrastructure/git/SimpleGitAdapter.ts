import simpleGit, { SimpleGit, SimpleGitOptions } from "simple-git";
import { IGitOperations, GitCommit } from "@/domain/interfaces/IGitOperations";
import { Result, ok, err } from "@/lib/result";
import { logger } from "@/lib/utils/logger";
import { maskToken } from "@/lib/utils/tokenMasker";
import { execSync } from "child_process";

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

      // Always use full clone to ensure accurate git log results
      // Note: shallow clones (--shallow-since, --depth) can cause git log to miss commits
      // due to missing parent commit history
      await this.git.clone(url, targetPath);

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
      logger.info(`Executing git command: ${gitCommand}`);

      // Execute git command directly using execSync to avoid simple-git output truncation
      const logResult = execSync(gitCommand, {
        cwd: repoPath,
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large repos
      }).toString();

      // Log a sample of the raw output
      logger.info(`Raw log output length: ${logResult.length} chars`);
      const commitStartCount = (logResult.match(/COMMIT_START/g) || []).length;
      logger.info(
        `COMMIT_START occurrences in raw output: ${commitStartCount}`,
      );
      logger.info(`First 1000 chars of raw log:`);
      logger.info(logResult.substring(0, 1000));

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

    logger.info(`Parsing ${commitBlocks.length} commit blocks`);

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

      // Log numstat line count for debugging
      logger.info(
        `Commit ${hash.substring(0, 7)}: ${numstatLines.length} numstat lines`,
      );

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
   * Check if a file should be excluded from metrics
   * Excludes generated files, lock files, and build artifacts
   */
  private shouldExcludeFile(filename: string): boolean {
    const excludePatterns = [
      // Lock files
      /^package-lock\.json$/,
      /^yarn\.lock$/,
      /^pnpm-lock\.yaml$/,
      /^Gemfile\.lock$/,
      /^Cargo\.lock$/,
      /^poetry\.lock$/,
      /^composer\.lock$/,

      // Build artifacts and dist directories
      /^dist\//,
      /^build\//,
      /^out\//,
      /^\.next\//,
      /^target\//,
      /^bin\//,
      /^obj\//,

      // Dependencies
      /^node_modules\//,
      /^vendor\//,
      /^\.venv\//,

      // Generated documentation
      /^docs\/api\//,
      /^coverage\//,

      // Minified files
      /\.min\.js$/,
      /\.min\.css$/,

      // Source maps
      /\.map$/,
    ];

    return excludePatterns.some((pattern) => pattern.test(filename));
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
    let excludedCount = 0;

    // Log first 10 files for debugging large commits
    if (numstatLines.length > 100) {
      logger.info(`Large commit detected: ${numstatLines.length} file changes`);
      logger.info("First 10 files:");
      for (let i = 0; i < Math.min(10, numstatLines.length); i++) {
        const parts = numstatLines[i]?.split("\t");
        if (parts && parts.length >= 3) {
          logger.info(`  ${parts[0]}\t${parts[1]}\t${parts[2]}`);
        }
      }
    }

    for (const line of numstatLines) {
      const parts = line.split("\t");
      if (parts.length >= 3) {
        const additions = parts[0];
        const deletions = parts[1];
        const filename = parts[2]; // Third part is filename

        if (!additions || !deletions || !filename) continue;

        // Skip generated/build files
        if (this.shouldExcludeFile(filename)) {
          excludedCount++;
          continue;
        }

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

    if (excludedCount > 0) {
      logger.info(
        `Excluded ${excludedCount} files from metrics (generated/build files)`,
      );
    }

    return { filesChanged, linesAdded, linesDeleted };
  }
}
