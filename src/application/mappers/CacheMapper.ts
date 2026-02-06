import { CachedDataEntry } from "@/domain/entities/CachedDataEntry";
import { DateRange } from "@/domain/value-objects/DateRange";
import { CacheKey } from "@/domain/value-objects/CacheKey";
import { DataType } from "@/domain/types/DataType";
import { CacheStatus } from "@/domain/types/CacheStatus";
import {
  CachedDataDTO,
  CacheStatsDTO,
  CacheOperationResultDTO,
} from "@/application/dto/CachedDataDTO";
import { Result, ok, err } from "@/lib/result";

/**
 * CacheMapper - Converts between domain entities and DTOs
 *
 * Handles bidirectional mapping for cached data, ensuring proper
 * serialization/deserialization between layers.
 */
export class CacheMapper {
  /**
   * Convert CachedDataEntry domain entity to DTO
   *
   * @param entry - Domain entity
   * @param status - Current cache status (computed based on staleness)
   * @returns DTO for application/presentation layer
   */
  static toDTO(entry: CachedDataEntry, status?: CacheStatus): CachedDataDTO {
    // Compute cache status if not provided
    const computedStatus = status ?? this.computeCacheStatus(entry);

    return {
      key: entry.key.value,
      repositoryId: entry.repositoryId,
      dataType: entry.dataType,
      dateRange: {
        start: entry.dateRange.start.toISOString(),
        end: entry.dateRange.end.toISOString(),
      },
      data: entry.data,
      metadata: {
        cachedAt: entry.cachedAt.toISOString(),
        expiresAt: entry.expiresAt.toISOString(),
        lastAccessedAt: entry.lastAccessedAt.toISOString(),
        size: entry.sizeBytes,
        isRevalidating: entry.isRevalidating,
        status: computedStatus,
      },
    };
  }

  /**
   * Convert DTO to CachedDataEntry domain entity
   *
   * @param dto - Data transfer object
   * @returns Result with domain entity or error
   */
  static toDomain(dto: CachedDataDTO): Result<CachedDataEntry> {
    try {
      // Parse cache key
      const keyResult = CacheKey.parse(dto.key);
      if (!keyResult.ok) {
        return err(new Error(`Invalid cache key: ${keyResult.error}`));
      }

      // Parse dates
      const cachedAt = new Date(dto.metadata.cachedAt);
      const expiresAt = new Date(dto.metadata.expiresAt);
      const lastAccessedAt = new Date(dto.metadata.lastAccessedAt);
      const startDate = new Date(dto.dateRange.start);
      const endDate = new Date(dto.dateRange.end);

      // Validate dates
      if (
        isNaN(cachedAt.getTime()) ||
        isNaN(expiresAt.getTime()) ||
        isNaN(lastAccessedAt.getTime()) ||
        isNaN(startDate.getTime()) ||
        isNaN(endDate.getTime())
      ) {
        return err(new Error("Invalid date format in DTO"));
      }

      // Create DateRange
      const dateRangeResult = DateRange.create(startDate, endDate);
      if (!dateRangeResult.ok) {
        return err(
          new Error(`Invalid date range: ${dateRangeResult.error.message}`),
        );
      }

      // Use fromStorage method which handles the construction properly
      return CachedDataEntry.fromStorage({
        key: dto.key,
        repositoryId: dto.repositoryId,
        dataType: dto.dataType,
        dateRange: {
          start: dto.dateRange.start,
          end: dto.dateRange.end,
        },
        data: dto.data,
        cachedAt: dto.metadata.cachedAt,
        expiresAt: dto.metadata.expiresAt,
        lastAccessedAt: dto.metadata.lastAccessedAt,
        sizeBytes: dto.metadata.size,
        isRevalidating: dto.metadata.isRevalidating,
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to convert DTO to domain entity: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Convert multiple entries to DTOs
   *
   * @param entries - Array of domain entities
   * @returns Array of DTOs
   */
  static toDTOs(entries: CachedDataEntry[]): CachedDataDTO[] {
    return entries.map((entry) => this.toDTO(entry));
  }

  /**
   * Convert multiple DTOs to domain entities
   *
   * @param dtos - Array of DTOs
   * @returns Result with array of domain entities or error
   */
  static toDomains(dtos: CachedDataDTO[]): Result<CachedDataEntry[]> {
    const entries: CachedDataEntry[] = [];
    const errors: Error[] = [];

    for (const dto of dtos) {
      const result = this.toDomain(dto);
      if (result.ok) {
        entries.push(result.value);
      } else {
        errors.push(result.error);
      }
    }

    if (errors.length > 0) {
      return err(
        new Error(
          `Failed to convert ${errors.length} DTOs: ${errors.map((e) => e.message).join(", ")}`,
        ),
      );
    }

    return ok(entries);
  }

  /**
   * Compute cache status based on entry state
   *
   * @param entry - Cache entry to check
   * @returns Computed cache status
   */
  static computeCacheStatus(entry: CachedDataEntry): CacheStatus {
    if (entry.isRevalidating) {
      return CacheStatus.REVALIDATING;
    }

    if (entry.isStale()) {
      return CacheStatus.HIT_STALE;
    }

    return CacheStatus.HIT_FRESH;
  }

  /**
   * Create cache stats DTO from domain data
   *
   * @param entries - All cache entries
   * @returns Cache statistics DTO
   */
  static toCacheStatsDTO(entries: CachedDataEntry[]): CacheStatsDTO {
    const totalSizeBytes = entries.reduce(
      (sum, entry) => sum + entry.sizeBytes,
      0,
    );

    const dates = entries.map((entry) => entry.cachedAt.getTime());
    const oldestTimestamp = dates.length > 0 ? Math.min(...dates) : null;
    const newestTimestamp = dates.length > 0 ? Math.max(...dates) : null;

    // Count entries by type
    const entriesByType = {
      prs: entries.filter((e) => e.dataType === DataType.PULL_REQUESTS).length,
      deployments: entries.filter((e) => e.dataType === DataType.DEPLOYMENTS)
        .length,
      commits: entries.filter((e) => e.dataType === DataType.COMMITS).length,
    };

    return {
      totalEntries: entries.length,
      totalSizeBytes,
      oldestEntry: oldestTimestamp
        ? new Date(oldestTimestamp).toISOString()
        : null,
      newestEntry: newestTimestamp
        ? new Date(newestTimestamp).toISOString()
        : null,
      entriesByType,
    };
  }

  /**
   * Create successful operation result DTO
   *
   * @param entriesAffected - Number of entries affected
   * @param sizeFreed - Size freed in bytes (optional)
   * @returns Success operation result
   */
  static toSuccessOperationDTO(
    entriesAffected: number,
    sizeFreed?: number,
  ): CacheOperationResultDTO {
    return {
      success: true,
      metadata: {
        entriesAffected,
        sizeFreed,
      },
    };
  }

  /**
   * Create failed operation result DTO
   *
   * @param error - Error message
   * @returns Failure operation result
   */
  static toErrorOperationDTO(error: string): CacheOperationResultDTO {
    return {
      success: false,
      error,
    };
  }

  /**
   * Extract data from cache entry with type safety
   *
   * @param entry - Cache entry
   * @returns Typed data payload
   */
  static extractData<T>(entry: CachedDataEntry): T {
    return entry.data as T;
  }

  /**
   * Create a new cache entry DTO for storage
   *
   * @param repositoryId - Repository identifier
   * @param dataType - Type of data
   * @param dateRange - Date range covered
   * @param data - Data payload
   * @param ttlMs - Time to live in milliseconds
   * @returns Result with CachedDataDTO or error
   */
  static createCacheDTO(
    repositoryId: string,
    dataType: DataType,
    dateRange: DateRange,
    data: unknown,
    ttlMs: number,
  ): Result<CachedDataDTO> {
    // Create domain entity first to validate
    const entryResult = CachedDataEntry.create(
      repositoryId,
      dataType,
      dateRange,
      data,
      ttlMs,
    );

    if (!entryResult.ok) {
      return err(entryResult.error);
    }

    // Convert to DTO
    return ok(this.toDTO(entryResult.value));
  }
}
