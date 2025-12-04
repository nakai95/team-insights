import { GitCommit } from "@/domain/interfaces/IGitOperations";
import { Result, ok, err } from "@/lib/result";

/**
 * Parser for git log output
 * Handles different git log formats and extracts structured commit data
 */
export class GitLogParser {
  /**
   * Parse git log output with numstat format
   * Expected format:
   * - Line 1: Commit hash
   * - Line 2: Author name
   * - Line 3: Author email
   * - Line 4: Author date (ISO 8601)
   * - Line 5+: Commit message
   * - Followed by numstat lines: <additions> <deletions> <filename>
   * - Delimiter: --END-COMMIT--
   */
  static parseNumstatFormat(logOutput: string): Result<GitCommit[]> {
    try {
      const commits: GitCommit[] = [];

      // Split by commit delimiter
      const commitBlocks = logOutput
        .split("--END-COMMIT--")
        .filter((block) => block.trim());

      for (const block of commitBlocks) {
        const commitResult = this.parseCommitBlock(block);

        if (commitResult.ok) {
          commits.push(commitResult.value);
        }
        // Skip malformed commits silently
      }

      return ok(commits);
    } catch (error) {
      return err(
        new Error(
          `Failed to parse git log: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }
  }

  /**
   * Parse a single commit block
   */
  private static parseCommitBlock(block: string): Result<GitCommit> {
    const lines = block.trim().split("\n");

    if (lines.length < 5) {
      return err(new Error("Incomplete commit block"));
    }

    // Extract commit metadata
    const hash = lines[0]?.trim();
    const author = lines[1]?.trim();
    const email = lines[2]?.trim();
    const dateStr = lines[3]?.trim();

    if (!hash || !author || !email || !dateStr) {
      return err(new Error("Missing required commit fields"));
    }

    // Parse date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return err(new Error(`Invalid date: ${dateStr}`));
    }

    // Extract message (lines 4+, before numstat data)
    let messageEndIndex = 4;
    const messageLines: string[] = [];

    // Find where message ends and numstat begins
    for (let i = 4; i < lines.length; i++) {
      const line = lines[i];

      // Check if this is a numstat line (additions deletions filename)
      if (line && this.isNumstatLine(line)) {
        messageEndIndex = i;
        break;
      }

      messageLines.push(line || "");
    }

    // If no numstat found, all remaining lines are message
    if (messageEndIndex === 4) {
      messageEndIndex = lines.length;
      for (let i = 4; i < lines.length; i++) {
        messageLines.push(lines[i] || "");
      }
    }

    const message = messageLines.join("\n").trim().split("\n")[0] || ""; // Take first line as message

    // Parse numstat data
    const { filesChanged, linesAdded, linesDeleted } = this.parseNumstat(
      lines.slice(messageEndIndex),
    );

    return ok({
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

  /**
   * Check if a line is a numstat line
   * Format: <number|-> <number|-> <filename>
   */
  private static isNumstatLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 3) return false;

    const first = parts[0];
    const second = parts[1];

    // Check if first two parts are either numbers or '-'
    return (this.isNumberOrDash(first) && this.isNumberOrDash(second)) || false;
  }

  /**
   * Check if string is a number or dash (for binary files)
   */
  private static isNumberOrDash(str: string | undefined): boolean {
    if (!str) return false;
    return str === "-" || /^\d+$/.test(str);
  }

  /**
   * Parse numstat lines to extract file change statistics
   */
  private static parseNumstat(numstatLines: string[]): {
    filesChanged: number;
    linesAdded: number;
    linesDeleted: number;
  } {
    let filesChanged = 0;
    let linesAdded = 0;
    let linesDeleted = 0;

    for (const line of numstatLines) {
      if (!line || !line.trim()) continue;

      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) continue;

      const additions = parts[0];
      const deletions = parts[1];

      // Skip if parts are undefined (shouldn't happen after length check, but TypeScript requires it)
      if (!additions || !deletions) continue;

      // Handle binary files (marked with -)
      if (additions === "-" || deletions === "-") {
        // Binary file - count as changed but no line stats
        filesChanged++;
        continue;
      }

      const addNum = parseInt(additions, 10);
      const delNum = parseInt(deletions, 10);

      if (!isNaN(addNum) && !isNaN(delNum)) {
        linesAdded += addNum;
        linesDeleted += delNum;
        filesChanged++;
      }
    }

    return { filesChanged, linesAdded, linesDeleted };
  }

  /**
   * Parse simplified git log format (without numstat)
   * Useful for quick parsing when file stats aren't needed
   */
  static parseSimpleFormat(logOutput: string): Result<GitCommit[]> {
    try {
      const commits: GitCommit[] = [];

      const commitBlocks = logOutput
        .split("--END-COMMIT--")
        .filter((block) => block.trim());

      for (const block of commitBlocks) {
        const lines = block.trim().split("\n");

        if (lines.length < 5) continue;

        const hash = lines[0]?.trim();
        const author = lines[1]?.trim();
        const email = lines[2]?.trim();
        const dateStr = lines[3]?.trim();
        const message = lines[4]?.trim();

        if (!hash || !author || !email || !dateStr) continue;

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;

        commits.push({
          hash,
          author,
          email,
          date,
          message: message || "",
          filesChanged: 0,
          linesAdded: 0,
          linesDeleted: 0,
        });
      }

      return ok(commits);
    } catch (error) {
      return err(
        new Error(
          `Failed to parse git log: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }
  }
}
