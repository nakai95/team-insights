import { Result, ok, err } from "@/lib/result";

export class ReviewActivity {
  private constructor(
    public readonly pullRequestCount: number,
    public readonly reviewCommentCount: number,
    public readonly pullRequestsReviewed: number,
  ) {}

  static create(params: {
    pullRequestCount: number;
    reviewCommentCount: number;
    pullRequestsReviewed: number;
  }): Result<ReviewActivity> {
    // Validate all values are non-negative integers
    const values = [
      params.pullRequestCount,
      params.reviewCommentCount,
      params.pullRequestsReviewed,
    ];

    for (const value of values) {
      if (value < 0) {
        return err(new Error("All review metrics must be non-negative"));
      }
      if (!Number.isInteger(value)) {
        return err(new Error("All review metrics must be integers"));
      }
    }

    return ok(
      new ReviewActivity(
        params.pullRequestCount,
        params.reviewCommentCount,
        params.pullRequestsReviewed,
      ),
    );
  }

  static zero(): ReviewActivity {
    const result = ReviewActivity.create({
      pullRequestCount: 0,
      reviewCommentCount: 0,
      pullRequestsReviewed: 0,
    });

    if (!result.ok) {
      throw new Error("Failed to create zero ReviewActivity");
    }

    return result.value;
  }

  get reviewScore(): number {
    return (
      this.pullRequestCount * 20 +
      this.reviewCommentCount * 5 +
      this.pullRequestsReviewed * 30
    );
  }

  get averageCommentsPerReview(): number {
    if (this.pullRequestsReviewed === 0) {
      return 0;
    }
    return this.reviewCommentCount / this.pullRequestsReviewed;
  }
}
