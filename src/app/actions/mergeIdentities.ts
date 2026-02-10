"use server";

import { MergeRequest } from "@/application/dto/MergeRequest";
import {
  MergeResult,
  MergeError,
  MergeErrorCode,
} from "@/application/dto/MergeResult";
import { ContributorDto } from "@/application/dto/ContributorDto";
import { MergeIdentities } from "@/application/use-cases/MergeIdentities";
import { IStoragePort } from "@/domain/interfaces/IStoragePort";
import { ContributorMapper } from "@/application/mappers/ContributorMapper";
import { Contributor } from "@/domain/entities/Contributor";
import { Result, ok } from "@/lib/result";
import { logger } from "@/lib/utils/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { saveMergePreference } from "@/lib/utils/mergeCookie";

/**
 * Server Action for merging contributor identities
 * Combines multiple contributor identities into one and persists the preference
 */
export async function mergeIdentities(
  request: MergeRequest & { contributors: ContributorDto[] },
): Promise<Result<MergeResult, MergeError>> {
  const startTime = Date.now();

  try {
    logger.info("Server Action: mergeIdentities started", {
      repositoryUrl: request.repositoryUrl,
      primaryContributorId: request.primaryContributorId,
      mergedCount: request.mergedContributorIds.length,
    });

    // Validate input
    if (!request.repositoryUrl) {
      return {
        ok: false,
        error: {
          code: MergeErrorCode.INVALID_URL,
          message: "Repository URL is required",
        },
      };
    }

    if (!request.primaryContributorId) {
      return {
        ok: false,
        error: {
          code: MergeErrorCode.INVALID_MERGE,
          message: "Primary contributor ID is required",
        },
      };
    }

    if (
      !request.mergedContributorIds ||
      request.mergedContributorIds.length === 0
    ) {
      return {
        ok: false,
        error: {
          code: MergeErrorCode.INVALID_MERGE,
          message: "At least one contributor ID to merge is required",
        },
      };
    }

    if (!request.contributors || request.contributors.length === 0) {
      return {
        ok: false,
        error: {
          code: MergeErrorCode.CONTRIBUTOR_NOT_FOUND,
          message: "No contributors provided",
        },
      };
    }

    // Convert DTOs to domain entities
    const contributorEntities: Contributor[] = [];
    for (const dto of request.contributors) {
      const entity = ContributorMapper.toDomain(dto);
      if (entity) {
        contributorEntities.push(entity);
      } else {
        logger.error("Failed to convert contributor DTO to domain entity", {
          contributorId: dto.id,
        });
      }
    }

    if (contributorEntities.length === 0) {
      return {
        ok: false,
        error: {
          code: MergeErrorCode.INVALID_MERGE,
          message: "Failed to convert contributors to domain entities",
        },
      };
    }

    // Initialize infrastructure dependencies
    // Note: LocalStorageAdapter won't work server-side
    // Create a no-op storage adapter for server-side execution
    const noOpStorage: IStoragePort = {
      save: async () => ok(undefined),
      load: async () => ok(null),
      remove: async () => ok(undefined),
      exists: async () => ok(false),
    };

    // Initialize use case with no-op storage
    const mergeIdentitiesUseCase = new MergeIdentities(noOpStorage);

    // Execute merge
    const result = await mergeIdentitiesUseCase.execute({
      repositoryUrl: request.repositoryUrl,
      primaryContributorId: request.primaryContributorId,
      mergedContributorIds: request.mergedContributorIds,
      contributors: contributorEntities,
    });

    if (!result.ok) {
      logger.error("Merge failed", { error: result.error.message });

      // Map domain errors to API error codes
      let errorCode: MergeErrorCode = MergeErrorCode.INVALID_MERGE;

      if (result.error.message.includes("not found")) {
        errorCode = MergeErrorCode.CONTRIBUTOR_NOT_FOUND;
      } else if (result.error.message.includes("URL")) {
        errorCode = MergeErrorCode.INVALID_URL;
      } else if (result.error.message.includes("storage")) {
        errorCode = MergeErrorCode.STORAGE_ERROR;
      }

      return {
        ok: false,
        error: {
          code: errorCode,
          message: result.error.message,
        },
      };
    }

    // Map domain entities to DTOs
    const mergedContributorDto = ContributorMapper.toDto(
      result.value.mergedContributor,
    );

    const mergeResult: MergeResult = {
      merge: {
        id: result.value.merge.id,
        primaryContributorId: result.value.merge.primaryContributorId,
        mergedContributorIds: result.value.merge.mergedContributorIds,
        createdAt: result.value.merge.createdAt.toISOString(),
      },
      mergedContributor: mergedContributorDto,
    };

    // Save merge preference to cookie for persistence across page reloads
    // Extract repository ID from URL (owner/repo format)
    const repositoryId = request.repositoryUrl
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/\.git$/, "");

    try {
      await saveMergePreference(repositoryId, {
        primaryId: request.primaryContributorId,
        mergedIds: request.mergedContributorIds,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.warn("Failed to save merge preference to cookie", {
        error: getErrorMessage(error),
      });
      // Don't fail the operation if cookie save fails
    }

    const duration = Date.now() - startTime;
    logger.info("Server Action: mergeIdentities completed", {
      duration,
      mergeId: result.value.merge.id,
    });

    return {
      ok: true,
      value: mergeResult,
    };
  } catch (error) {
    logger.error("Server Action: mergeIdentities failed", {
      error: getErrorMessage(error),
    });

    return {
      ok: false,
      error: {
        code: MergeErrorCode.INVALID_MERGE,
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during merge",
        details: error,
      },
    };
  }
}
