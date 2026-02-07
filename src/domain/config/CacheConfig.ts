/**
 * Cache Configuration Constants
 *
 * Centralizes all cache-related configuration values for the progressive loading feature.
 * These constants are used across cache adapters, use cases, and cache management services.
 */

/**
 * Time-to-live (TTL) for cache entries
 *
 * After this duration, cached data is considered stale and will be
 * refreshed in the background using stale-while-revalidate pattern.
 */
export const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Maximum cache storage size before triggering LRU eviction
 *
 * When cache size exceeds this threshold, oldest entries are evicted
 * to stay within browser storage limits.
 *
 * Note: This is a soft limit. Actual IndexedDB quota varies by browser:
 * - Chrome/Edge: ~80% of available disk space (typically 10-100GB)
 * - Firefox: 2GB per origin
 * - Safari: 1GB per origin
 *
 * We set a conservative 50MB limit to ensure good performance and avoid
 * hitting browser quotas.
 */
export const CACHE_MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Cache eviction threshold percentage
 *
 * LRU eviction is triggered when cache usage exceeds this percentage
 * of CACHE_MAX_SIZE_BYTES.
 *
 * Example: With 50MB max size and 0.8 threshold, eviction starts at 40MB.
 */
export const CACHE_EVICTION_THRESHOLD = 0.8; // 80%

/**
 * Target percentage after eviction
 *
 * LRU eviction will remove entries until cache size is below this
 * percentage of CACHE_MAX_SIZE_BYTES.
 *
 * Example: With 50MB max size and 0.6 target, eviction stops at 30MB.
 */
export const CACHE_EVICTION_TARGET = 0.6; // 60%

/**
 * IndexedDB database name for cache storage
 */
export const CACHE_DB_NAME = "team-insights-cache";

/**
 * IndexedDB database version
 *
 * Increment this when schema changes are needed.
 */
export const CACHE_DB_VERSION = 1;

/**
 * IndexedDB object store name for cache entries
 */
export const CACHE_STORE_NAME = "cache-entries";

/**
 * Cache key prefix for repository data
 *
 * Format: "repo:{owner}/{name}:type:{dataType}:range:{startISO}:{endISO}"
 */
export const CACHE_KEY_PREFIX = "repo:";

/**
 * Minimum time between automatic cache cleanups (LRU eviction checks)
 *
 * Prevents excessive cleanup operations during heavy data loading.
 */
export const CACHE_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Batch size for cache operations
 *
 * Maximum number of entries to process in a single transaction
 * to avoid blocking the main thread.
 */
export const CACHE_BATCH_SIZE = 100;

/**
 * Cache entry size estimation overhead
 *
 * Additional bytes to account for IndexedDB overhead (keys, indices, metadata)
 * when calculating cache entry sizes.
 */
export const CACHE_SIZE_OVERHEAD_BYTES = 1024; // 1KB overhead per entry
