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
      const calculateDeploymentFrequency = new CalculateDeploymentFrequency(githubAdapter);
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
      const contributorDtos = result.value.analysis.contributors.map(
        (contributor) => ContributorMapper.toDto(contributor),
      );

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
