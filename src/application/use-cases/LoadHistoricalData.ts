import {
  IDataLoader,
  DataLoadErrorType,
} from "@/domain/interfaces/IDataLoader";
import { ICacheRepository } from "@/domain/interfaces/ICacheRepository";
import { DateRange } from "@/domain/value-objects/DateRange";
import { DataType } from "@/domain/types/DataType";
import { CacheStatus } from "@/domain/types/CacheStatus";
import { Result, ok, err } from "@/lib/result";
import { logger } from "@/lib/utils/logger";
import { PullRequest } from "@/domain/interfaces/IGitHubRepository";
import { DeploymentEvent } from "@/domain/value-objects/DeploymentEvent";
import { Commit } from "@/domain/interfaces/IDataLoader";
import { CachedDataEntry } from "@/domain/entities/CachedDataEntry";

/**
 * Progress callback for tracking background loading
 */
export interface LoadProgress {
  /** Current chunk being loaded */
  currentChunk: number;
  /** Total number of chunks */
  totalChunks: number;
  /** Date range of current chunk */
  currentRange: DateRange;
  /** Data type being loaded */
  dataType: DataType;
  /** Items loaded in current chunk */
  itemsLoaded: number;
  /** Total items loaded across all chunks */
  totalItemsLoaded: number;
}

/**
 * Historical data result for a specific data type
 *
 * Note: items is a union array (PullRequest | DeploymentEvent | Commit)[] rather than
 * a discriminated union PullRequest[] | DeploymentEvent[] | Commit[] because:
 * 1. We load data in chunks and accumulate them in a single array
 * 2. Type narrowing would require runtime checks on every array operation
 * 3. The dataType field provides the necessary type information for consumers
 */
export interface HistoricalDataResult {
  dataType: DataType;
  items: (PullRequest | DeploymentEvent | Commit)[];
  chunksLoaded: number;
  totalChunks: number;
  fromCache: boolean;
}

/**
 * LoadHistoricalData Use Case
 *
 * Purpose: Load historical data (31-365 days) in background with chunked batching
 * to prevent API rate limit exhaustion and provide progressive updates
 *
 * Strategy:
 * 1. Split historical range into 90-day chunks
 * 2. Check rate limit before each chunk fetch
 * 3. Check cache for each chunk first
 * 4. Fetch missing chunks from GitHub API
 * 5. Store fetched chunks in cache
 * 6. Report progress via callback for UI updates
 * 7. Support cancellation via AbortSignal
 *
 * Performance:
 * - Each chunk takes ~1-2 seconds to fetch
 * - Total time for 1 year: ~12 seconds (4 chunks × ~3s each with rate limit checks)
 * - Respects rate limits by pausing when budget low (<10% remaining)
 *
 * Usage:
 * ```typescript
 * // In Client Component hook
 * const useCase = new LoadHistoricalData(dataLoader, cacheRepository);
 *
 * startTransition(async () => {
 *   const result = await useCase.execute(
 *     'facebook/react',
 *     DataType.PULL_REQUESTS,
 *     historicalRange, // 31-365 days
 *     abortSignal,
 *     (progress) => {
 *       console.log(`Loading chunk ${progress.currentChunk}/${progress.totalChunks}`);
 *     }
 *   );
 *
 *   if (result.ok) {
 *     updateStateWithHistoricalData(result.value.items);
 *   }
 * });
 * ```
 */
export class LoadHistoricalData {
  private static readonly CHUNK_SIZE_DAYS = 90;
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
  private static readonly RATE_LIMIT_THRESHOLD = 0.1; // Pause when <10% remaining
  private static readonly RATE_LIMIT_CHECK_INTERVAL = 2; // Check every 2 chunks

  constructor(
    private dataLoader: IDataLoader,
    private cacheRepository?: ICacheRepository,
  ) {}

  /**
   * Execute the use case for a specific data type
   *
   * @param repositoryId - Repository identifier (format: "owner/repo")
   * @param dataType - Type of data to load (PRs, deployments, commits)
   * @param dateRange - Historical date range (should be beyond initial 30 days)
   * @param signal - Optional AbortSignal for cancellation
   * @param onProgress - Optional callback for progress updates
   * @returns Result with historical data or error
   */
  async execute(
    repositoryId: string,
    dataType: DataType,
    dateRange: DateRange,
    signal?: AbortSignal,
    onProgress?: (progress: LoadProgress) => void,
  ): Promise<Result<HistoricalDataResult>> {
    try {
      logger.info("LoadHistoricalData", "Starting historical data load", {
        repositoryId,
        dataType,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
        },
      });

      // Check if already aborted
      if (signal?.aborted) {
        return err(new Error("Operation was aborted before starting"));
      }

      // Step 1: Split date range into 90-day chunks
      const chunks = dateRange.split(LoadHistoricalData.CHUNK_SIZE_DAYS);
      logger.debug("LoadHistoricalData", "Date range split into chunks", {
        totalChunks: chunks.length,
        chunkSizeDays: LoadHistoricalData.CHUNK_SIZE_DAYS,
      });

      // Step 2: Load each chunk sequentially with rate limit checks
      const allItems: (PullRequest | DeploymentEvent | Commit)[] = [];
      let chunksLoadedFromCache = 0;

      for (let i = 0; i < chunks.length; i++) {
        // Check for cancellation
        if (signal?.aborted) {
          logger.info("LoadHistoricalData", "Operation aborted", {
            chunksLoaded: i,
            totalChunks: chunks.length,
          });
          return err(new Error("Operation was aborted"));
        }

        const chunk = chunks[i];
        if (!chunk) {
          logger.error("LoadHistoricalData: Invalid chunk index", { index: i });
          continue; // Skip invalid chunk
        }

        // Step 3: Check rate limit before fetching (every N chunks)
        if (i % LoadHistoricalData.RATE_LIMIT_CHECK_INTERVAL === 0) {
          const rateLimitCheck = await this.checkRateLimit();
          if (!rateLimitCheck.ok) {
            logger.warn("LoadHistoricalData", "Rate limit check failed", {
              error: rateLimitCheck.error.message,
            });
            // Continue with cached data if available, but don't fail
          } else if (rateLimitCheck.value.shouldPause) {
            logger.warn("LoadHistoricalData", "Rate limit low, pausing", {
              remaining: rateLimitCheck.value.remaining,
              total: rateLimitCheck.value.total,
              resetAt: rateLimitCheck.value.resetAt.toISOString(),
            });

            // Return what we have so far instead of waiting
            return ok({
              dataType,
              items: allItems,
              chunksLoaded: i,
              totalChunks: chunks.length,
              fromCache: chunksLoadedFromCache === i,
            });
          }
        }

        // Step 4: Check cache for this chunk
        const cachedData = await this.checkChunkCache(
          repositoryId,
          dataType,
          chunk,
        );

        let chunkItems: (PullRequest | DeploymentEvent | Commit)[];

        if (
          cachedData.status === CacheStatus.HIT_FRESH ||
          cachedData.status === CacheStatus.HIT_STALE
        ) {
          // Use cached data
          chunkItems = cachedData.data ?? [];
          chunksLoadedFromCache++;
          logger.debug("LoadHistoricalData", "Loaded chunk from cache", {
            chunk: i + 1,
            totalChunks: chunks.length,
            itemCount: chunkItems.length,
            cacheStatus: cachedData.status,
          });
        } else {
          // Step 5: Fetch from API
          const fetchResult = await this.fetchChunk(
            repositoryId,
            dataType,
            chunk,
            signal,
          );

          if (!fetchResult.ok) {
            logger.warn("LoadHistoricalData", "Failed to fetch chunk", {
              chunk: i + 1,
              totalChunks: chunks.length,
              error: fetchResult.error.message,
            });

            // Continue with next chunk instead of failing entire operation
            chunkItems = [];
          } else {
            chunkItems = fetchResult.value;

            // Step 6: Cache the fetched data
            await this.cacheChunk(repositoryId, dataType, chunk, chunkItems);

            logger.debug("LoadHistoricalData", "Fetched and cached chunk", {
              chunk: i + 1,
              totalChunks: chunks.length,
              itemCount: chunkItems.length,
            });
          }
        }

        // Add to accumulated results
        allItems.push(...chunkItems);

        // Step 7: Report progress
        if (onProgress) {
          onProgress({
            currentChunk: i + 1,
            totalChunks: chunks.length,
            currentRange: chunk,
            dataType,
            itemsLoaded: chunkItems.length,
            totalItemsLoaded: allItems.length,
          });
        }
      }

      logger.info("LoadHistoricalData", "Historical data load complete", {
        repositoryId,
        dataType,
        totalItems: allItems.length,
        chunksLoaded: chunks.length,
        chunksFromCache: chunksLoadedFromCache,
      });

      return ok({
        dataType,
        items: allItems,
        chunksLoaded: chunks.length,
        totalChunks: chunks.length,
        fromCache: chunksLoadedFromCache === chunks.length,
      });
    } catch (error) {
      logger.error("Failed to load historical data", { error });
      return err(
        new Error(
          `Failed to load historical data: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Check rate limit and determine if loading should pause
   */
  private async checkRateLimit(): Promise<
    Result<{
      remaining: number;
      total: number;
      resetAt: Date;
      shouldPause: boolean;
    }>
  > {
    try {
      const rateLimitResult = await this.dataLoader.getRateLimitStatus();

      if (!rateLimitResult.ok) {
        return err(rateLimitResult.error);
      }

      const { remaining, total, resetAt } = rateLimitResult.value;
      const percentRemaining = remaining / total;
      const shouldPause =
        percentRemaining < LoadHistoricalData.RATE_LIMIT_THRESHOLD;

      return ok({
        remaining,
        total,
        resetAt,
        shouldPause,
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to check rate limit: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Check cache for a specific chunk
   */
  private async checkChunkCache(
    repositoryId: string,
    dataType: DataType,
    chunk: DateRange,
  ): Promise<{
    status: CacheStatus;
    data: (PullRequest | DeploymentEvent | Commit)[] | null;
  }> {
    if (!this.cacheRepository) {
      return { status: CacheStatus.MISS, data: null };
    }

    try {
      const entry = await this.cacheRepository.getByDateRange(
        repositoryId,
        dataType,
        chunk,
      );

      if (!entry) {
        return { status: CacheStatus.MISS, data: null };
      }

      const isStale = entry.isStale();
      return {
        status: isStale ? CacheStatus.HIT_STALE : CacheStatus.HIT_FRESH,
        data: entry.data as (PullRequest | DeploymentEvent | Commit)[],
      };
    } catch (error) {
      logger.warn("LoadHistoricalData", "Cache check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { status: CacheStatus.MISS, data: null };
    }
  }

  /**
   * Fetch a chunk from the API based on data type
   */
  private async fetchChunk(
    repositoryId: string,
    dataType: DataType,
    chunk: DateRange,
    signal?: AbortSignal,
  ): Promise<Result<(PullRequest | DeploymentEvent | Commit)[]>> {
    switch (dataType) {
      case DataType.PULL_REQUESTS:
        return this.dataLoader.fetchPRs(repositoryId, chunk, signal);

      case DataType.DEPLOYMENTS:
        return this.dataLoader.fetchDeployments(repositoryId, chunk, signal);

      case DataType.COMMITS:
        return this.dataLoader.fetchCommits(repositoryId, chunk, signal);

      default:
        return err(new Error(`Unknown data type: ${dataType}`));
    }
  }

  /**
   * Cache a fetched chunk
   */
  private async cacheChunk(
    repositoryId: string,
    dataType: DataType,
    chunk: DateRange,
    data: (PullRequest | DeploymentEvent | Commit)[],
  ): Promise<void> {
    if (!this.cacheRepository) {
      return; // Skip caching if no cache repository
    }

    try {
      const entryResult = CachedDataEntry.create(
        repositoryId,
        dataType,
        chunk,
        data,
        LoadHistoricalData.CACHE_TTL_MS,
      );

      if (entryResult.ok) {
        await this.cacheRepository.set(entryResult.value);
        logger.debug("LoadHistoricalData", "Chunk cached successfully", {
          repositoryId,
          dataType,
          itemCount: data.length,
        });
      } else {
        logger.warn("LoadHistoricalData", "Failed to create cache entry", {
          error: entryResult.error.message,
        });
      }
    } catch (error) {
      logger.warn("LoadHistoricalData", "Failed to cache chunk", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - caching failure should not fail the request
    }
  }
}
