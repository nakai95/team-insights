import { Result, ok, err } from "@/lib/result";

export class ImplementationActivity {
  private constructor(
    public readonly commitCount: number,
    public readonly linesAdded: number,
    public readonly linesDeleted: number,
    public readonly linesModified: number,
    public readonly filesChanged: number,
  ) {}

  static create(params: {
    commitCount: number;
    linesAdded: number;
    linesDeleted: number;
    linesModified: number;
    filesChanged: number;
  }): Result<ImplementationActivity> {
    // Validate all values are non-negative integers
    const values = [
      params.commitCount,
      params.linesAdded,
      params.linesDeleted,
      params.linesModified,
      params.filesChanged,
    ];

    for (const value of values) {
      if (value < 0) {
        return err(new Error("All activity metrics must be non-negative"));
      }
      if (!Number.isInteger(value)) {
        return err(new Error("All activity metrics must be integers"));
      }
    }

    return ok(
      new ImplementationActivity(
        params.commitCount,
        params.linesAdded,
        params.linesDeleted,
        params.linesModified,
        params.filesChanged,
      ),
    );
  }

  static zero(): ImplementationActivity {
    const result = ImplementationActivity.create({
      commitCount: 0,
      linesAdded: 0,
      linesDeleted: 0,
      linesModified: 0,
      filesChanged: 0,
    });

    if (!result.ok) {
      throw new Error("Failed to create zero ImplementationActivity");
    }

    return result.value;
  }

  get totalLineChanges(): number {
    return this.linesAdded + this.linesDeleted;
  }

  get netLineChanges(): number {
    return this.linesAdded - this.linesDeleted;
  }

  get activityScore(): number {
    return this.commitCount * 5 + this.totalLineChanges * 0.5;
  }
}
