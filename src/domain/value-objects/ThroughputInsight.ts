import { Result, ok, err } from "@/lib/result";
import { SizeBucket, SizeBucketType } from "./SizeBucket";

export const InsightType = {
  OPTIMAL: "optimal",
  NO_DIFFERENCE: "no_difference",
  INSUFFICIENT_DATA: "insufficient_data",
} as const;
export type InsightType = (typeof InsightType)[keyof typeof InsightType];

interface BucketMetrics {
  bucket: SizeBucketType;
  averageLeadTimeHours: number;
  prCount: number;
}

export class ThroughputInsight {
  private constructor(
    public readonly type: InsightType,
    public readonly message: string,
    public readonly optimalBucket: SizeBucketType | null,
  ) {}

  /**
   * Creates a ThroughputInsight from bucket metrics and total PR count
   *
   * Generation logic:
   * - If totalPRCount < 10: insufficient_data
   * - If all buckets within 20% of each other: no_difference
   * - Otherwise: optimal (identify bucket with lowest average lead time)
   *
   * @param bucketMetrics - Array of bucket metrics with lead times
   * @param totalPRCount - Total number of PRs across all buckets
   * @returns Result with ThroughputInsight or error
   */
  static createFromMetrics(
    bucketMetrics: BucketMetrics[],
    totalPRCount: number,
  ): Result<ThroughputInsight> {
    // Validate inputs
    if (totalPRCount < 0) {
      return err(new Error("Total PR count cannot be negative"));
    }

    if (bucketMetrics.length === 0) {
      return err(new Error("Bucket metrics cannot be empty"));
    }

    // Validate bucket metrics
    for (const metric of bucketMetrics) {
      if (metric.prCount < 0) {
        return err(
          new Error(`PR count cannot be negative for bucket ${metric.bucket}`),
        );
      }
      if (metric.averageLeadTimeHours < 0) {
        return err(
          new Error(
            `Average lead time cannot be negative for bucket ${metric.bucket}`,
          ),
        );
      }
    }

    // Case 1: Insufficient data
    if (totalPRCount < 10) {
      return ok(
        new ThroughputInsight(
          InsightType.INSUFFICIENT_DATA,
          "Not enough data to determine optimal PR size. Analyze at least 10 merged PRs for meaningful insights.",
          null,
        ),
      );
    }

    // Filter buckets that have PRs
    const bucketsWithPRs = bucketMetrics.filter((m) => m.prCount > 0);

    if (bucketsWithPRs.length === 0) {
      return err(new Error("No buckets with PRs found"));
    }

    // Case 2: Check if all buckets are within 20% of each other
    const leadTimes = bucketsWithPRs.map((m) => m.averageLeadTimeHours);
    const minLeadTime = Math.min(...leadTimes);
    const maxLeadTime = Math.max(...leadTimes);

    // Calculate the threshold for 20% variance
    // If max is within 20% of min, they're close enough
    const isWithin20Percent =
      minLeadTime === 0 ? maxLeadTime === 0 : maxLeadTime <= minLeadTime * 1.2;

    if (isWithin20Percent) {
      return ok(
        new ThroughputInsight(
          InsightType.NO_DIFFERENCE,
          "PR size has minimal impact on lead time. All size categories show similar merge speeds.",
          null,
        ),
      );
    }

    // Case 3: Find optimal bucket (lowest average lead time)
    const optimalMetric = bucketsWithPRs.reduce((best, current) =>
      current.averageLeadTimeHours < best.averageLeadTimeHours ? current : best,
    );

    const bucketName = SizeBucket.getBucketName(optimalMetric.bucket);
    const message = `${bucketName} PRs merge fastest on average. Consider breaking larger changes into smaller pull requests.`;

    return ok(
      new ThroughputInsight(InsightType.OPTIMAL, message, optimalMetric.bucket),
    );
  }

  /**
   * Creates a ThroughputInsight directly with validated values
   * Use this for testing or when values are already validated
   */
  static create(
    type: InsightType,
    message: string,
    optimalBucket: SizeBucketType | null,
  ): Result<ThroughputInsight> {
    // Validate message is not empty
    if (!message || message.trim().length === 0) {
      return err(new Error("Message cannot be empty"));
    }

    // Validate optimalBucket consistency
    if (type === InsightType.OPTIMAL && optimalBucket === null) {
      return err(
        new Error("Optimal insight type requires a non-null optimal bucket"),
      );
    }

    if (
      (type === InsightType.NO_DIFFERENCE ||
        type === InsightType.INSUFFICIENT_DATA) &&
      optimalBucket !== null
    ) {
      return err(
        new Error(
          `${type} insight type must have null optimal bucket, got ${optimalBucket}`,
        ),
      );
    }

    return ok(new ThroughputInsight(type, message.trim(), optimalBucket));
  }

  /**
   * Checks if this insight is equal to another
   */
  equals(other: ThroughputInsight): boolean {
    return (
      this.type === other.type &&
      this.message === other.message &&
      this.optimalBucket === other.optimalBucket
    );
  }

  /**
   * Converts to plain object for serialization
   */
  toJSON(): {
    type: InsightType;
    message: string;
    optimalBucket: SizeBucketType | null;
  } {
    return {
      type: this.type,
      message: this.message,
      optimalBucket: this.optimalBucket,
    };
  }
}
