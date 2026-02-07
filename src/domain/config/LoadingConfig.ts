/**
 * Loading Configuration Constants
 *
 * Centralizes all progressive loading configuration values including
 * chunk sizes, timeouts, retry logic, and rate limit thresholds.
 */

/**
 * Initial data loading window (recent data)
 *
 * Server Component loads this amount of recent data for fast initial display.
 * Must be ≤30 days to meet performance target of <5 seconds.
 */
export const INITIAL_LOAD_DAYS = 30;

/**
 * Historical data loading chunk size
 *
 * Background loading splits historical data into chunks of this size
 * to prevent API rate limit exhaustion and provide progressive updates.
 *
 * Rationale for 90 days:
 * - Balances API efficiency (fewer requests) with progress granularity
 * - Each chunk completes in ~1-2 seconds with typical repository data
 * - For 1 year: 4 chunks × ~2s each = ~8s total for historical data
 */
export const HISTORICAL_CHUNK_SIZE_DAYS = 90;

/**
 * Maximum historical data range
 *
 * Limits how far back background loading will fetch data.
 * Prevents excessive API usage for very old data with limited value.
 */
export const MAX_HISTORICAL_DAYS = 365; // 1 year

/**
 * Rate limit threshold for pausing background loading
 *
 * When GitHub API rate limit falls below this percentage of total quota,
 * background loading pauses to preserve budget for interactive requests.
 *
 * Example: With 5000 req/hr quota and 0.1 threshold, pause at <500 remaining
 */
export const RATE_LIMIT_PAUSE_THRESHOLD = 0.1; // 10% remaining

/**
 * Rate limit check interval (in chunks)
 *
 * How often to check rate limit status during background loading.
 * Checking every N chunks balances API overhead with responsive pausing.
 *
 * Example: Check every 2 chunks = check after ~4 seconds of loading
 */
export const RATE_LIMIT_CHECK_INTERVAL_CHUNKS = 2;

/**
 * Maximum retry attempts for network errors
 *
 * Background loading will retry failed chunk fetches this many times
 * before giving up and moving to the next chunk.
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Initial retry delay for network errors
 *
 * Exponential backoff starts at this delay:
 * - Attempt 1: 1s
 * - Attempt 2: 2s
 * - Attempt 3: 4s
 */
export const INITIAL_RETRY_DELAY_MS = 1000; // 1 second

/**
 * Retry delay multiplier for exponential backoff
 *
 * Each retry delay is multiplied by this factor:
 * delay = INITIAL_RETRY_DELAY_MS * (RETRY_BACKOFF_MULTIPLIER ^ (attempt - 1))
 */
export const RETRY_BACKOFF_MULTIPLIER = 2;

/**
 * Request timeout for API calls
 *
 * Maximum time to wait for a single API request before aborting.
 * Should be longer than typical request time but not infinite.
 */
export const API_REQUEST_TIMEOUT_MS = 30 * 1000; // 30 seconds

/**
 * Background loading timeout
 *
 * Maximum total time for background historical data loading.
 * Prevents indefinite loading if something goes wrong.
 */
export const BACKGROUND_LOADING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Skeleton UI display minimum duration
 *
 * Minimum time to show skeleton UI to avoid jarring flash of loading state.
 * If data loads faster than this, skeleton remains visible for smooth UX.
 */
export const SKELETON_MIN_DURATION_MS = 300; // 300ms

/**
 * Debounce delay for date range selection
 *
 * Delay before triggering data fetch after user changes date range.
 * Prevents excessive API calls while user is still adjusting dates.
 */
export const DATE_RANGE_DEBOUNCE_MS = 500; // 500ms

/**
 * Maximum items per page for paginated API requests
 *
 * GraphQL pagination limit per request to avoid timeout.
 * GitHub API typically allows up to 100 items per request.
 */
export const PAGINATION_PAGE_SIZE = 100;

/**
 * Stale-while-revalidate grace period
 *
 * How long to serve stale cached data while background refresh happens.
 * Should be less than CACHE_TTL_MS to ensure eventual consistency.
 */
export const STALE_REVALIDATE_GRACE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Performance monitoring thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  /** Target for initial 30-day data load */
  INITIAL_LOAD_TARGET_MS: 5000, // 5 seconds

  /** Target for cached data retrieval */
  CACHED_LOAD_TARGET_MS: 1000, // 1 second

  /** Target for date range change with cached data */
  DATE_CHANGE_TARGET_MS: 500, // 500ms

  /** Target for background historical load completion */
  BACKGROUND_LOAD_TARGET_MS: 30000, // 30 seconds

  /** Target for UI interactions during loading (useTransition) */
  UI_INTERACTION_TARGET_MS: 200, // 200ms
} as const;
