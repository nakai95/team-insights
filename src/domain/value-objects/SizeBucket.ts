export const SizeBucketType = {
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
} as const;
export type SizeBucketType =
  (typeof SizeBucketType)[keyof typeof SizeBucketType];

export interface PRThroughputData {
  leadTimeHours: number;
}

export class SizeBucket {
  private constructor(
    public readonly bucket: SizeBucketType,
    public readonly lineRange: string,
    public readonly averageLeadTimeHours: number,
    public readonly prCount: number,
    public readonly percentage: number,
  ) {}

  /**
   * Computed property: Average lead time in days
   */
  get averageLeadTimeDays(): number {
    return this.averageLeadTimeHours / 24;
  }

  /**
   * Factory method to create a SizeBucket from a list of PRs
   */
  static fromPRs(
    bucket: SizeBucketType,
    prs: PRThroughputData[],
    totalPRCount: number,
  ): SizeBucket {
    const lineRange = this.getLineRange(bucket);
    const prCount = prs.length;

    // Handle empty buckets
    if (prCount === 0) {
      return new SizeBucket(bucket, lineRange, 0, 0, 0);
    }

    // Calculate average lead time
    const totalLeadTime = prs.reduce((sum, pr) => sum + pr.leadTimeHours, 0);
    const averageLeadTimeHours = totalLeadTime / prCount;

    // Calculate percentage
    const percentage = (prCount / totalPRCount) * 100;

    return new SizeBucket(
      bucket,
      lineRange,
      averageLeadTimeHours,
      prCount,
      percentage,
    );
  }

  /**
   * Get the line range string for a bucket type
   */
  private static getLineRange(bucket: SizeBucketType): string {
    switch (bucket) {
      case SizeBucketType.S:
        return "1-50";
      case SizeBucketType.M:
        return "51-200";
      case SizeBucketType.L:
        return "201-500";
      case SizeBucketType.XL:
        return "501+";
    }
  }

  /**
   * Validate invariants
   */
  isValid(): boolean {
    // prCount must be >= 0
    if (this.prCount < 0) return false;

    // averageLeadTimeHours must be >= 0
    if (this.averageLeadTimeHours < 0) return false;

    // percentage must be between 0 and 100
    if (this.percentage < 0 || this.percentage > 100) return false;

    // If prCount is 0, then averageLeadTimeHours and percentage must be 0
    if (this.prCount === 0) {
      if (this.averageLeadTimeHours !== 0 || this.percentage !== 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get human-readable bucket name (static utility)
   */
  static getBucketName(bucket: SizeBucketType): string {
    switch (bucket) {
      case SizeBucketType.S:
        return "Small";
      case SizeBucketType.M:
        return "Medium";
      case SizeBucketType.L:
        return "Large";
      case SizeBucketType.XL:
        return "Extra Large";
    }
  }

  /**
   * Get human-readable bucket name for this instance
   */
  getBucketName(): string {
    return SizeBucket.getBucketName(this.bucket);
  }
}
