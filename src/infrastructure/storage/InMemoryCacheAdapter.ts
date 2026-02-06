import {
  type ICacheRepository,
  type CacheStats,
} from "@/domain/interfaces/ICacheRepository";
import { CachedDataEntry } from "@/domain/entities/CachedDataEntry";
import { type DataType } from "@/domain/types/DataType";
import { type DateRange } from "@/domain/value-objects/DateRange";
import { CacheKey } from "@/domain/value-objects/CacheKey";
import {
  CacheEvictionService,
  CacheConfig,
} from "@/domain/services/CacheEvictionService";

/**
 * InMemoryCacheAdapter
 *
 * Fallback cache repository implementation using in-memory Map.
 *
 * Use cases:
 * - Safari private mode (IndexedDB unavailable)
 * - Storage quota exceeded
 * - IndexedDB initialization failure
 * - Testing environments
 *
 * Limitations:
 * - Non-persistent (cleared on page reload)
 * - Limited capacity (browser memory constraints)
 * - No cross-tab synchronization
 *
 * Features:
 * - Same interface as IndexedDBAdapter
 * - Automatic LRU eviction
 * - Stale entry cleanup
 * - Repository-scoped queries
 */
export class InMemoryCacheAdapter implements ICacheRepository {
  private cache: Map<string, CachedDataEntry>;
  private readonly evictionService: CacheEvictionService;

  constructor() {
    this.cache = new Map();
    this.evictionService = new CacheEvictionService();
  }

  async get(key: string): Promise<CachedDataEntry | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Touch entry to update lastAccessedAt (for LRU)
    const touched = entry.touch();
    this.cache.set(key, touched);

    return touched;
  }

  async getByRepository(repositoryId: string): Promise<CachedDataEntry[]> {
    const entries: CachedDataEntry[] = [];

    for (const entry of this.cache.values()) {
      if (entry.repositoryId === repositoryId) {
        entries.push(entry);
      }
    }

    return entries;
  }

  async getByDateRange(
    repositoryId: string,
    dataType: DataType,
    range: DateRange,
  ): Promise<CachedDataEntry | null> {
    // Create cache key for exact match
    const keyResult = CacheKey.create(repositoryId, dataType, range);

    if (!keyResult.ok) {
      return null;
    }

    return this.get(keyResult.value.value);
  }

  async set(entry: CachedDataEntry): Promise<void> {
    // Store entry
    this.cache.set(entry.key.value, entry);

    // Check if eviction is needed
    await this.evictIfNeeded();
  }

  async setMany(entries: CachedDataEntry[]): Promise<void> {
    for (const entry of entries) {
      this.cache.set(entry.key.value, entry);
    }

    // Check if eviction is needed after bulk insert
    await this.evictIfNeeded();
  }

  async evict(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.cache.delete(key);
    }
  }

  async evictStale(): Promise<number> {
    const allEntries = await this.getAll();
    const staleEntries = this.evictionService.getStaleEntries(allEntries);

    if (staleEntries.length > 0) {
      await this.evict(staleEntries.map((e) => e.key.value));
    }

    return staleEntries.length;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clearRepository(repositoryId: string): Promise<void> {
    const entries = await this.getByRepository(repositoryId);
    await this.evict(entries.map((e) => e.key.value));
  }

  async clearAll(): Promise<void> {
    this.cache.clear();
  }

  async getAll(): Promise<CachedDataEntry[]> {
    return Array.from(this.cache.values());
  }

  async getStats(): Promise<CacheStats> {
    const allEntries = await this.getAll();

    if (allEntries.length === 0) {
      return {
        totalEntries: 0,
        totalSizeBytes: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }

    const totalSizeBytes = allEntries.reduce((sum, e) => sum + e.sizeBytes, 0);

    const sortedByLastAccess = [...allEntries].sort(
      (a, b) => a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime(),
    );

    return {
      totalEntries: allEntries.length,
      totalSizeBytes,
      oldestEntry: sortedByLastAccess[0]?.lastAccessedAt ?? null,
      newestEntry:
        sortedByLastAccess[sortedByLastAccess.length - 1]?.lastAccessedAt ??
        null,
    };
  }

  async getTotalSize(): Promise<number> {
    const stats = await this.getStats();
    return stats.totalSizeBytes;
  }

  async getEntryCount(): Promise<number> {
    return this.cache.size;
  }

  /**
   * Check cache usage and evict entries if needed
   *
   * Memory-specific eviction strategy:
   * - Triggers at lower thresholds than IndexedDB (memory is more limited)
   * - Evicts more aggressively to prevent OOM
   */
  private async evictIfNeeded(): Promise<void> {
    const totalSize = await this.getTotalSize();
    const totalCount = await this.getEntryCount();

    // Use stricter limits for in-memory cache
    const memoryMaxSize = 10 * 1024 * 1024; // 10 MB (much lower than IndexedDB)
    const memoryMaxEntries = 200; // Fewer entries than IndexedDB

    // Check if eviction is needed by size
    const shouldEvictBySize = this.evictionService.shouldEvict(
      totalSize,
      memoryMaxSize,
    );

    // Check if eviction is needed by count
    const shouldEvictByCount = this.evictionService.shouldEvictByCount(
      totalCount,
      memoryMaxEntries,
    );

    if (!shouldEvictBySize && !shouldEvictByCount) {
      return; // No eviction needed
    }

    // Get all entries for eviction calculation
    const allEntries = await this.getAll();

    // Calculate target size and count (more aggressive eviction for memory)
    const targetSize = memoryMaxSize * 0.5; // Evict down to 50% capacity
    const targetCount = Math.floor(memoryMaxEntries * 0.5);

    // Calculate candidates by size and count
    const candidatesBySize = this.evictionService.calculateEvictionCandidates(
      allEntries,
      targetSize,
    );

    const candidatesByCount =
      this.evictionService.calculateEvictionCandidatesByCount(
        allEntries,
        targetCount,
      );

    // Merge candidates (union of both sets)
    const candidateKeys = new Set([
      ...candidatesBySize.map((e) => e.key.value),
      ...candidatesByCount.map((e) => e.key.value),
    ]);

    if (candidateKeys.size > 0) {
      console.log(
        `In-memory cache evicting ${candidateKeys.size} entries (size: ${(totalSize / 1024 / 1024).toFixed(2)}MB, count: ${totalCount})`,
      );
      await this.evict(Array.from(candidateKeys));
    }
  }
}
