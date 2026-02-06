"use server";

import { AnalysisRequest } from "@/application/dto/AnalysisRequest";
import {
  AnalysisResult,
  AnalysisError,
  AnalysisErrorCode,
} from "@/application/dto/AnalysisResult";
import { AnalyzeRepository } from "@/application/use-cases/AnalyzeRepository";
import { FetchGitData } from "@/application/use-cases/FetchGitData";
import { CalculateMetrics } from "@/application/use-cases/CalculateMetrics";
import { CalculateThroughputMetrics } from "@/application/use-cases/CalculateThroughputMetrics";
import { CalculateChangesTimeseries } from "@/application/use-cases/CalculateChangesTimeseries";
import { CalculateDeploymentFrequency } from "@/application/use-cases/CalculateDeploymentFrequency";
import { OctokitAdapter } from "@/infrastructure/github/OctokitAdapter";
import { ContributorMapper } from "@/application/mappers/ContributorMapper";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { Result } from "@/lib/result";
import { logger } from "@/lib/utils/logger";
import { mapErrorCode } from "./errorMapping";
import { createSessionProvider } from "@/infrastructure/auth/SessionProviderFactory";

/**
 * Server Action for analyzing a GitHub repository
 * Returns contributor activity metrics for the specified date range
 */
export async function analyzeRepository(
  request: AnalysisRequest,
): Promise<Result<AnalysisResult, AnalysisError>> {
  const startTime = Date.now();

  try {
    logger.info("Server Action: analyzeRepository started", {
      repositoryUrl: request.repositoryUrl,
      hasDateRange: !!request.dateRange,
    });

    // Validate input (Zod schema validation can be added here)
    if (!request.repositoryUrl) {
      return {
        ok: false,
        error: {
          code: AnalysisErrorCode.INVALID_URL,
          message: "Repository URL is required",
        },
      };
    }

    // Parse date range if provided
    let dateRangeStart: Date | undefined;
    let dateRangeEnd: Date | undefined;

    if (request.dateRange) {
      try {
        // Only parse non-empty strings
        if (request.dateRange.start) {
          dateRangeStart = new Date(request.dateRange.start);
          if (isNaN(dateRangeStart.getTime())) {
            return {
              ok: false,
              error: {
                code: AnalysisErrorCode.INVALID_URL,
                message: "Invalid start date format",
              },
            };
          }
        }

        if (request.dateRange.end) {
          dateRangeEnd = new Date(request.dateRange.end);
          if (isNaN(dateRangeEnd.getTime())) {
            return {
              ok: false,
              error: {
                code: AnalysisErrorCode.INVALID_URL,
                message: "Invalid end date format",
              },
            };
          }
        }
      } catch (error) {
        return {
          ok: false,
          error: {
            code: AnalysisErrorCode.INVALID_URL,
            message: "Failed to parse date range",
          },
        };
      }
    }

    // Initialize session provider (auto-selects based on environment)
    const sessionProvider = createSessionProvider();

    // Initialize infrastructure dependencies
    // OctokitAdapter implements IGitHubRepository (unified GitHub operations)
    const githubAdapter = new OctokitAdapter(sessionProvider);

    // Initialize use cases
    const fetchGitData = new FetchGitData(githubAdapter);
    const calculateMetrics = new CalculateMetrics();
    const calculateThroughputMetrics = new CalculateThroughputMetrics();
    const calculateChangesTimeseries = new CalculateChangesTimeseries();
    const calculateDeploymentFrequency = new CalculateDeploymentFrequency(
      githubAdapter,
    );
    const analyzeRepo = new AnalyzeRepository(
      fetchGitData,
      calculateMetrics,
      calculateThroughputMetrics,
      calculateChangesTimeseries,
      calculateDeploymentFrequency,
    );

    // Execute analysis
    const result = await analyzeRepo.execute({
      repositoryUrl: request.repositoryUrl,
      dateRangeStart,
      dateRangeEnd,
    });

    if (!result.ok) {
      logger.error("Analysis failed", { error: result.error.message });

      // Map domain errors to API error codes
      const errorCode = mapErrorCode(result.error.message);

      return {
        ok: false,
        error: {
          code: errorCode,
          message: result.error.message,
        },
      };
    }

    const {
      analysis,
      analysisTimeMs,
      throughput,
      timeseries,
      deploymentFrequency,
    } = result.value;

    // Map domain entities to DTOs
    const contributorDtos = analysis.contributors.map((c) =>
      ContributorMapper.toDto(c),
    );

    // Calculate summary metrics
    const totalCommits = contributorDtos.reduce(
      (sum, c) => sum + c.implementationActivity.commitCount,
      0,
    );
    const totalPullRequests = contributorDtos.reduce(
      (sum, c) => sum + c.reviewActivity.pullRequestCount,
      0,
    );
    const totalReviewComments = contributorDtos.reduce(
      (sum, c) => sum + c.reviewActivity.reviewCommentCount,
      0,
    );

    const analysisResult: AnalysisResult = {
      analysis: {
        id: analysis.id,
        repositoryUrl: analysis.repositoryUrl.value,
        analyzedAt: analysis.analyzedAt.toISOString(),
        dateRange: {
          start: analysis.dateRange.start.toISOString(),
          end: analysis.dateRange.end.toISOString(),
        },
        status: "completed",
      },
      contributors: contributorDtos,
      summary: {
        totalContributors: contributorDtos.length,
        totalCommits,
        totalPullRequests,
        totalReviewComments,
        analysisTimeMs: analysisTimeMs,
      },
      throughput,
      timeseries,
      deploymentFrequency,
    };

    const endTime = Date.now();
    logger.info("Server Action: analyzeRepository completed", {
      totalTimeMs: endTime - startTime,
      contributorCount: contributorDtos.length,
    });

    return {
      ok: true,
      value: analysisResult,
    };
  } catch (error) {
    logger.error("Server Action: analyzeRepository error", {
      error: getErrorMessage(error),
    });

    return {
      ok: false,
      error: {
        code: AnalysisErrorCode.INTERNAL_ERROR,
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        details: error,
      },
    };
  }
}
