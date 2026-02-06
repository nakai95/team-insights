/**
 * Calculate Deployment Frequency Use Case
 *
 * Orchestrates the retrieval and analysis of deployment frequency data:
 * 1. Fetches releases, deployments, and tags from GitHub in parallel
 * 2. Converts them to DeploymentEvent value objects
 * 3. Deduplicates events by normalized tag name
 * 4. Aggregates into weekly and monthly frequencies
 * 5. Calculates DORA performance level
 * 6. Returns result DTO for presentation layer
 */

import { IGitHubRepository } from "@/domain/interfaces/IGitHubRepository";
import { DeploymentEvent } from "@/domain/value-objects/DeploymentEvent";
import { DeploymentFrequency } from "@/domain/value-objects/DeploymentFrequency";
import { DORAPerformanceLevel } from "@/domain/value-objects/DORAPerformanceLevel";
import {
  DeploymentFrequencyResult,
  DeploymentEventSummary,
} from "../dto/DeploymentFrequencyResult";
import { Result, ok, err } from "@/lib/result";
import { logger } from "@/lib/utils/logger";

export class CalculateDeploymentFrequency {
  constructor(private githubRepository: IGitHubRepository) {}

  /**
   * Execute the use case
   * @param owner Repository owner
   * @param repo Repository name
   * @param sinceDate Optional start date for analysis
   * @returns Result containing deployment frequency analysis
   */
  async execute(
    owner: string,
    repo: string,
    sinceDate?: Date,
  ): Promise<Result<DeploymentFrequencyResult>> {
    try {
      logger.info("Calculating deployment frequency", {
        owner,
        repo,
        sinceDate: sinceDate?.toISOString(),
      });

      // 1. Fetch all deployment sources in parallel
      const [releasesResult, deploymentsResult, tagsResult] = await Promise.all(
        [
          this.githubRepository.getReleases(owner, repo, sinceDate),
          this.githubRepository.getDeployments(owner, repo, sinceDate),
          this.githubRepository.getTags(owner, repo, sinceDate),
        ],
      );

      // 2. Handle errors (continue with partial data if some sources fail)
      const releases = releasesResult.ok ? releasesResult.value : [];
      const deployments = deploymentsResult.ok ? deploymentsResult.value : [];
      const tags = tagsResult.ok ? tagsResult.value : [];

      // Log warnings for failed sources
      if (!releasesResult.ok) {
        logger.warn("Failed to fetch releases", {
          error: releasesResult.error.message,
        });
      }
      if (!deploymentsResult.ok) {
        logger.warn("Failed to fetch deployments", {
          error: deploymentsResult.error.message,
        });
      }
      if (!tagsResult.ok) {
        logger.warn("Failed to fetch tags", {
          error: tagsResult.error.message,
        });
      }

      logger.debug("Fetched deployment sources", {
        releasesCount: releases.length,
        deploymentsCount: deployments.length,
        tagsCount: tags.length,
      });

      // 3. Convert to DeploymentEvent value objects
      const releaseEvents = releases
        .filter((r) => !r.isDraft) // Filter out draft releases
        .map(DeploymentEvent.fromRelease);

      const deploymentEvents = deployments.map(DeploymentEvent.fromDeployment);

      const tagEvents = tags.map(DeploymentEvent.fromTag);

      // 4. Deduplicate by normalized tag name (priority: Releases > Deployments > Tags)
      const uniqueEvents = this.deduplicateEvents(
        releaseEvents,
        deploymentEvents,
        tagEvents,
      );

      logger.info("Deduplicated deployment events", {
        totalBeforeDedup:
          releaseEvents.length + deploymentEvents.length + tagEvents.length,
        totalAfterDedup: uniqueEvents.length,
      });

      // 5. Aggregate into DeploymentFrequency
      const frequency = DeploymentFrequency.create(uniqueEvents);

      // 6. Calculate DORA performance level
      const doraLevel = DORAPerformanceLevel.fromDeploymentFrequency(frequency);

      // 7. Analyze deployment trends (if we have enough data)
      const trendAnalysis =
        frequency.weeklyData.length >= 4
          ? frequency.analyzeTrend(4)
          : undefined;

      // 8. Build result DTO
      const result: DeploymentFrequencyResult = {
        doraLevel: doraLevel.toDTO(),
        totalDeployments: frequency.totalCount,
        deploymentsPerYear: frequency.deploymentsPerYear,
        averagePerWeek: frequency.averagePerWeek,
        averagePerMonth: frequency.averagePerMonth,
        periodDays: frequency.periodDays,
        weeklyData: [...frequency.weeklyData],
        monthlyData: [...frequency.monthlyData],
        recentDeployments: frequency
          .getRecentDeployments(10)
          .map(this.eventToSummary),
        trendAnalysis,
      };

      logger.info("Deployment frequency calculation complete", {
        totalDeployments: result.totalDeployments,
        doraLevel: result.doraLevel.level,
        deploymentsPerYear: Math.round(result.deploymentsPerYear),
      });

      return ok(result);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to calculate deployment frequency", {
        error: errorMessage,
      });
      return err(
        new Error(`Failed to calculate deployment frequency: ${errorMessage}`),
      );
    }
  }

  /**
   * Deduplicate deployment events by normalized tag name
   * Priority: Releases > Deployments > Tags
   */
  private deduplicateEvents(
    releases: DeploymentEvent[],
    deployments: DeploymentEvent[],
    tags: DeploymentEvent[],
  ): DeploymentEvent[] {
    const eventMap = new Map<string, DeploymentEvent>();

    // Process releases first (highest priority)
    for (const event of releases) {
      if (event.tagName) {
        eventMap.set(event.tagName, event);
      }
    }

    // Add deployments (only if no matching release)
    for (const event of deployments) {
      if (event.tagName && !eventMap.has(event.tagName)) {
        eventMap.set(event.tagName, event);
      }
    }

    // Add tags (only if no release/deployment)
    for (const event of tags) {
      if (event.tagName && !eventMap.has(event.tagName)) {
        eventMap.set(event.tagName, event);
      }
    }

    // Return all unique events sorted by timestamp (newest first)
    return Array.from(eventMap.values()).sort(
      DeploymentEvent.compareByTimestamp,
    );
  }

  /**
   * Convert DeploymentEvent to summary DTO
   */
  private eventToSummary(event: DeploymentEvent): DeploymentEventSummary {
    return {
      displayName: event.displayName,
      timestamp: event.timestamp.toISOString(),
      source: event.source,
      environment: event.environment,
    };
  }
}
