import { Result, ok, err } from "@/lib/result";
import { Contributor } from "@/domain/entities/Contributor";
import { IdentityMerge } from "@/domain/entities/IdentityMerge";
import { RepositoryUrl } from "@/domain/value-objects/RepositoryUrl";
import { ContributorService } from "@/domain/services/ContributorService";
import { IStoragePort } from "@/domain/interfaces/IStoragePort";
import { logger } from "@/lib/utils/logger";

/**
 * Input for MergeIdentities use case
 */
export interface MergeIdentitiesInput {
  repositoryUrl: string;
  primaryContributorId: string;
  mergedContributorIds: string[];
  contributors: Contributor[];
}

/**
 * Output from MergeIdentities use case
 */
export interface MergeIdentitiesOutput {
  merge: IdentityMerge;
  mergedContributor: Contributor;
}

/**
 * Use case for merging multiple contributor identities into one
 * Combines metrics and persists merge preference for future analyses
 */
export class MergeIdentities {
  constructor(private readonly storage: IStoragePort) {}

  async execute(
    input: MergeIdentitiesInput,
  ): Promise<Result<MergeIdentitiesOutput>> {
    try {
      logger.info("Starting MergeIdentities use case", {
        repositoryUrl: input.repositoryUrl,
        primaryContributorId: input.primaryContributorId,
        mergedCount: input.mergedContributorIds.length,
      });

      // Validate repository URL
      const repoUrlResult = RepositoryUrl.create(input.repositoryUrl);
      if (!repoUrlResult.ok) {
        return err(
          new Error(`Invalid repository URL: ${repoUrlResult.error.message}`),
        );
      }

      // Find contributors to merge
      const findResult = this.findContributors(
        input.contributors,
        input.primaryContributorId,
        input.mergedContributorIds,
      );

      if (!findResult.ok) {
        return err(findResult.error);
      }

      const { primary, merged } = findResult.value;

      // Validate merge is possible
      if (!ContributorService.canMerge(primary, merged)) {
        return err(new Error("Cannot merge: invalid contributor combination"));
      }

      // Perform the merge
      const mergeResult = ContributorService.mergeContributors(primary, merged);
      if (!mergeResult.ok) {
        return err(
          new Error(
            `Failed to merge contributors: ${mergeResult.error.message}`,
          ),
        );
      }

      // Create IdentityMerge entity
      const now = new Date();
      const identityMergeResult = IdentityMerge.create({
        id: `merge-${input.repositoryUrl}-${input.primaryContributorId}-${Date.now()}`,
        repositoryUrl: repoUrlResult.value,
        primaryContributorId: input.primaryContributorId,
        mergedContributorIds: input.mergedContributorIds,
        createdAt: now,
        lastAppliedAt: now,
      });

      if (!identityMergeResult.ok) {
        return err(
          new Error(
            `Failed to create identity merge: ${identityMergeResult.error.message}`,
          ),
        );
      }

      // Persist merge preference to storage
      const storageKey = this.getStorageKey(input.repositoryUrl);
      const saveResult = await this.saveMergePreference(
        storageKey,
        identityMergeResult.value,
      );

      if (!saveResult.ok) {
        logger.warn("Failed to persist merge preference", {
          error: saveResult.error.message,
        });
        // Don't fail the entire operation if storage fails
        // The merge has been performed successfully in-memory
      }

      logger.info("Successfully merged identities", {
        mergeId: identityMergeResult.value.id,
        primaryContributorId: input.primaryContributorId,
      });

      return ok({
        merge: identityMergeResult.value,
        mergedContributor: mergeResult.value,
      });
    } catch (error) {
      logger.error("MergeIdentities use case failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      return err(
        new Error(
          `Failed to merge identities: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }
  }

  /**
   * Find contributors to merge from the contributor list
   */
  private findContributors(
    contributors: Contributor[],
    primaryId: string,
    mergedIds: string[],
  ): Result<{ primary: Contributor; merged: Contributor[] }> {
    // Find primary contributor
    const primary = contributors.find((c) => c.id === primaryId);
    if (!primary) {
      return err(new Error(`Primary contributor not found: ${primaryId}`));
    }

    // Find all merged contributors
    const merged: Contributor[] = [];
    for (const mergedId of mergedIds) {
      const contributor = contributors.find((c) => c.id === mergedId);
      if (!contributor) {
        return err(new Error(`Merged contributor not found: ${mergedId}`));
      }
      merged.push(contributor);
    }

    return ok({ primary, merged });
  }

  /**
   * Get storage key for repository merge preferences
   */
  private getStorageKey(repositoryUrl: string): string {
    // Create a stable key from repository URL
    const normalized = repositoryUrl.toLowerCase().replace(/[^a-z0-9]/g, "-");
    return `merges:${normalized}`;
  }

  /**
   * Save merge preference to storage
   */
  private async saveMergePreference(
    storageKey: string,
    merge: IdentityMerge,
  ): Promise<Result<void>> {
    // Load existing merges
    const loadResult = await this.storage.load<IdentityMerge[]>(storageKey);

    let merges: IdentityMerge[] = [];
    if (loadResult.ok && loadResult.value !== null) {
      merges = loadResult.value;
    } else if (!loadResult.ok) {
      return err(loadResult.error);
    }

    // Add new merge
    merges.push(merge);

    // Save back to storage
    return await this.storage.save(storageKey, merges);
  }

  /**
   * Load merge preferences from storage for a repository
   */
  async loadMergePreferences(
    repositoryUrl: string,
  ): Promise<Result<IdentityMerge[]>> {
    const storageKey = this.getStorageKey(repositoryUrl);
    const loadResult = await this.storage.load<IdentityMerge[]>(storageKey);

    if (!loadResult.ok) {
      return err(loadResult.error);
    }

    return ok(loadResult.value || []);
  }
}
