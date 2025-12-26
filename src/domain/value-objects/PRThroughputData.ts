import { Result, ok, err } from "@/lib/result";
import { SizeBucketType } from "./SizeBucket";

export interface PRThroughputDataProps {
  prNumber: number;
  title: string;
  author: string;
  createdAt: Date;
  mergedAt: Date;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export class PRThroughputData {
  private constructor(
    public readonly prNumber: number,
    public readonly title: string,
    public readonly author: string,
    public readonly createdAt: Date,
    public readonly mergedAt: Date,
    public readonly additions: number,
    public readonly deletions: number,
    public readonly changedFiles: number,
  ) {}

  static create(props: PRThroughputDataProps): Result<PRThroughputData> {
    // Validate prNumber is positive
    if (props.prNumber <= 0) {
      return err(new Error("PR number must be positive"));
    }

    // Validate title is not empty
    const trimmedTitle = props.title.trim();
    if (trimmedTitle.length === 0) {
      return err(new Error("PR title cannot be empty"));
    }

    // Validate author is not empty
    const trimmedAuthor = props.author.trim();
    if (trimmedAuthor.length === 0) {
      return err(new Error("PR author cannot be empty"));
    }

    // Validate mergedAt >= createdAt
    if (props.mergedAt < props.createdAt) {
      return err(new Error("Merged date cannot be before created date"));
    }

    // Validate non-negative numbers
    if (props.additions < 0) {
      return err(new Error("Additions cannot be negative"));
    }

    if (props.deletions < 0) {
      return err(new Error("Deletions cannot be negative"));
    }

    if (props.changedFiles < 0) {
      return err(new Error("Changed files cannot be negative"));
    }

    return ok(
      new PRThroughputData(
        props.prNumber,
        trimmedTitle,
        trimmedAuthor,
        props.createdAt,
        props.mergedAt,
        props.additions,
        props.deletions,
        props.changedFiles,
      ),
    );
  }

  /**
   * Total size of the PR (additions + deletions)
   */
  get size(): number {
    return this.additions + this.deletions;
  }

  /**
   * Lead time in hours (time from creation to merge)
   */
  get leadTimeHours(): number {
    const diffInMs = this.mergedAt.getTime() - this.createdAt.getTime();
    return diffInMs / (1000 * 60 * 60);
  }

  /**
   * Lead time in days (time from creation to merge)
   */
  get leadTimeDays(): number {
    return this.leadTimeHours / 24;
  }

  /**
   * Size bucket based on total changes
   * S: 1-50, M: 51-200, L: 201-500, XL: 501+
   */
  get sizeBucket(): SizeBucketType {
    const totalSize = this.size;

    if (totalSize <= 50) {
      return SizeBucketType.S;
    } else if (totalSize <= 200) {
      return SizeBucketType.M;
    } else if (totalSize <= 500) {
      return SizeBucketType.L;
    } else {
      return SizeBucketType.XL;
    }
  }

  equals(other: PRThroughputData): boolean {
    return (
      this.prNumber === other.prNumber &&
      this.title === other.title &&
      this.author === other.author &&
      this.createdAt.getTime() === other.createdAt.getTime() &&
      this.mergedAt.getTime() === other.mergedAt.getTime() &&
      this.additions === other.additions &&
      this.deletions === other.deletions &&
      this.changedFiles === other.changedFiles
    );
  }
}
