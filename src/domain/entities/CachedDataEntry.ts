import { type Result, ok, err } from "@/lib/result";
import { CacheKey } from "@/domain/value-objects/CacheKey";
import { type DataType } from "@/domain/types/DataType";
import { DateRange } from "@/domain/value-objects/DateRange";

/**
 * CachedDataEntry entity
 *
 * Represents a cached data segment in IndexedDB with metadata for staleness detection and LRU eviction.
 *
 * Properties:
 * - key: Unique cache identifier
 * - repositoryId: GitHub repository (format: "owner/repo")
 * - dataType: Type of cached data (PRs, deployments, commits)
 * - dateRange: Time period covered by this cache entry
 * - data: Serialized JSON payload
 * - cachedAt: When data was cached
 * - expiresAt: TTL expiration timestamp
 * - lastAccessedAt: For LRU eviction strategy
 * - sizeBytes: Estimated bytes for quota management
 * - isRevalidating: Background refresh in progress
 *
 * Validation rules:
 * - expiresAt must be after cachedAt
 * - sizeBytes must be positive integer
 * - key must match format: "repo:{repositoryId}:type:{dataType}:range:{start}:{end}"
 *
 * Invariants:
 * - Once created, key and repositoryId are immutable
 * - lastAccessedAt updates on every read operation (via touch())
 * - isRevalidating flag prevents duplicate background fetches
 */
export class CachedDataEntry {
  private constructor(
    public readonly key: CacheKey,
    public readonly repositoryId: string,
    public readonly dataType: DataType,
    public readonly dateRange: DateRange,
    public readonly data: unknown,
    public readonly cachedAt: Date,
    public readonly expiresAt: Date,
    public readonly lastAccessedAt: Date,
    public readonly sizeBytes: number,
    public readonly isRevalidating: boolean,
  ) {}

  /**
   * Create a new CachedDataEntry with validation
   *
   * @param repositoryId - Repository identifier (format: "owner/repo")
   * @param dataType - Type of data being cached
   * @param dateRange - Time period covered by this cache
   * @param data - Actual data to cache (will be serialized)
   * @param ttlMs - Time-to-live in milliseconds
   * @returns Result with CachedDataEntry or error
   */
  static create(
    repositoryId: string,
    dataType: DataType,
    dateRange: DateRange,
    data: unknown,
    ttlMs: number,
  ): Result<CachedDataEntry> {
    // Validate repository ID
    if (!repositoryId || !repositoryId.includes("/")) {
      return err(new Error("Repository ID must be in format 'owner/repo'"));
    }

    // Validate TTL
    if (ttlMs <= 0) {
      return err(new Error("TTL must be positive"));
    }

    // Create cache key
    const keyResult = CacheKey.create(repositoryId, dataType, dateRange);
    if (!keyResult.ok) {
      return err(new Error(keyResult.error));
    }

    // Calculate timestamps
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    // Estimate size (serialize data to JSON and measure)
    const serialized = JSON.stringify(data);
    const sizeBytes = new Blob([serialized]).size;

    // Validate size
    if (sizeBytes <= 0) {
      return err(new Error("Data size must be positive"));
    }

    return ok(
      new CachedDataEntry(
        keyResult.value,
        repositoryId,
        dataType,
        dateRange,
        data,
        now,
        expiresAt,
        now, // lastAccessedAt initially same as cachedAt
        sizeBytes,
        false, // Not revalidating initially
      ),
    );
  }

  /**
   * Deserialize from IndexedDB storage
   *
   * @param raw - Raw object from IndexedDB
   * @returns Result with CachedDataEntry or error
   */
  static fromStorage(raw: {
    key: string;
    repositoryId: string;
    dataType: DataType;
    dateRange: { start: string; end: string };
    data: unknown;
    cachedAt: string;
    expiresAt: string;
    lastAccessedAt: string;
    sizeBytes: number;
    isRevalidating: boolean;
  }): Result<CachedDataEntry> {
    // Parse cache key
    const keyResult = CacheKey.parse(raw.key);
    if (!keyResult.ok) {
      return err(new Error(keyResult.error));
    }

    // Parse dates
    const cachedAt = new Date(raw.cachedAt);
    const expiresAt = new Date(raw.expiresAt);
    const lastAccessedAt = new Date(raw.lastAccessedAt);
    const start = new Date(raw.dateRange.start);
    const end = new Date(raw.dateRange.end);

    // Validate dates
    if (
      isNaN(cachedAt.getTime()) ||
      isNaN(expiresAt.getTime()) ||
      isNaN(lastAccessedAt.getTime()) ||
      isNaN(start.getTime()) ||
      isNaN(end.getTime())
    ) {
      return err(new Error("Invalid date format in cached data"));
    }

    // Create DateRange (bypass validation since it's already stored)
    // Use private constructor directly via type assertion
    const dateRange = new (DateRange as unknown as {
      new (start: Date, end: Date): DateRange;
    })(start, end);

    return ok(
      new CachedDataEntry(
        keyResult.value,
        raw.repositoryId,
        raw.dataType,
        dateRange,
        raw.data,
        cachedAt,
        expiresAt,
        lastAccessedAt,
        raw.sizeBytes,
        raw.isRevalidating,
      ),
    );
  }

  /**
   * Check if cached data is stale (expired)
   *
   * @returns true if current time > expiresAt
   */
  isStale(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Update lastAccessedAt timestamp (for LRU eviction)
   *
   * Returns a new CachedDataEntry instance with updated timestamp.
   * Original instance remains immutable.
   *
   * @returns New CachedDataEntry with updated lastAccessedAt
   */
  touch(): CachedDataEntry {
    return new CachedDataEntry(
      this.key,
      this.repositoryId,
      this.dataType,
      this.dateRange,
      this.data,
      this.cachedAt,
      this.expiresAt,
      new Date(), // Updated lastAccessedAt
      this.sizeBytes,
      this.isRevalidating,
    );
  }

  /**
   * Mark as revalidating (background refresh started)
   *
   * @returns New CachedDataEntry with isRevalidating = true
   */
  startRevalidation(): CachedDataEntry {
    return new CachedDataEntry(
      this.key,
      this.repositoryId,
      this.dataType,
      this.dateRange,
      this.data,
      this.cachedAt,
      this.expiresAt,
      this.lastAccessedAt,
      this.sizeBytes,
      true, // Mark as revalidating
    );
  }

  /**
   * Mark as finished revalidating and update data
   *
   * @param newData - Fresh data from API
   * @param newTtlMs - New TTL in milliseconds
   * @returns New CachedDataEntry with updated data and timestamps
   */
  finishRevalidation(newData: unknown, newTtlMs: number): CachedDataEntry {
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + newTtlMs);
    const serialized = JSON.stringify(newData);
    const newSizeBytes = new Blob([serialized]).size;

    return new CachedDataEntry(
      this.key,
      this.repositoryId,
      this.dataType,
      this.dateRange,
      newData, // Updated data
      now, // Updated cachedAt
      newExpiresAt, // Updated expiresAt
      now, // Updated lastAccessedAt
      newSizeBytes, // Updated size
      false, // Revalidation complete
    );
  }

  /**
   * Serialize for IndexedDB storage
   *
   * @returns Plain object suitable for IndexedDB
   */
  toStorage(): {
    key: string;
    repositoryId: string;
    dataType: DataType;
    dateRange: { start: string; end: string };
    data: unknown;
    cachedAt: string;
    expiresAt: string;
    lastAccessedAt: string;
    sizeBytes: number;
    isRevalidating: boolean;
  } {
    return {
      key: this.key.value,
      repositoryId: this.repositoryId,
      dataType: this.dataType,
      dateRange: {
        start: this.dateRange.start.toISOString(),
        end: this.dateRange.end.toISOString(),
      },
      data: this.data,
      cachedAt: this.cachedAt.toISOString(),
      expiresAt: this.expiresAt.toISOString(),
      lastAccessedAt: this.lastAccessedAt.toISOString(),
      sizeBytes: this.sizeBytes,
      isRevalidating: this.isRevalidating,
    };
  }
}
