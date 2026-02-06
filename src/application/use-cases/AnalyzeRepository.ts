import { Result, ok, err } from "@/lib/result";
import { RepositoryAnalysis } from "@/domain/entities/RepositoryAnalysis";
import { RepositoryUrl } from "@/domain/value-objects/RepositoryUrl";
import { DateRange } from "@/domain/value-objects/DateRange";
import { FetchGitData, FetchGitDataInput } from "./FetchGitData";
import { CalculateMetrics, CalculateMetricsInput } from "./CalculateMetrics";
import { CalculateThroughputMetrics } from "./CalculateThroughputMetrics";
import { CalculateChangesTimeseries } from "./CalculateChangesTimeseries";
import { CalculateDeploymentFrequency } from "./CalculateDeploymentFrequency";
import { ThroughputResult } from "@/application/dto/ThroughputResult";
import { TimeseriesResult } from "@/application/dto/TimeseriesResult";
import { DeploymentFrequencyResult } from "@/application/dto/DeploymentFrequencyResult";
import { logger } from "@/lib/utils/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { v4 as uuidv4 } from "uuid";

/**
 * Input for AnalyzeRepository use case
 * GitHub token is now sourced from session via ISessionProvider
 */
export interface AnalyzeRepositoryInput {
  repositoryUrl: string;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
}

/**
 * Output from AnalyzeRepository use case
 */
export interface AnalyzeRepositoryOutput {
  analysis: RepositoryAnalysis;
  analysisTimeMs: number;
  throughput?: ThroughputResult; // Optional PR throughput analysis
  timeseries?: TimeseriesResult; // Optional PR changes timeseries analysis
  deploymentFrequency?: DeploymentFrequencyResult; // Optional deployment frequency analysis
}

/**
 * Main orchestration use case for repository analysis
 * Coordinates fetching data, calculating metrics, and creating analysis
 */
export class AnalyzeRepository {
  constructor(
    private readonly fetchGitData: FetchGitData,
    private readonly calculateMetrics: CalculateMetrics,
    private readonly calculateThroughputMetrics: CalculateThroughputMetrics,
    private readonly calculateChangesTimeseries: CalculateChangesTimeseries,
    private readonly calculateDeploymentFrequency: CalculateDeploymentFrequency,
  ) {}

  async execute(
    input: AnalyzeRepositoryInput,
  ): Promise<Result<AnalyzeRepositoryOutput>> {
    const startTime = Date.now();

    try {
      logger.info("Starting AnalyzeRepository use case", {
        repositoryUrl: input.repositoryUrl,
      });

      // Step 1: Validate and parse repository URL
      const urlResult = RepositoryUrl.create(input.repositoryUrl);
      if (!urlResult.ok) {
        return err(urlResult.error);
      }

      // Step 2: Create or validate date range
      const dateRangeResult = this.createDateRange(
        input.dateRangeStart,
        input.dateRangeEnd,
      );
      if (!dateRangeResult.ok) {
        return err(dateRangeResult.error);
      }

      const dateRange = dateRangeResult.value;

      // Step 3: Create in-progress analysis
      const analysisId = uuidv4();
      const analysisResult = RepositoryAnalysis.createInProgress(
        analysisId,
        urlResult.value,
        dateRange,
      );

      if (!analysisResult.ok) {
        return err(analysisResult.error);
      }

      let analysis = analysisResult.value;

      // Step 4: Fetch Git and GitHub data
      const fetchInput: FetchGitDataInput = {
        repositoryUrl: input.repositoryUrl,
        dateRange,
      };

      const fetchResult = await this.fetchGitData.execute(fetchInput);
      if (!fetchResult.ok) {
        // Mark analysis as failed
        const failedResult = analysis.fail(fetchResult.error.message);
        if (!failedResult.ok) {
          return err(failedResult.error);
        }
        analysis = failedResult.value;
        return err(fetchResult.error);
      }

      const { commits, pullRequests, reviewComments } = fetchResult.value;

      // Step 6: Calculate contributor metrics
      const calculateInput: CalculateMetricsInput = {
        commits,
        pullRequests,
        reviewComments,
      };

      const calculateResult =
        await this.calculateMetrics.execute(calculateInput);
      if (!calculateResult.ok) {
        const failedResult = analysis.fail(calculateResult.error.message);
        if (!failedResult.ok) {
          return err(failedResult.error);
        }
        analysis = failedResult.value;
        return err(calculateResult.error);
      }

      const { contributors } = calculateResult.value;

      // Step 7: Calculate PR throughput metrics
      let throughput: ThroughputResult | undefined;
      const throughputResult = this.calculateThroughputMetrics.execute(
        input.repositoryUrl,
        pullRequests,
        dateRange,
      );

      if (throughputResult.ok) {
        throughput = throughputResult.value;
        logger.info("PR throughput metrics calculated successfully", {
          totalMergedPRs: throughput.totalMergedPRs,
        });
      } else {
        // Log the error but don't fail the entire analysis
        logger.warn("Failed to calculate PR throughput metrics", {
          error: throughputResult.error.message,
        });
      }

      // Step 7.5: Calculate PR changes timeseries
      let timeseries: TimeseriesResult | undefined;
      try {
        timeseries = this.calculateChangesTimeseries.execute(pullRequests);
        logger.info("PR changes timeseries calculated successfully", {
          weeklyDataPoints: timeseries.weeklyData.length,
          outlierWeeks: timeseries.outlierWeeks.length,
        });
      } catch (error) {
        // Log the error but don't fail the entire analysis
        logger.warn("Failed to calculate PR changes timeseries", {
          error: getErrorMessage(error),
        });
      }

      // Step 7.6: Calculate deployment frequency
      let deploymentFrequency: DeploymentFrequencyResult | undefined;
      const deploymentFrequencyResult =
        await this.calculateDeploymentFrequency.execute(
          urlResult.value.owner,
          urlResult.value.repo,
          dateRange.start,
        );

      if (deploymentFrequencyResult.ok) {
        deploymentFrequency = deploymentFrequencyResult.value;
        logger.info("Deployment frequency calculated successfully", {
          totalDeployments: deploymentFrequency.totalDeployments,
          doraLevel: deploymentFrequency.doraLevel.level,
        });
      } else {
        // Log the error but don't fail the entire analysis
        logger.warn("Failed to calculate deployment frequency", {
          error: deploymentFrequencyResult.error.message,
        });
      }

      // Step 8: Complete analysis
      const completeResult = analysis.complete(contributors);
      if (!completeResult.ok) {
        return err(completeResult.error);
      }

      analysis = completeResult.value;

      const endTime = Date.now();
      const analysisTimeMs = endTime - startTime;

      logger.info("AnalyzeRepository use case completed successfully", {
        analysisId,
        contributorCount: contributors.length,
        analysisTimeMs,
      });

      return ok({
        analysis,
        analysisTimeMs,
        throughput,
        timeseries,
        deploymentFrequency,
      });
    } catch (error) {
      logger.error("AnalyzeRepository use case failed", {
        error: getErrorMessage(error),
      });

      return err(
        new Error(`Failed to analyze repository: ${getErrorMessage(error)}`),
      );
    }
  }

  /**
   * Create date range from input or use defaults
   */
  private createDateRange(start?: Date, end?: Date): Result<DateRange> {
    // If no dates provided, default to last 6 months
    if (!start && !end) {
      return DateRange.fromMonths(6);
    }

    // If both provided, validate
    if (start && end) {
      return DateRange.create(start, end);
    }

    // If only one provided, use it with appropriate default
    if (start && !end) {
      return DateRange.create(start, new Date());
    }

    if (!start && end) {
      // Default to 6 months before end
      const sixMonthsAgo = new Date(end);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return DateRange.create(sixMonthsAgo, end);
    }

    // Should never reach here
    return err(new Error("Invalid date range configuration"));
  }
}
