import { DataType } from "@/domain/types/DataType";
import { CacheStatus } from "@/domain/types/CacheStatus";

/**
 * Data Transfer Object for cached data
 *
 * Used to transfer cached data information between domain, application, and presentation layers
 * without exposing internal domain entity structure.
 */
export interface CachedDataDTO {
  /**
   * Cache key identifier
   * Format: {owner}/{repo}:{dataType}:{startISO}:{endISO}
   */
  key: string;

  /**
   * Repository identifier (format: owner/repo)
   */
  repositoryId: string;

  /**
   * Type of cached data
   */
  dataType: DataType;

  /**
   * Date range covered by this cache entry
   */
  dateRange: {
    start: string; // ISO 8601 date string
    end: string; // ISO 8601 date string
  };

  /**
   * Serialized data payload
   */
  data: unknown;

  /**
   * Cache metadata
   */
  metadata: {
    /**
     * When data was cached
     */
    cachedAt: string; // ISO 8601 date string

    /**
     * When cache expires (TTL)
     */
    expiresAt: string; // ISO 8601 date string

    /**
     * Last access timestamp (for LRU eviction)
     */
    lastAccessedAt: string; // ISO 8601 date string

    /**
     * Estimated size in bytes
     */
    size: number;

    /**
     * Whether background refresh is in progress
     */
    isRevalidating: boolean;

    /**
     * Cache status indicator
     */
    status: CacheStatus;
  };
}

/**
 * Cache statistics DTO
 */
export interface CacheStatsDTO {
  /**
   * Total number of cache entries
   */
  totalEntries: number;

  /**
   * Total size of all cached data in bytes
   */
  totalSizeBytes: number;

  /**
   * Oldest cache entry timestamp
   */
  oldestEntry: string | null; // ISO 8601 date string or null

  /**
   * Newest cache entry timestamp
   */
  newestEntry: string | null; // ISO 8601 date string or null

  /**
   * Cache hit rate (0-1)
   */
  hitRate?: number;

  /**
   * Number of entries per data type
   */
  entriesByType?: {
    prs: number;
    deployments: number;
    commits: number;
  };
}

/**
 * Cache operation result DTO
 */
export interface CacheOperationResultDTO {
  /**
   * Whether the operation succeeded
   */
  success: boolean;

  /**
   * Error message if operation failed
   */
  error?: string;

  /**
   * Optional metadata about the operation
   */
  metadata?: {
    /**
     * Number of entries affected
     */
    entriesAffected?: number;

    /**
     * Size freed in bytes (for eviction operations)
     */
    sizeFreed?: number;
  };
}
