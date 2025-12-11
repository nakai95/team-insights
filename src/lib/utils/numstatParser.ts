import { shouldExcludeFile } from "./fileExclusion";

/**
 * Result of parsing git numstat lines
 */
export interface NumstatResult {
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
}

/**
 * Parse git numstat lines to extract file change statistics.
 *
 * Git numstat format uses whitespace (typically TAB) as delimiter:
 * <additions><whitespace><deletions><whitespace><filename>
 *
 * Binary files are marked with dashes:
 * -<whitespace>-<whitespace><filename>
 *
 * This function:
 * - Parses whitespace-separated numstat lines (handles both tabs and spaces)
 * - Excludes generated/build files using shouldExcludeFile
 * - Handles binary files (counts as changed, but no line stats)
 * - Aggregates total lines added/deleted and files changed
 *
 * @param numstatLines - Array of numstat output lines from git log
 * @returns Object with filesChanged, linesAdded, and linesDeleted counts
 *
 * @example
 * ```typescript
 * const lines = [
 *   "10\t5\tsrc/feature.ts",        // Tab-separated (actual git format)
 *   "10      5       src/file.ts",   // Space-separated (also supported)
 *   "-\t-\timage.png",                // Binary file
 *   "100\t50\tpackage-lock.json"     // Will be excluded
 * ];
 * const result = parseNumstat(lines);
 * // { filesChanged: 3, linesAdded: 20, linesDeleted: 10 }
 * ```
 */
export function parseNumstat(numstatLines: string[]): NumstatResult {
  let filesChanged = 0;
  let linesAdded = 0;
  let linesDeleted = 0;

  for (const line of numstatLines) {
    // Skip empty lines
    if (!line || !line.trim()) {
      continue;
    }

    // Split by any whitespace (handles both tabs and spaces)
    const parts = line.trim().split(/\s+/);

    // Need at least 3 parts: additions, deletions, filename
    if (parts.length < 3) {
      continue;
    }

    const additions = parts[0];
    const deletions = parts[1];
    // Filename might contain spaces, so join remaining parts
    const filename = parts.slice(2).join(" ");

    // Skip if any part is missing
    if (!additions || !deletions || !filename) {
      continue;
    }

    // Skip generated/build files
    if (shouldExcludeFile(filename)) {
      continue;
    }

    // Handle binary files (marked with -)
    if (additions === "-" || deletions === "-") {
      // Binary file - count as changed but no line stats
      filesChanged++;
      continue;
    }

    // Parse numeric values
    const addNum = parseInt(additions, 10);
    const delNum = parseInt(deletions, 10);

    // Only count if both are valid numbers
    if (!isNaN(addNum) && !isNaN(delNum)) {
      linesAdded += addNum;
      linesDeleted += delNum;
      filesChanged++;
    }
  }

  return { filesChanged, linesAdded, linesDeleted };
}
