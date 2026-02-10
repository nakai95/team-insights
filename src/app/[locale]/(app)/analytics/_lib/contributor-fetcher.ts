import { cache } from "react";
import type { DateRange } from "@/domain/value-objects/DateRange";
import type { ContributorDto } from "@/application/dto/ContributorDto";
import { AnalyzeRepository } from "@/application/use-cases/AnalyzeRepository";
import { FetchGitData } from "@/application/use-cases/FetchGitData";
import { CalculateMetrics } from "@/application/use-cases/CalculateMetrics";
import { CalculateThroughputMetrics } from "@/application/use-cases/CalculateThroughputMetrics";
import { CalculateChangesTimeseries } from "@/application/use-cases/CalculateChangesTimeseries";
import { CalculateDeploymentFrequency } from "@/application/use-cases/CalculateDeploymentFrequency";
import { OctokitAdapter } from "@/infrastructure/github/OctokitAdapter";
import { ContributorMapper } from "@/application/mappers/ContributorMapper";
import { createSessionProvider } from "@/infrastructure/auth/SessionProviderFactory";
import { Result, ok, err } from "@/lib/result";
import { getMergePreferences } from "@/lib/utils/mergeCookie";
import { ContributorService } from "@/domain/services/ContributorService";

/**
 * Cached Contributor Analysis Fetcher
 *
 * Purpose: Fetch detailed contributor data for Team tab
 *
 * Features:
 * - React cache() for per-request memoization
 * - Full contributor analysis (implementation + review activity)
 * - Reuses existing use cases from dashboard
 *
 * Usage:
 * ```tsx
 * const result = await getCachedContributors("owner/repo", dateRange);
 * if (result.ok) {
 *   const contributors = result.value;
 * }
 * ```
 */
export const getCachedContributors = cache(
  async (
    repositoryId: string,
    dateRange: DateRange,
  ): Promise<Result<ContributorDto[]>> => {
    try {
      // Parse owner/repo from repositoryId
      const [owner, repo] = repositoryId.split("/");
      if (!owner || !repo) {
        return err(new Error(`Invalid repository ID: ${repositoryId}`));
      }

      // Build repository URL
      const repositoryUrl = `https://github.com/${repositoryId}`;

      // Initialize dependencies
      const sessionProvider = createSessionProvider();
      const githubAdapter = new OctokitAdapter(sessionProvider);
      const fetchGitData = new FetchGitData(githubAdapter);
      const calculateMetrics = new CalculateMetrics();
      const calculateThroughputMetrics = new CalculateThroughputMetrics();
      const calculateChangesTimeseries = new CalculateChangesTimeseries();
      const calculateDeploymentFrequency = new CalculateDeploymentFrequency(
        githubAdapter,
      );
      const analyzeRepository = new AnalyzeRepository(
        fetchGitData,
        calculateMetrics,
        calculateThroughputMetrics,
        calculateChangesTimeseries,
        calculateDeploymentFrequency,
      );

      // Execute analysis
      const result = await analyzeRepository.execute({
        repositoryUrl,
        dateRangeStart: dateRange.start,
        dateRangeEnd: dateRange.end,
      });

      if (!result.ok) {
        return err(result.error);
      }

      // Map to DTOs
      let contributorDtos = result.value.analysis.contributors.map(
        (contributor) => ContributorMapper.toDto(contributor),
      );

      // Apply merge preferences from cookie
      const mergePreferences = await getMergePreferences(repositoryId);
      if (mergePreferences.length > 0) {
        contributorDtos = applyMergePreferences(
          contributorDtos,
          mergePreferences,
        );
      }

      return ok(contributorDtos);
    } catch (error) {
      const errorObj =
        error instanceof Error
          ? error
          : new Error("Failed to fetch contributors: Unknown error");
      return err(errorObj);
    }
  },
);

/**
 * Apply merge preferences to contributors list
 * Merges contributors according to saved preferences from cookie
 */
function applyMergePreferences(
  contributors: ContributorDto[],
  preferences: { primaryId: string; mergedIds: string[] }[],
): ContributorDto[] {
  let result = [...contributors];

  for (const preference of preferences) {
    // Find primary contributor
    const primaryDto = result.find((c) => c.id === preference.primaryId);
    if (!primaryDto) {
      continue; // Primary not found, skip this merge
    }

    // Find contributors to merge
    const mergedDtos = preference.mergedIds
      .map((id) => result.find((c) => c.id === id))
      .filter((c): c is ContributorDto => c !== undefined);

    if (mergedDtos.length === 0) {
      continue; // No contributors to merge, skip
    }

    // Convert to domain entities
    const primaryEntity = ContributorMapper.toDomain(primaryDto);
    const mergedEntities = mergedDtos
      .map((dto) => ContributorMapper.toDomain(dto))
      .filter((e): e is NonNullable<typeof e> => e !== null);

    if (!primaryEntity || mergedEntities.length === 0) {
      continue; // Conversion failed, skip
    }

    // Perform merge
    const mergeResult = ContributorService.mergeContributors(
      primaryEntity,
      mergedEntities,
    );

    if (!mergeResult.ok) {
      continue; // Merge failed, skip
    }

    // Convert merged entity back to DTO
    const mergedDto = ContributorMapper.toDto(mergeResult.value);

    // Remove merged contributors from result
    result = result.filter(
      (c) =>
        c.id !== preference.primaryId && !preference.mergedIds.includes(c.id),
    );

    // Add merged contributor
    result.push(mergedDto);
  }

  return result;
}
