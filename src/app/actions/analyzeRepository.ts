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
import { SimpleGitAdapter } from "@/infrastructure/git/SimpleGitAdapter";
import { OctokitAdapter } from "@/infrastructure/github/OctokitAdapter";
import { TempDirectoryManager } from "@/infrastructure/filesystem/TempDirectoryManager";
import { ContributorMapper } from "@/application/mappers/ContributorMapper";
import { Result } from "@/lib/result";
import { logger } from "@/lib/utils/logger";

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
    if (!request.repositoryUrl || !request.githubToken) {
      return {
        ok: false,
        error: {
          code: AnalysisErrorCode.INVALID_URL,
          message: "Repository URL and GitHub token are required",
        },
      };
    }

    // Parse date range if provided
    let dateRangeStart: Date | undefined;
    let dateRangeEnd: Date | undefined;

    if (request.dateRange) {
      try {
        dateRangeStart = new Date(request.dateRange.start);
        dateRangeEnd = new Date(request.dateRange.end);

        // Validate dates
        if (isNaN(dateRangeStart.getTime()) || isNaN(dateRangeEnd.getTime())) {
          return {
            ok: false,
            error: {
              code: AnalysisErrorCode.INVALID_URL,
              message: "Invalid date format in date range",
            },
          };
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

    // Initialize infrastructure dependencies
    const gitOperations = new SimpleGitAdapter();
    const githubAPI = new OctokitAdapter();
    const tempDirManager = new TempDirectoryManager();

    // Initialize use cases
    const fetchGitData = new FetchGitData(gitOperations, githubAPI);
    const calculateMetrics = new CalculateMetrics();
    const analyzeRepo = new AnalyzeRepository(
      fetchGitData,
      calculateMetrics,
      tempDirManager,
    );

    // Execute analysis
    const result = await analyzeRepo.execute({
      repositoryUrl: request.repositoryUrl,
      githubToken: request.githubToken,
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

    const { analysis, analysisTimeMs } = result.value;

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
      error: error instanceof Error ? error.message : String(error),
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

/**
 * Map domain error messages to API error codes
 */
function mapErrorCode(errorMessage: string): AnalysisErrorCode {
  const msg = errorMessage.toLowerCase();

  if (msg.includes("invalid") && msg.includes("url")) {
    return AnalysisErrorCode.INVALID_URL;
  }

  if (msg.includes("invalid") && msg.includes("token")) {
    return AnalysisErrorCode.INVALID_TOKEN;
  }

  if (msg.includes("not found") || msg.includes("404")) {
    return AnalysisErrorCode.REPO_NOT_FOUND;
  }

  if (msg.includes("permission") || msg.includes("403")) {
    return AnalysisErrorCode.INSUFFICIENT_PERMISSIONS;
  }

  if (msg.includes("rate limit")) {
    return AnalysisErrorCode.RATE_LIMIT_EXCEEDED;
  }

  if (msg.includes("clone")) {
    return AnalysisErrorCode.CLONE_FAILED;
  }

  if (msg.includes("timeout")) {
    return AnalysisErrorCode.ANALYSIS_TIMEOUT;
  }

  return AnalysisErrorCode.INTERNAL_ERROR;
}
