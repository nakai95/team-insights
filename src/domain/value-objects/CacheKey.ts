import { type Result, ok, err } from "@/lib/result";
import { type DataType } from "@/domain/types/DataType";
import { type DateRange } from "./DateRange";

/**
 * CacheKey value object
 *
 * Unique identifier for cache entries combining repository, data type, and date range.
 *
 * Format: "repo:{owner}/{name}:type:{dataType}:range:{startISO}:{endISO}"
 *
 * Example: "repo:facebook/react:type:pull_requests:range:2026-01-01T00:00:00.000Z:2026-01-31T23:59:59.999Z"
 */
export class CacheKey {
  private constructor(private readonly _value: string) {}

  /**
   * Create a CacheKey from components
   *
   * @param repositoryId - Repository identifier (format: "{owner}/{name}")
   * @param dataType - Type of cached data
   * @param dateRange - Time period covered
   * @returns Result with CacheKey or error message
   */
  static create(
    repositoryId: string,
    dataType: DataType,
    dateRange: DateRange,
  ): Result<CacheKey, string> {
    // Validate repository ID format
    if (!repositoryId || !repositoryId.includes("/")) {
      return err("Repository ID must be in format 'owner/name'");
    }

    const parts = repositoryId.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return err("Repository ID must have both owner and name");
    }

    // Validate repository ID contains only valid characters
    const validRepoRegex = /^[\w-]+\/[\w-]+$/;
    if (!validRepoRegex.test(repositoryId)) {
      return err(
        "Repository ID can only contain alphanumeric characters, hyphens, and underscores",
      );
    }

    // Construct key value
    const value = `repo:${repositoryId}:type:${dataType}:range:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;

    return ok(new CacheKey(value)) as Result<CacheKey, string>;
  }

  /**
   * Parse a cache key string
   *
   * @param value - Cache key string
   * @returns Result with CacheKey or error message
   */
  static parse(value: string): Result<CacheKey, string> {
    // Validate format with regex
    const regex =
      /^repo:([\w-]+\/[\w-]+):type:(pull_requests|deployments|commits):range:(\d{4}-\d{2}-\d{2}T[\d:.]+Z):(\d{4}-\d{2}-\d{2}T[\d:.]+Z)$/;

    const match = value.match(regex);
    if (!match || !match[3] || !match[4]) {
      return err(
        "Invalid cache key format. Expected: repo:{owner}/{name}:type:{dataType}:range:{startISO}:{endISO}",
      );
    }

    // Validate dates are parseable
    const startDate = new Date(match[3]);
    const endDate = new Date(match[4]);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return err("Cache key contains invalid date timestamps");
    }

    return ok(new CacheKey(value)) as Result<CacheKey, string>;
  }

  /**
   * Get the cache key value
   */
  get value(): string {
    return this._value;
  }

  /**
   * Check equality with another CacheKey
   *
   * @param other - Another CacheKey
   * @returns true if keys are identical
   */
  equals(other: CacheKey): boolean {
    return this._value === other._value;
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return this._value;
  }

  /**
   * Extract repository ID from cache key
   *
   * @returns Repository ID (format: "owner/name")
   */
  getRepositoryId(): string {
    const match = this._value.match(/^repo:([\w-]+\/[\w-]+):/);
    return match && match[1] ? match[1] : "";
  }

  /**
   * Extract data type from cache key
   *
   * @returns Data type string
   */
  getDataType(): string {
    const match = this._value.match(
      /:type:(pull_requests|deployments|commits):/,
    );
    return match && match[1] ? match[1] : "";
  }

  /**
   * Extract date range from cache key
   *
   * @returns Object with start and end dates
   */
  getDateRange(): { start: Date; end: Date } {
    const match = this._value.match(
      /:range:(\d{4}-\d{2}-\d{2}T[\d:.]+Z):(\d{4}-\d{2}-\d{2}T[\d:.]+Z)$/,
    );

    if (!match || !match[1] || !match[2]) {
      throw new Error("Invalid cache key format");
    }

    return {
      start: new Date(match[1]),
      end: new Date(match[2]),
    };
  }
}
