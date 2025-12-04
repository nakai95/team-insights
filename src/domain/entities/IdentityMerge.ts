import { Result, ok, err } from "@/lib/result";
import { RepositoryUrl } from "@/domain/value-objects/RepositoryUrl";

export class IdentityMerge {
  private constructor(
    public readonly id: string,
    public readonly repositoryUrl: RepositoryUrl,
    public readonly primaryContributorId: string,
    public readonly mergedContributorIds: string[],
    public readonly createdAt: Date,
    public readonly lastAppliedAt: Date,
  ) {}

  static create(params: {
    id: string;
    repositoryUrl: RepositoryUrl;
    primaryContributorId: string;
    mergedContributorIds: string[];
    createdAt: Date;
    lastAppliedAt: Date;
  }): Result<IdentityMerge> {
    // Validate ID
    if (!params.id || params.id.trim().length === 0) {
      return err(new Error("Identity merge ID cannot be empty"));
    }

    // Validate primary contributor ID
    if (
      !params.primaryContributorId ||
      params.primaryContributorId.trim().length === 0
    ) {
      return err(new Error("Primary contributor ID cannot be empty"));
    }

    // Business rule: Must have at least one merged contributor
    if (params.mergedContributorIds.length === 0) {
      return err(new Error("Must have at least one merged contributor ID"));
    }

    // Business rule: Merged contributors must be distinct from primary
    if (params.mergedContributorIds.includes(params.primaryContributorId)) {
      return err(
        new Error(
          "Merged contributors must be distinct from primary contributor",
        ),
      );
    }

    // Business rule: All merged contributor IDs must be unique
    const uniqueIds = new Set(params.mergedContributorIds);
    if (uniqueIds.size !== params.mergedContributorIds.length) {
      return err(new Error("All merged contributor IDs must be unique"));
    }

    // Validate all contributor IDs are non-empty
    for (const id of params.mergedContributorIds) {
      if (!id || id.trim().length === 0) {
        return err(new Error("Merged contributor IDs cannot be empty"));
      }
    }

    // Validate dates
    if (params.createdAt > params.lastAppliedAt) {
      return err(new Error("Last applied date cannot be before created date"));
    }

    return ok(
      new IdentityMerge(
        params.id,
        params.repositoryUrl,
        params.primaryContributorId,
        params.mergedContributorIds,
        params.createdAt,
        params.lastAppliedAt,
      ),
    );
  }

  /**
   * Check if a contributor ID is part of this merge (either primary or merged)
   */
  includes(contributorId: string): boolean {
    return (
      this.primaryContributorId === contributorId ||
      this.mergedContributorIds.includes(contributorId)
    );
  }

  /**
   * Get all contributor IDs involved in this merge
   */
  get allContributorIds(): string[] {
    return [this.primaryContributorId, ...this.mergedContributorIds];
  }

  /**
   * Update the last applied timestamp
   */
  updateLastApplied(timestamp: Date): Result<IdentityMerge> {
    if (timestamp < this.createdAt) {
      return err(
        new Error("Last applied timestamp cannot be before created date"),
      );
    }

    return IdentityMerge.create({
      id: this.id,
      repositoryUrl: this.repositoryUrl,
      primaryContributorId: this.primaryContributorId,
      mergedContributorIds: this.mergedContributorIds,
      createdAt: this.createdAt,
      lastAppliedAt: timestamp,
    });
  }
}
