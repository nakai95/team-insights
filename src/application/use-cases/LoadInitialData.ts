import { IDataLoader } from "@/domain/interfaces/IDataLoader";
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
 * Initial data result containing all data types
 */
export interface InitialDataResult {
  pullRequests: PullRequest[];
  deployments: DeploymentEvent[];
  commits: Commit[];
  cacheStatus: {
    prs: CacheStatus;
    deployments: CacheStatus;
    commits: CacheStatus;
  };
  loadedAt: Date;
}

/**
 * LoadInitialData Use Case
 *
 * Purpose: Fetch initial data with cache-aware loading for fast dashboard display
 * Supports custom date ranges (7 days, 30 days, 90 days, 6 months, 1 year, or custom)
 *
 * Strategy:
 * 1. Check cache for each data type (PRs, deployments, commits)
 * 2. Serve stale data immediately if available (stale-while-revalidate)
 * 3. Fetch missing/stale data from GitHub API in parallel
 * 4. Store fetched data in cache
 * 5. Return combined result for Server Component to pass to Client Components
 *
 * Performance:
 * - Cache hit (fresh): <1s (instant display from IndexedDB)
 * - Cache hit (stale): <1s initial + background refresh
 * - Cache miss: <5s for 30 days (parallel API fetches)
 * - Large ranges: May take longer depending on data volume
 *
 * Usage:
 * ```typescript
 * // In Server Component (app/[locale]/dashboard/page.tsx)
 * const useCase = new LoadInitialData(dataLoader, cacheRepository);
 *
 * // Default 30-day range
 * const result = await useCase.execute('facebook/react');
 *
 * // Custom date range
 * const customRange = DateRange.last90Days();
 * const result = await useCase.execute('facebook/react', customRange);
 *
 * if (result.ok) {
 *   return <DashboardClient initialData={result.value} />;
 * }
 * ```
 */
export class LoadInitialData {
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    private dataLoader: IDataLoader,
    private cacheRepository?: ICacheRepository, // Optional until Phase 2 cache adapters are implemented
  ) {}

  /**
   * Execute the use case
   *
   * @param repositoryId - Repository identifier (format: "owner/repo")
   * @param dateRange - Date range to fetch (default: last 30 days)
   * @param signal - Optional AbortSignal for cancellation
   * @param staleWhileRevalidate - If true, return stale data immediately without waiting for refresh (default: true)
   * @returns Result with initial data or error
   */
  async execute(
    repositoryId: string,
    dateRange: DateRange = DateRange.last30Days(),
    signal?: AbortSignal,
    staleWhileRevalidate = true,
  ): Promise<Result<InitialDataResult>> {
    try {
      logger.info("LoadInitialData", "Starting initial data load", {
        repositoryId,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
        },
        staleWhileRevalidate,
      });

      // Step 1: Check cache for each data type (if cache repository available)
      const cachedData = await this.checkCache(repositoryId, dateRange);

      // Step 2: Determine what needs to be fetched
      const hasStalePRs = cachedData.prs.status === CacheStatus.HIT_STALE;
      const hasStaleDep =
        cachedData.deployments.status === CacheStatus.HIT_STALE;
      const hasStaleCommits =
        cachedData.commits.status === CacheStatus.HIT_STALE;
      const hasAnyStalData = hasStalePRs || hasStaleDep || hasStaleCommits;

      const needsFetchPRs =
        cachedData.prs.status === CacheStatus.MISS || hasStalePRs;
      const needsFetchDeployments =
        cachedData.deployments.status === CacheStatus.MISS || hasStaleDep;
      const needsFetchCommits =
        cachedData.commits.status === CacheStatus.MISS || hasStaleCommits;

      // Step 3: If stale-while-revalidate is enabled and we have any cached data,
      // return it immediately and mark for background revalidation
      if (staleWhileRevalidate && hasAnyStalData) {
        // Mark stale entries as revalidating (for client-side detection)
        const revalidatingStatus = {
          prs: hasStalePRs ? CacheStatus.REVALIDATING : cachedData.prs.status,
          deployments: hasStaleDep
            ? CacheStatus.REVALIDATING
            : cachedData.deployments.status,
          commits: hasStaleCommits
            ? CacheStatus.REVALIDATING
            : cachedData.commits.status,
        };

        // Mark cache entries as revalidating
        if (hasStalePRs && this.cacheRepository) {
          await this.markAsRevalidating(
            repositoryId,
            DataType.PULL_REQUESTS,
            dateRange,
          );
        }
        if (hasStaleDep && this.cacheRepository) {
          await this.markAsRevalidating(
            repositoryId,
            DataType.DEPLOYMENTS,
            dateRange,
          );
        }
        if (hasStaleCommits && this.cacheRepository) {
          await this.markAsRevalidating(
            repositoryId,
            DataType.COMMITS,
            dateRange,
          );
        }

        logger.info(
          "LoadInitialData",
          "Returning stale data immediately (stale-while-revalidate)",
          {
            pullRequestsCount: cachedData.prs.data?.length ?? 0,
            deploymentsCount: cachedData.deployments.data?.length ?? 0,
            commitsCount: cachedData.commits.data?.length ?? 0,
            cacheStatus: revalidatingStatus,
          },
        );

        // Return stale data immediately with revalidating status
        return ok({
          pullRequests: cachedData.prs.data ?? [],
          deployments: cachedData.deployments.data ?? [],
          commits: cachedData.commits.data ?? [],
          cacheStatus: revalidatingStatus,
          loadedAt: new Date(),
        });
      }

      // Step 4: Fetch missing/stale data in parallel (only if not using stale-while-revalidate or all cache miss)
      const fetchPromises: Promise<void>[] = [];

      let pullRequests: PullRequest[] = cachedData.prs.data ?? [];
      let deployments: DeploymentEvent[] = cachedData.deployments.data ?? [];
      let commits: Commit[] = cachedData.commits.data ?? [];

      if (needsFetchPRs) {
        fetchPromises.push(
          (async () => {
            const result = await this.dataLoader.fetchPRs(
              repositoryId,
              dateRange,
              signal,
            );
            if (result.ok) {
              pullRequests = result.value;
              await this.cacheData(
                repositoryId,
                DataType.PULL_REQUESTS,
                dateRange,
                result.value,
              );
            } else {
              logger.warn("LoadInitialData", "Failed to fetch PRs", {
                error: result.error.message,
              });
              // Keep cached data if fetch fails
            }
          })(),
        );
      }

      if (needsFetchDeployments) {
        fetchPromises.push(
          (async () => {
            const result = await this.dataLoader.fetchDeployments(
              repositoryId,
              dateRange,
              signal,
            );
            if (result.ok) {
              deployments = result.value;
              await this.cacheData(
                repositoryId,
                DataType.DEPLOYMENTS,
                dateRange,
                result.value,
              );
            } else {
              logger.warn("LoadInitialData", "Failed to fetch deployments", {
                error: result.error.message,
              });
              // Keep cached data if fetch fails
            }
          })(),
        );
      }

      if (needsFetchCommits) {
        fetchPromises.push(
          (async () => {
            const result = await this.dataLoader.fetchCommits(
              repositoryId,
              dateRange,
              signal,
            );
            if (result.ok) {
              commits = result.value;
              await this.cacheData(
                repositoryId,
                DataType.COMMITS,
                dateRange,
                result.value,
              );
            } else {
              logger.warn("LoadInitialData", "Failed to fetch commits", {
                error: result.error.message,
              });
              // Keep cached data if fetch fails
            }
          })(),
        );
      }

      // Wait for all fetches to complete
      await Promise.all(fetchPromises);

      logger.info("LoadInitialData", "Initial data load complete", {
        pullRequestsCount: pullRequests.length,
        deploymentsCount: deployments.length,
        commitsCount: commits.length,
        cacheStatus: {
          prs: cachedData.prs.status,
          deployments: cachedData.deployments.status,
          commits: cachedData.commits.status,
        },
      });

      return ok({
        pullRequests,
        deployments,
        commits,
        cacheStatus: {
          prs: needsFetchPRs ? CacheStatus.HIT_FRESH : cachedData.prs.status,
          deployments: needsFetchDeployments
            ? CacheStatus.HIT_FRESH
            : cachedData.deployments.status,
          commits: needsFetchCommits
            ? CacheStatus.HIT_FRESH
            : cachedData.commits.status,
        },
        loadedAt: new Date(),
      });
    } catch (error) {
      logger.error("Failed to load initial data", { error });
      return err(
        new Error(
          `Failed to load initial data: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Check cache for all data types
   */
  private async checkCache(
    repositoryId: string,
    dateRange: DateRange,
  ): Promise<{
    prs: { status: CacheStatus; data: PullRequest[] | null };
    deployments: { status: CacheStatus; data: DeploymentEvent[] | null };
    commits: { status: CacheStatus; data: Commit[] | null };
  }> {
    // If no cache repository, return cache miss for all
    if (!this.cacheRepository) {
      return {
        prs: { status: CacheStatus.MISS, data: null },
        deployments: { status: CacheStatus.MISS, data: null },
        commits: { status: CacheStatus.MISS, data: null },
      };
    }

    // Check cache for each data type in parallel
    const [prsEntry, deploymentsEntry, commitsEntry] = await Promise.all([
      this.cacheRepository.getByDateRange(
        repositoryId,
        DataType.PULL_REQUESTS,
        dateRange,
      ),
      this.cacheRepository.getByDateRange(
        repositoryId,
        DataType.DEPLOYMENTS,
        dateRange,
      ),
      this.cacheRepository.getByDateRange(
        repositoryId,
        DataType.COMMITS,
        dateRange,
      ),
    ]);

    return {
      prs: this.getCacheStatusAndData<PullRequest>(prsEntry),
      deployments:
        this.getCacheStatusAndData<DeploymentEvent>(deploymentsEntry),
      commits: this.getCacheStatusAndData<Commit>(commitsEntry),
    };
  }

  /**
   * Get cache status and data from cache entry
   */
  private getCacheStatusAndData<T>(entry: CachedDataEntry | null): {
    status: CacheStatus;
    data: T[] | null;
  } {
    if (!entry) {
      return { status: CacheStatus.MISS, data: null };
    }

    const isStale = entry.isStale();
    return {
      status: isStale ? CacheStatus.HIT_STALE : CacheStatus.HIT_FRESH,
      data: entry.data as T[],
    };
  }

  /**
   * Cache fetched data
   */
  private async cacheData(
    repositoryId: string,
    dataType: DataType,
    dateRange: DateRange,
    data: unknown,
  ): Promise<void> {
    if (!this.cacheRepository) {
      return; // Skip caching if no cache repository
    }

    try {
      const entryResult = CachedDataEntry.create(
        repositoryId,
        dataType,
        dateRange,
        data,
        LoadInitialData.CACHE_TTL_MS,
      );

      if (entryResult.ok) {
        await this.cacheRepository.set(entryResult.value);
        logger.debug("LoadInitialData", "Data cached successfully", {
          repositoryId,
          dataType,
        });
      } else {
        logger.warn("LoadInitialData", "Failed to create cache entry", {
          error: entryResult.error.message,
        });
      }
    } catch (error) {
      logger.warn("LoadInitialData", "Failed to cache data", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - caching failure should not fail the request
    }
  }

  /**
   * Mark cache entry as revalidating
   */
  private async markAsRevalidating(
    repositoryId: string,
    dataType: DataType,
    dateRange: DateRange,
  ): Promise<void> {
    if (!this.cacheRepository) {
      return;
    }

    try {
      const entry = await this.cacheRepository.getByDateRange(
        repositoryId,
        dataType,
        dateRange,
      );

      if (entry) {
        const updated = entry.startRevalidation();
        await this.cacheRepository.set(updated);
      }
    } catch (error) {
      logger.warn("LoadInitialData", "Failed to mark entry as revalidating", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Revalidate (refresh) cached data in the background
   *
   * This method fetches fresh data from the API and updates the cache without blocking the caller.
   * It should be called after receiving stale data from execute() with REVALIDATING status.
   *
   * @param repositoryId - Repository identifier
   * @param dateRange - Date range to refresh
   * @param signal - Optional AbortSignal for cancellation
   * @returns Result with fresh data or error
   *
   * @example
   * ```typescript
   * // In client component after receiving stale data:
   * useEffect(() => {
   *   if (cacheStatus.prs === CacheStatus.REVALIDATING) {
   *     startTransition(async () => {
   *       const result = await useCase.revalidate(repositoryId, dateRange);
   *       if (result.ok) {
   *         setData(result.value);
   *       }
   *     });
   *   }
   * }, [cacheStatus]);
   * ```
   */
  async revalidate(
    repositoryId: string,
    dateRange: DateRange,
    signal?: AbortSignal,
  ): Promise<Result<InitialDataResult>> {
    try {
      logger.info("LoadInitialData", "Starting background revalidation", {
        repositoryId,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
        },
      });

      // Fetch fresh data from API in parallel
      const [prsResult, deploymentsResult, commitsResult] = await Promise.all([
        this.dataLoader.fetchPRs(repositoryId, dateRange, signal),
        this.dataLoader.fetchDeployments(repositoryId, dateRange, signal),
        this.dataLoader.fetchCommits(repositoryId, dateRange, signal),
      ]);

      // Store fresh data in cache
      const cachePromises: Promise<void>[] = [];

      if (prsResult.ok) {
        cachePromises.push(
          this.cacheData(
            repositoryId,
            DataType.PULL_REQUESTS,
            dateRange,
            prsResult.value,
          ),
        );
      }

      if (deploymentsResult.ok) {
        cachePromises.push(
          this.cacheData(
            repositoryId,
            DataType.DEPLOYMENTS,
            dateRange,
            deploymentsResult.value,
          ),
        );
      }

      if (commitsResult.ok) {
        cachePromises.push(
          this.cacheData(
            repositoryId,
            DataType.COMMITS,
            dateRange,
            commitsResult.value,
          ),
        );
      }

      await Promise.all(cachePromises);

      logger.info("LoadInitialData", "Background revalidation complete", {
        pullRequestsCount: prsResult.ok ? prsResult.value.length : 0,
        deploymentsCount: deploymentsResult.ok
          ? deploymentsResult.value.length
          : 0,
        commitsCount: commitsResult.ok ? commitsResult.value.length : 0,
      });

      // Return fresh data with HIT_FRESH status
      return ok({
        pullRequests: prsResult.ok ? prsResult.value : [],
        deployments: deploymentsResult.ok ? deploymentsResult.value : [],
        commits: commitsResult.ok ? commitsResult.value : [],
        cacheStatus: {
          prs: CacheStatus.HIT_FRESH,
          deployments: CacheStatus.HIT_FRESH,
          commits: CacheStatus.HIT_FRESH,
        },
        loadedAt: new Date(),
      });
    } catch (error) {
      logger.error("Failed to revalidate data", { error });
      return err(
        new Error(
          `Failed to revalidate data: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}
