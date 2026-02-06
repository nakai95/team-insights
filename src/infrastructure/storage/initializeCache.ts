import { type ICacheRepository } from "@/domain/interfaces/ICacheRepository";
import { IndexedDBAdapter } from "./IndexedDBAdapter";
import { InMemoryCacheAdapter } from "./InMemoryCacheAdapter";

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
 * Cache initialization result
 */
export type CacheInitResult =
  | { success: true; adapter: ICacheRepository }
  | {
      success: false;
      fallback: ICacheRepository;
      reason: CacheInitError;
    };

/**
 * Initialize cache repository with fallback strategy
 *
 * Strategy:
 * 1. Try to initialize IndexedDB (persistent, large capacity)
 * 2. If IndexedDB fails, fall back to in-memory Map (non-persistent, limited capacity)
 *
 * Common failure scenarios:
 * - Safari private mode: IndexedDB disabled
 * - Storage quota exceeded: Browser storage full
 * - Browser incompatibility: Very old browsers
 * - Database corruption: Requires manual cleanup
 *
 * @returns CacheInitResult with either primary adapter or fallback
 *
 * @example
 * const { success, adapter, fallback, reason } = await initializeCache();
 * if (!success) {
 *   console.warn(`Cache initialization failed: ${reason}, using fallback`);
 *   // Show toast notification to user
 * }
 * const cache = success ? adapter : fallback;
 */
export async function initializeCache(): Promise<CacheInitResult> {
  // Check if IndexedDB is supported
  if (typeof indexedDB === "undefined") {
    console.warn("IndexedDB not supported, using in-memory fallback");
    return {
      success: false,
      fallback: new InMemoryCacheAdapter(),
      reason: CacheInitError.INDEXEDDB_NOT_SUPPORTED,
    };
  }

  // Try to initialize IndexedDB
  const indexedDBAdapter = new IndexedDBAdapter();

  try {
    await indexedDBAdapter.init();

    // Test basic operations to ensure it's working
    const testKey = "test:initialization:cache";
    await indexedDBAdapter.delete(testKey); // Clean up any previous test

    // Verify initialization succeeded
    console.log("IndexedDB cache initialized successfully");
    return {
      success: true,
      adapter: indexedDBAdapter,
    };
  } catch (error) {
    console.warn(
      "IndexedDB initialization failed, using in-memory fallback:",
      error,
    );

    // Determine specific failure reason
    let reason: CacheInitError;

    if (
      error instanceof Error &&
      (error.message.includes("disabled") || error.message.includes("private"))
    ) {
      reason = CacheInitError.INDEXEDDB_DISABLED;
    } else if (
      error instanceof Error &&
      (error.name === "QuotaExceededError" || error.message.includes("quota"))
    ) {
      reason = CacheInitError.QUOTA_EXCEEDED;
    } else {
      reason = CacheInitError.OPEN_FAILED;
    }

    return {
      success: false,
      fallback: new InMemoryCacheAdapter(),
      reason,
    };
  }
}

/**
 * Get user-friendly error message for cache initialization failure
 *
 * @param reason - Cache initialization error reason
 * @returns User-friendly error message
 *
 * @example
 * const { success, reason } = await initializeCache();
 * if (!success) {
 *   const message = getCacheInitErrorMessage(reason);
 *   showToast(message, 'warning');
 * }
 */
export function getCacheInitErrorMessage(reason: CacheInitError): string {
  switch (reason) {
    case CacheInitError.INDEXEDDB_NOT_SUPPORTED:
      return "Your browser doesn't support offline caching. Data will be reloaded on each visit.";

    case CacheInitError.INDEXEDDB_DISABLED:
      return "Browser storage is disabled (private mode detected). Cached data won't persist between sessions.";

    case CacheInitError.QUOTA_EXCEEDED:
      return "Browser storage is full. Please clear some space in your browser settings.";

    case CacheInitError.OPEN_FAILED:
      return "Failed to initialize browser cache. Using temporary memory storage.";

    default:
      return "Browser caching unavailable. Data will be reloaded on each visit.";
  }
}
