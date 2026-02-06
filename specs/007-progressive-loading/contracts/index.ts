/**
 * Progressive Loading Feature Contracts
 *
 * This file serves as the main entry point for all type contracts.
 * Contracts are documentation-only and excluded from compilation.
 *
 * @see ../data-model.md for detailed specifications
 */

// ============================================================================
// ENUMS (String Literal Types)
// ============================================================================

export const DataType = {
  PRS: "prs",
  DEPLOYMENTS: "deployments",
  COMMITS: "commits",
} as const;
export type DataType = (typeof DataType)[keyof typeof DataType];

export const StreamType = {
  PRS: "prs",
  DEPLOYMENTS: "deployments",
  COMMITS: "commits",
} as const;
export type StreamType = (typeof StreamType)[keyof typeof StreamType];

export const LoadingStatus = {
  IDLE: "idle",
  LOADING: "loading",
  COMPLETE: "complete",
  ERROR: "error",
} as const;
export type LoadingStatus = (typeof LoadingStatus)[keyof typeof LoadingStatus];

export const LoadingType = {
  INITIAL: "initial",
  BACKGROUND: "background",
  CUSTOM: "custom",
} as const;
export type LoadingType = (typeof LoadingType)[keyof typeof LoadingType];

export const CacheStatus = {
  HIT_FRESH: "hit_fresh",
  HIT_STALE: "hit_stale",
  MISS: "miss",
  REVALIDATING: "revalidating",
} as const;
export type CacheStatus = (typeof CacheStatus)[keyof typeof CacheStatus];

export const DateRangePreset = {
  LAST_7_DAYS: "last_7_days",
  LAST_30_DAYS: "last_30_days",
  LAST_90_DAYS: "last_90_days",
  LAST_6_MONTHS: "last_6_months",
  LAST_YEAR: "last_year",
  CUSTOM: "custom",
} as const;
export type DateRangePreset =
  (typeof DateRangePreset)[keyof typeof DateRangePreset];

// ============================================================================
// VALUE OBJECTS
// ============================================================================

export interface CacheKey {
  readonly value: string; // Format: {owner}/{repo}:{dataType}:{startISO}:{endISO}
}

export interface DateRange {
  readonly start: Date;
  readonly end: Date;
}

export interface LoadingProgress {
  readonly percentage: number; // 0-100
  readonly currentBatch: number;
  readonly totalBatches: number;
  readonly estimatedTimeRemaining?: number; // milliseconds
}

// ============================================================================
// ENTITIES
// ============================================================================

export interface CachedDataEntry {
  readonly key: CacheKey;
  readonly repositoryId: string;
  readonly dataType: DataType;
  readonly dateRange: DateRange;
  readonly data: unknown; // Serialized JSON payload
  readonly cachedAt: Date;
  readonly expiresAt: Date;
  readonly lastAccessedAt: Date;
  readonly size: number; // bytes
  readonly isRevalidating: boolean;
}

export interface LoadingState {
  readonly streamType: StreamType;
  readonly status: LoadingStatus;
  readonly loadingType: LoadingType;
  readonly progress: LoadingProgress;
  readonly error?: Error;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
}

export interface DateRangeSelection {
  readonly range: DateRange;
  readonly preset?: DateRangePreset;
  readonly cacheStatus: CacheStatus;
  readonly lastUpdated?: Date;
}

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface CacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

export interface ICacheRepository {
  get(key: CacheKey): Promise<CachedDataEntry | null>;
  set(entry: CachedDataEntry): Promise<void>;
  delete(key: CacheKey): Promise<void>;
  clearRepository(repositoryId: string): Promise<void>;
  clearAll(): Promise<void>;
  getAll(): Promise<CachedDataEntry[]>;
  getStats(): Promise<CacheStats>;
}

export interface IDataLoader {
  fetchPRs(
    repositoryId: string,
    dateRange: DateRange,
    signal?: AbortSignal,
  ): Promise<Result<PullRequest[]>>;

  fetchDeployments(
    repositoryId: string,
    dateRange: DateRange,
    signal?: AbortSignal,
  ): Promise<Result<DeploymentEvent[]>>;

  fetchCommits(
    repositoryId: string,
    dateRange: DateRange,
    signal?: AbortSignal,
  ): Promise<Result<Commit[]>>;
}

export interface ILoadingStateManager {
  getState(streamType: StreamType): LoadingState;
  startLoading(streamType: StreamType, loadingType: LoadingType): void;
  updateProgress(streamType: StreamType, progress: LoadingProgress): void;
  completeLoading(streamType: StreamType): void;
  failLoading(streamType: StreamType, error: Error): void;
  isAnyStreamLoading(): boolean;
  subscribe(
    callback: (states: Record<StreamType, LoadingState>) => void,
  ): () => void;
}

// ============================================================================
// UTILITY TYPES (Referenced from existing codebase)
// ============================================================================

/**
 * Result type for operations that can fail
 * @see src/domain/value-objects/Result.ts
 */
export type Result<T> =
  | { success: true; value: T }
  | { success: false; error: string };

/**
 * PullRequest type from existing domain
 * @see src/domain/entities/PullRequest.ts
 */
export type PullRequest = unknown; // Reference to existing type

/**
 * DeploymentEvent type from DORA metrics
 * @see src/domain/entities/DeploymentEvent.ts
 */
export type DeploymentEvent = unknown; // Reference to existing type

/**
 * Commit type (to be defined)
 * @see src/domain/entities/Commit.ts
 */
export type Commit = unknown; // To be implemented

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

export const CacheConfig = {
  ACTIVE_REPO_TTL: 60 * 60 * 1000, // 1 hour
  ARCHIVED_REPO_TTL: 24 * 60 * 60 * 1000, // 24 hours
  HISTORICAL_DATA_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  STALE_WARNING_THRESHOLD: 2 * 60 * 60 * 1000, // 2 hours
  VERY_STALE_THRESHOLD: 24 * 60 * 60 * 1000, // 24 hours
  MIN_RATE_LIMIT_PERCENTAGE: 10,
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_ENTRIES: 1000,
  REFRESH_DEBOUNCE_MS: 5000, // 5 seconds
} as const;
