import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { Result, ok, err } from "@/lib/result";
import { logger } from "@/lib/utils/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";

/**
 * Manages temporary directories for repository clones
 * Handles creation and cleanup of temporary directories
 */
export class TempDirectoryManager {
  private readonly baseDir: string;
  private readonly createdDirs: Set<string>;

  constructor(baseDir?: string) {
    // Use system temp directory if not specified
    this.baseDir = baseDir || os.tmpdir();
    this.createdDirs = new Set();
  }

  /**
   * Create a temporary directory with a unique name
   * @param prefix Optional prefix for directory name
   * @returns Result with path to created directory
   */
  async create(prefix = "team-insights"): Promise<Result<string>> {
    try {
      // Create a unique directory name
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const dirName = `${prefix}-${timestamp}-${random}`;
      const dirPath = path.join(this.baseDir, dirName);

      // Create directory
      await fs.mkdir(dirPath, { recursive: true });

      // Track created directory for cleanup
      this.createdDirs.add(dirPath);

      logger.info(`Created temporary directory: ${dirPath}`);
      return ok(dirPath);
    } catch (error) {
      logger.error("Failed to create temporary directory", {
        error: getErrorMessage(error),
      });

      return err(
        new Error(
          `Failed to create temporary directory: ${getErrorMessage(error)}`,
        ),
      );
    }
  }

  /**
   * Remove a specific directory
   * @param dirPath Path to directory to remove
   * @returns Result with success status
   */
  async remove(dirPath: string): Promise<Result<void>> {
    try {
      // Check if directory exists
      const exists = await this.exists(dirPath);
      if (!exists) {
        logger.warn(`Directory does not exist: ${dirPath}`);
        return ok(undefined);
      }

      // Remove directory recursively
      await fs.rm(dirPath, { recursive: true, force: true });

      // Remove from tracking
      this.createdDirs.delete(dirPath);

      logger.info(`Removed temporary directory: ${dirPath}`);
      return ok(undefined);
    } catch (error) {
      logger.error("Failed to remove temporary directory", {
        dirPath,
        error: getErrorMessage(error),
      });

      return err(
        new Error(
          `Failed to remove temporary directory: ${getErrorMessage(error)}`,
        ),
      );
    }
  }

  /**
   * Remove all tracked temporary directories
   * Useful for cleanup on process exit or error handling
   * @returns Result with number of directories removed
   */
  async removeAll(): Promise<Result<number>> {
    try {
      const dirs = Array.from(this.createdDirs);
      let removed = 0;

      for (const dirPath of dirs) {
        const result = await this.remove(dirPath);
        if (result.ok) {
          removed++;
        }
      }

      logger.info(`Removed ${removed} temporary directories`);
      return ok(removed);
    } catch (error) {
      logger.error("Failed to remove all temporary directories", {
        error: getErrorMessage(error),
      });

      return err(
        new Error(
          `Failed to remove all temporary directories: ${getErrorMessage(
            error,
          )}`,
        ),
      );
    }
  }

  /**
   * Check if a directory exists
   * @param dirPath Path to check
   * @returns Boolean indicating existence
   */
  private async exists(dirPath: string): Promise<boolean> {
    try {
      await fs.access(dirPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get list of currently tracked directories
   * @returns Array of directory paths
   */
  getTrackedDirectories(): string[] {
    return Array.from(this.createdDirs);
  }

  /**
   * Get the base directory for temporary files
   * @returns Base directory path
   */
  getBaseDir(): string {
    return this.baseDir;
  }
}
