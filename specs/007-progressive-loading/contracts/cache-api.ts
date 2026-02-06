/**
 * Cache API Contracts
 *
 * TypeScript interfaces defining the cache repository abstraction for
 * progressive data loading. These contracts are documentation only
 * (excluded from compilation per tsconfig.json).
 *
 * Implementation: src/infrastructure/storage/IndexedDBAdapter.ts
 * Fallback: src/infrastructure/storage/InMemoryCacheAdapter.ts
 *
 * Feature: 007-progressive-loading
 * Date: 2026-02-06
 */

// ============================================================================
// Domain Types (from src/domain/value-objects/)
// ============================================================================

export const DataType = {
  PULL_REQUESTS: "pull_requests",
  DEPLOYMENTS: "deployments",
  COMMITS: "commits",
} as const;
export type DataType = (typeof DataType)[keyof typeof DataType];

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CachedDataEntry {
  key: string; // Format: "repo:{owner}/{name}:type:{dataType}:range:{start}:{end}"
  repositoryId: string; // Format: "{owner}/{name}"
  dataType: DataType;
  dateRange: DateRange;
  data: unknown; // Serialized PR/deployment/commit data
  cachedAt: Date;
  expiresAt: Date;
  lastAccessedAt: Date;
  sizeBytes: number;
  isRevalidating: boolean;
}

export interface CacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

// ============================================================================
// Cache Repository Interface
// ============================================================================

/**
 * ICacheRepository - Abstraction for cache storage operations
 *
 * Purpose: Provides a clean interface for storing and retrieving cached
 * GitHub data with metadata for staleness detection and LRU eviction.
 *
 * Implementation Details:
 * - Primary implementation: IndexedDB (persistent, large capacity)
 * - Fallback implementation: In-memory Map (non-persistent, limited capacity)
 * - Graceful degradation: Safari private mode, QuotaExceededError
 */
export interface ICacheRepository {
  /**
   * Retrieve cached data by key
   *
   * @param key - Unique cache key (format: "repo:{owner}/{name}:type:{dataType}:range:{start}:{end}")
   * @returns CachedDataEntry if found and valid (regardless of staleness), null otherwise
   *
   * @example
   * const entry = await cache.get('repo:facebook/react:type:pull_requests:range:2026-01-07:2026-02-06');
   * if (entry && entry.isStale()) {
   *   // Serve stale data, trigger background refresh
   * }
   */
  get(key: string): Promise<CachedDataEntry | null>;

  /**
   * Retrieve all cached entries for a specific repository
   *
   * @param repositoryId - Repository identifier (format: "{owner}/{name}")
   * @returns Array of all cache entries for this repository
   *
   * @example
   * const entries = await cache.getByRepository('facebook/react');
   * // Returns all PRs, deployments, commits cached for facebook/react
   */
  getByRepository(repositoryId: string): Promise<CachedDataEntry[]>;

  /**
   * Retrieve cached data for specific data type and date range
   *
   * @param repositoryId - Repository identifier
   * @param dataType - Type of data (PRs, deployments, commits)
   * @param range - Date range to query
   * @returns CachedDataEntry if exact match found, null otherwise
   *
   * @example
   * const entry = await cache.getByDateRange(
   *   'facebook/react',
   *   DataType.PULL_REQUESTS,
   *   { start: new Date('2026-01-07'), end: new Date('2026-02-06') }
   * );
   */
  getByDateRange(
    repositoryId: string,
    dataType: DataType,
    range: DateRange,
  ): Promise<CachedDataEntry | null>;

  /**
   * Store data in cache with TTL
   *
   * @param entry - Complete cache entry with metadata
   * @throws Error if storage quota exceeded (QuotaExceededError in IndexedDB)
   * @throws Error if entry validation fails (invalid key format, negative size, etc.)
   *
   * @example
   * await cache.set({
   *   key: 'repo:facebook/react:type:pull_requests:range:2026-01-07:2026-02-06',
   *   repositoryId: 'facebook/react',
   *   dataType: DataType.PULL_REQUESTS,
   *   dateRange: { start: new Date('2026-01-07'), end: new Date('2026-02-06') },
   *   data: serializedPRs,
   *   cachedAt: new Date(),
   *   expiresAt: new Date(Date.now() + 3600000), // 1 hour TTL
   *   lastAccessedAt: new Date(),
   *   sizeBytes: 125000,
   *   isRevalidating: false,
   * });
   */
  set(entry: CachedDataEntry): Promise<void>;

  /**
   * Store multiple cache entries atomically
   *
   * @param entries - Array of cache entries to store
   * @throws Error if storage quota exceeded
   *
   * @example
   * await cache.setMany([prEntry, deploymentEntry, commitEntry]);
   */
  setMany(entries: CachedDataEntry[]): Promise<void>;

  /**
   * Remove specific cache entries by keys
   *
   * @param keys - Array of cache keys to remove
   *
   * @example
   * await cache.evict([
   *   'repo:facebook/react:type:pull_requests:range:2025-01-01:2025-01-31',
   *   'repo:facebook/react:type:deployments:range:2025-01-01:2025-01-31',
   * ]);
   */
  evict(keys: string[]): Promise<void>;

  /**
   * Remove all stale cache entries (expiresAt < now)
   *
   * @returns Number of entries removed
   *
   * @example
   * const removedCount = await cache.evictStale();
   * console.log(`Removed ${removedCount} stale entries`);
   */
  evictStale(): Promise<number>;

  /**
   * Remove specific cache entry by key
   *
   * @param key - Cache key to remove
   *
   * @example
   * await cache.delete('repo:facebook/react:type:pull_requests:range:2026-01-07:2026-02-06');
   */
  delete(key: string): Promise<void>;

  /**
   * Remove all cache entries for a specific repository
   *
   * @param repositoryId - Repository identifier
   *
   * @example
   * await cache.clearRepository('facebook/react');
   */
  clearRepository(repositoryId: string): Promise<void>;

  /**
   * Remove all cached data (full cache clear)
   *
   * Warning: This operation is destructive and irreversible
   *
   * @example
   * await cache.clearAll();
   */
  clearAll(): Promise<void>;

  /**
   * Get all cache entries (for LRU eviction algorithm)
   *
   * @returns Array of all cached entries
   *
   * @example
   * const allEntries = await cache.getAll();
   * const toEvict = calculateEvictionCandidates(allEntries, targetBytes);
   * await cache.evict(toEvict.map(e => e.key));
   */
  getAll(): Promise<CachedDataEntry[]>;

  /**
   * Get cache statistics for monitoring and debugging
   *
   * @returns Cache statistics (total entries, size, oldest/newest entry timestamps)
   *
   * @example
   * const stats = await cache.getStats();
   * if (stats.totalSizeBytes > 40 * 1024 * 1024) {
   *   // Approaching 50MB limit, trigger eviction
   * }
   */
  getStats(): Promise<CacheStats>;

  /**
   * Get total size of all cached data in bytes
   *
   * @returns Total size in bytes
   *
   * @example
   * const totalSize = await cache.getTotalSize();
   * const percentUsed = (totalSize / (50 * 1024 * 1024)) * 100;
   */
  getTotalSize(): Promise<number>;

  /**
   * Get total number of cached entries
   *
   * @returns Total entry count
   *
   * @example
   * const count = await cache.getEntryCount();
   * if (count > 1000) {
   *   // Too many entries, trigger LRU eviction
   * }
   */
  getEntryCount(): Promise<number>;
}

// ============================================================================
// Cache Configuration
// ============================================================================

/**
 * Cache configuration constants (from research.md)
 */
export const CacheConfig = {
  // TTL values
  ACTIVE_REPO_TTL: 60 * 60 * 1000, // 1 hour for active repositories
  ARCHIVED_REPO_TTL: 24 * 60 * 60 * 1000, // 24 hours for archived repositories
  HISTORICAL_DATA_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days for historical data (>90 days old)

  // Storage limits
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50 MB
  MAX_ENTRIES: 1000, // Maximum number of cache entries
  EVICTION_THRESHOLD: 0.8, // Trigger eviction at 80% capacity (40MB)
  EVICTION_TARGET: 0.6, // Evict down to 60% capacity (30MB)

  // Rate limit protection
  MIN_RATE_LIMIT_PERCENTAGE: 10, // Pause revalidation if < 10% API budget remaining

  // IndexedDB
  DB_NAME: "team-insights-cache",
  DB_VERSION: 1,
  STORE_NAME: "cache-entries",
} as const;

// ============================================================================
// LRU Eviction Strategy
// ============================================================================

/**
 * LRU Eviction Service Interface
 *
 * Purpose: Implements Least Recently Used eviction strategy for cache management
 *
 * Algorithm:
 * 1. Calculate priority score for each entry:
 *    priority = (accessCount * 2) + recencyScore - stalenessScore
 *    recencyScore = 100 * (1 - daysSinceAccess / 365)
 *    stalenessScore = isStale ? 50 : 0
 * 2. Sort entries by priority (ascending)
 * 3. Select lowest priority entries until target size reached
 */
export interface ICacheEvictionService {
  /**
   * Determine if eviction is needed based on current cache size
   *
   * @param currentSizeBytes - Current total cache size in bytes
   * @param maxSizeBytes - Maximum allowed cache size
   * @returns true if currentSize >= 80% of maxSize
   *
   * @example
   * const shouldEvict = evictionService.shouldEvict(42000000, 50000000);
   * // Returns true (42MB >= 40MB threshold)
   */
  shouldEvict(currentSizeBytes: number, maxSizeBytes: number): boolean;

  /**
   * Calculate which entries to evict to reach target size
   *
   * @param entries - All current cache entries
   * @param targetBytes - Target total size after eviction
   * @returns Array of entries to evict (sorted by priority, lowest first)
   *
   * @example
   * const toEvict = evictionService.calculateEvictionCandidates(
   *   allEntries,
   *   30 * 1024 * 1024 // Target: 30MB
   * );
   * await cache.evict(toEvict.map(e => e.key));
   */
  calculateEvictionCandidates(
    entries: CachedDataEntry[],
    targetBytes: number,
  ): CachedDataEntry[];
}

// ============================================================================
// Cache Initialization & Error Handling
// ============================================================================

/**
 * Cache initialization result
 */
export type CacheInitResult =
  | { success: true; adapter: ICacheRepository }
  | { success: false; fallback: ICacheRepository; reason: CacheInitError };

/**
 * Cache initialization errors
 */
export const CacheInitError = {
  INDEXEDDB_NOT_SUPPORTED: "indexeddb_not_supported", // Browser doesn't support IndexedDB
  INDEXEDDB_DISABLED: "indexeddb_disabled", // Safari private mode, storage disabled
  QUOTA_EXCEEDED: "quota_exceeded", // Storage quota exceeded during initialization
  OPEN_FAILED: "open_failed", // Database open failed (corruption, version mismatch)
} as const;
export type CacheInitError =
  (typeof CacheInitError)[keyof typeof CacheInitError];

/**
 * Cache initialization function signature
 *
 * @example
 * const { success, adapter, fallback, reason } = await initializeCache();
 * if (!success) {
 *   console.warn(`Cache initialization failed: ${reason}, using fallback`);
 *   showToast('Browser storage unavailable, using temporary memory cache');
 * }
 * return success ? adapter : fallback;
 */
export type InitializeCacheFn = () => Promise<CacheInitResult>;
