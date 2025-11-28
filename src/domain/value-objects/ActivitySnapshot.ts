import { Result, ok, err } from "@/lib/result";
import { Period } from "@/domain/types";
import { ImplementationActivity } from "./ImplementationActivity";
import { ReviewActivity } from "./ReviewActivity";

export class ActivitySnapshot {
  private constructor(
    public readonly date: Date,
    public readonly period: Period,
    public readonly implementationActivity: ImplementationActivity,
    public readonly reviewActivity: ReviewActivity,
  ) {}

  static create(
    date: Date,
    period: Period,
    implementationActivity: ImplementationActivity,
    reviewActivity: ReviewActivity,
  ): Result<ActivitySnapshot> {
    // Validate period is a valid enum value
    const validPeriods = Object.values(Period);
    if (!validPeriods.includes(period)) {
      return err(new Error("Invalid period value"));
    }

    return ok(
      new ActivitySnapshot(
        date,
        period,
        implementationActivity,
        reviewActivity,
      ),
    );
  }
}
