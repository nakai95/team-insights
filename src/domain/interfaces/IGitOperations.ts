import { Result } from "@/lib/result";

export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
}

export interface IGitOperations {
  /**
   * Clone a repository to a temporary directory
   * @param url Repository URL
   * @param targetPath Path to clone to
   * @param sinceDate Optional date to limit history
   * @returns Result with clone success status
   */
  clone(
    url: string,
    targetPath: string,
    sinceDate?: Date,
  ): Promise<Result<void>>;

  /**
   * Get commit log from repository
   * @param repoPath Path to repository
   * @param sinceDate Optional date to filter commits
   * @param untilDate Optional end date
   * @returns Result with array of commits
   */
  getLog(
    repoPath: string,
    sinceDate?: Date,
    untilDate?: Date,
  ): Promise<Result<GitCommit[]>>;
}
