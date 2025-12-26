import { Result, ok, err } from "@/lib/result";
import { PRThroughputData } from "@/domain/value-objects/PRThroughputData";
import { SizeBucket, SizeBucketType } from "@/domain/value-objects/SizeBucket";
import { ThroughputInsight } from "@/domain/value-objects/ThroughputInsight";
import { PullRequest } from "@/domain/interfaces/IGitHubRepository";

export interface DateRange {
  start: Date;
  end: Date;
}

export class PRThroughput {
  private constructor(
    public readonly repositoryUrl: string,
    public readonly analyzedAt: Date,
    public readonly dateRange: DateRange,
    public readonly prData: PRThroughputData[],
    public readonly sizeBuckets: SizeBucket[],
    public readonly insight: ThroughputInsight,
  ) {}

  /**
   * Factory method to create PRThroughput from pull requests
   *
   * @param repositoryUrl - Repository URL for context
   * @param pullRequests - Array of pull requests (including throughput fields)
   * @param dateRange - Date range of analysis
   * @returns Result with PRThroughput entity or error
   */
  static create(
    repositoryUrl: string,
    pullRequests: PullRequest[],
    dateRange: DateRange,
  ): Result<PRThroughput> {
    // Validate repositoryUrl is not empty
    if (!repositoryUrl || repositoryUrl.trim().length === 0) {
      return err(new Error("Repository URL cannot be empty"));
    }

    // Validate date range
    if (dateRange.end < dateRange.start) {
      return err(new Error("Date range end cannot be before start"));
    }

    // Filter merged PRs only
    const mergedPRs = pullRequests.filter(
      (pr) => pr.state === "merged" && pr.mergedAt,
    );

    // Convert to PRThroughputData
    const prDataResults: PRThroughputData[] = [];
    for (const pr of mergedPRs) {
      // Validate required fields exist for merged PRs
      if (!pr.mergedAt) {
        return err(
          new Error(`PR #${pr.number} is marked as merged but has no mergedAt`),
        );
      }
      if (pr.additions === undefined) {
        return err(new Error(`PR #${pr.number} is missing additions field`));
      }
      if (pr.deletions === undefined) {
        return err(new Error(`PR #${pr.number} is missing deletions field`));
      }
      if (pr.changedFiles === undefined) {
        return err(new Error(`PR #${pr.number} is missing changedFiles field`));
      }

      const prDataResult = PRThroughputData.create({
        prNumber: pr.number,
        title: pr.title,
        author: pr.author,
        createdAt: pr.createdAt,
        mergedAt: pr.mergedAt,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changedFiles,
      });

      if (!prDataResult.ok) {
        return err(
          new Error(
            `Failed to create PRThroughputData for PR #${pr.number}: ${prDataResult.error.message}`,
          ),
        );
      }

      prDataResults.push(prDataResult.value);
    }

    // Group by size bucket
    const groupedBySize = {
      [SizeBucketType.S]: prDataResults.filter(
        (pr) => pr.sizeBucket === SizeBucketType.S,
      ),
      [SizeBucketType.M]: prDataResults.filter(
        (pr) => pr.sizeBucket === SizeBucketType.M,
      ),
      [SizeBucketType.L]: prDataResults.filter(
        (pr) => pr.sizeBucket === SizeBucketType.L,
      ),
      [SizeBucketType.XL]: prDataResults.filter(
        (pr) => pr.sizeBucket === SizeBucketType.XL,
      ),
    };

    // Create size buckets (always 4: S, M, L, XL)
    const sizeBuckets = [
      SizeBucket.fromPRs(
        SizeBucketType.S,
        groupedBySize[SizeBucketType.S],
        prDataResults.length,
      ),
      SizeBucket.fromPRs(
        SizeBucketType.M,
        groupedBySize[SizeBucketType.M],
        prDataResults.length,
      ),
      SizeBucket.fromPRs(
        SizeBucketType.L,
        groupedBySize[SizeBucketType.L],
        prDataResults.length,
      ),
      SizeBucket.fromPRs(
        SizeBucketType.XL,
        groupedBySize[SizeBucketType.XL],
        prDataResults.length,
      ),
    ];

    // Generate insight
    const bucketMetrics = sizeBuckets.map((bucket) => ({
      bucket: bucket.bucket,
      averageLeadTimeHours: bucket.averageLeadTimeHours,
      prCount: bucket.prCount,
    }));

    const insightResult = ThroughputInsight.createFromMetrics(
      bucketMetrics,
      prDataResults.length,
    );

    if (!insightResult.ok) {
      return err(
        new Error(`Failed to create insight: ${insightResult.error.message}`),
      );
    }

    return ok(
      new PRThroughput(
        repositoryUrl.trim(),
        new Date(),
        dateRange,
        prDataResults,
        sizeBuckets,
        insightResult.value,
      ),
    );
  }

  /**
   * Total number of merged PRs analyzed
   */
  get totalMergedPRs(): number {
    return this.prData.length;
  }

  /**
   * Average lead time in hours across all PRs
   */
  get averageLeadTimeHours(): number {
    if (this.prData.length === 0) {
      return 0;
    }

    const totalLeadTime = this.prData.reduce(
      (sum, pr) => sum + pr.leadTimeHours,
      0,
    );
    return totalLeadTime / this.prData.length;
  }

  /**
   * Average lead time in days across all PRs
   */
  get averageLeadTimeDays(): number {
    return this.averageLeadTimeHours / 24;
  }

  /**
   * Median lead time in hours across all PRs
   */
  get medianLeadTimeHours(): number {
    if (this.prData.length === 0) {
      return 0;
    }

    const sortedLeadTimes = [...this.prData]
      .map((pr) => pr.leadTimeHours)
      .sort((a, b) => a - b);

    const middle = Math.floor(sortedLeadTimes.length / 2);

    if (sortedLeadTimes.length % 2 === 0) {
      // Even number of elements: average of two middle values
      const prev = sortedLeadTimes[middle - 1];
      const curr = sortedLeadTimes[middle];
      if (prev === undefined || curr === undefined) return 0;
      return (prev + curr) / 2;
    } else {
      // Odd number of elements: middle value
      const median = sortedLeadTimes[middle];
      return median ?? 0;
    }
  }

  /**
   * Median lead time in days across all PRs
   */
  get medianLeadTimeDays(): number {
    return this.medianLeadTimeHours / 24;
  }

  /**
   * Validate invariants
   */
  isValid(): boolean {
    // Invariant 1: sizeBuckets.length === 4 (always S, M, L, XL)
    if (this.sizeBuckets.length !== 4) return false;

    // Invariant 2: Sum of sizeBuckets[].prCount === prData.length
    const totalBucketCount = this.sizeBuckets.reduce(
      (sum, bucket) => sum + bucket.prCount,
      0,
    );
    if (totalBucketCount !== this.prData.length) return false;

    // Invariant 3: Sum of sizeBuckets[].percentage should be close to 100
    // (allow for rounding errors)
    const totalPercentage = this.sizeBuckets.reduce(
      (sum, bucket) => sum + bucket.percentage,
      0,
    );
    // For empty PRs, all percentages should be 0
    if (this.prData.length === 0) {
      if (totalPercentage !== 0) return false;
    } else {
      // Allow for rounding errors: within 0.1% of 100
      if (Math.abs(totalPercentage - 100) > 0.1) return false;
    }

    // Invariant 4: dateRange.end >= dateRange.start
    if (this.dateRange.end < this.dateRange.start) return false;

    return true;
  }
}
