import { openDB, type IDBPDatabase } from "idb";
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
 * IndexedDBAdapter
 *
 * Primary cache repository implementation using IndexedDB for persistent client-side storage.
 *
 * Features:
 * - Persistent storage across browser sessions
 * - Large capacity (50-100MB typical browser quota)
 * - Automatic LRU eviction when approaching limits
 * - Stale entry cleanup
 * - Repository-scoped queries
 *
 * Database Schema:
 * - Store name: "cache-entries"
 * - Key path: "key" (CacheKey.value)
 * - Indexes:
 *   - "repositoryId": For repository-scoped queries
 *   - "lastAccessedAt": For LRU sorting
 *   - "expiresAt": For stale entry detection
 */
export class IndexedDBAdapter implements ICacheRepository {
  private db: IDBPDatabase | null = null;
  private readonly evictionService: CacheEvictionService;

  constructor() {
    this.evictionService = new CacheEvictionService();
  }

  /**
   * Initialize IndexedDB connection
   *
   * Must be called before using other methods
   *
   * @throws Error if IndexedDB is not supported or initialization fails
   */
  async init(): Promise<void> {
    try {
      this.db = await openDB(CacheConfig.DB_NAME, CacheConfig.DB_VERSION, {
        upgrade(db) {
          // Create object store with key path
          if (!db.objectStoreNames.contains(CacheConfig.STORE_NAME)) {
            const store = db.createObjectStore(CacheConfig.STORE_NAME, {
              keyPath: "key",
            });

            // Create indexes for efficient queries
            store.createIndex("repositoryId", "repositoryId", {
              unique: false,
            });
            store.createIndex("lastAccessedAt", "lastAccessedAt", {
              unique: false,
            });
            store.createIndex("expiresAt", "expiresAt", { unique: false });
          }
        },
      });
    } catch (error) {
      throw new Error(
        `Failed to initialize IndexedDB: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Ensure database is initialized
   *
   * @throws Error if database is not initialized
   */
  private ensureInitialized(): void {
    if (!this.db) {
      throw new Error("IndexedDB adapter not initialized. Call init() first.");
    }
  }

  async get(key: string): Promise<CachedDataEntry | null> {
    this.ensureInitialized();

    try {
      const raw = await this.db!.get(CacheConfig.STORE_NAME, key);

      if (!raw) {
        return null;
      }

      // Deserialize from storage
      const entryResult = CachedDataEntry.fromStorage(raw);

      if (!entryResult.ok) {
        console.warn(`Failed to deserialize cache entry: ${entryResult.error}`);
        // Delete invalid entry
        await this.delete(key);
        return null;
      }

      const entry = entryResult.value;

      // Touch entry to update lastAccessedAt (for LRU)
      const touched = entry.touch();
      await this.db!.put(CacheConfig.STORE_NAME, touched.toStorage());

      return touched;
    } catch (error) {
      console.error(`Failed to get cache entry: ${error}`);
      return null;
    }
  }

  async getByRepository(repositoryId: string): Promise<CachedDataEntry[]> {
    this.ensureInitialized();

    try {
      const index = this.db!.transaction(CacheConfig.STORE_NAME, "readonly")
        .objectStore(CacheConfig.STORE_NAME)
        .index("repositoryId");

      const rawEntries = await index.getAll(repositoryId);

      const entries: CachedDataEntry[] = [];

      for (const raw of rawEntries) {
        const result = CachedDataEntry.fromStorage(raw);
        if (result.ok) {
          entries.push(result.value);
        }
      }

      return entries;
    } catch (error) {
      console.error(`Failed to get entries by repository: ${error}`);
      return [];
    }
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
    this.ensureInitialized();

    try {
      // Store entry
      await this.db!.put(CacheConfig.STORE_NAME, entry.toStorage());

      // Check if eviction is needed
      await this.evictIfNeeded();
    } catch (error) {
      if (error instanceof Error && error.name === "QuotaExceededError") {
        // Storage quota exceeded - trigger aggressive eviction
        console.warn("Storage quota exceeded, triggering eviction");
        await this.evictIfNeeded(true);

        // Retry storage
        try {
          await this.db!.put(CacheConfig.STORE_NAME, entry.toStorage());
        } catch (retryError) {
          throw new Error(
            `Failed to store cache entry after eviction: ${retryError}`,
          );
        }
      } else {
        throw new Error(`Failed to store cache entry: ${error}`);
      }
    }
  }

  async setMany(entries: CachedDataEntry[]): Promise<void> {
    this.ensureInitialized();

    try {
      const tx = this.db!.transaction(CacheConfig.STORE_NAME, "readwrite");
      const store = tx.objectStore(CacheConfig.STORE_NAME);

      await Promise.all(entries.map((entry) => store.put(entry.toStorage())));

      await tx.done;

      // Check if eviction is needed after bulk insert
      await this.evictIfNeeded();
    } catch (error) {
      throw new Error(`Failed to store multiple cache entries: ${error}`);
    }
  }

  async evict(keys: string[]): Promise<void> {
    this.ensureInitialized();

    try {
      const tx = this.db!.transaction(CacheConfig.STORE_NAME, "readwrite");
      const store = tx.objectStore(CacheConfig.STORE_NAME);

      await Promise.all(keys.map((key) => store.delete(key)));

      await tx.done;
    } catch (error) {
      console.error(`Failed to evict cache entries: ${error}`);
    }
  }

  async evictStale(): Promise<number> {
    this.ensureInitialized();

    try {
      const allEntries = await this.getAll();
      const staleEntries = this.evictionService.getStaleEntries(allEntries);

      if (staleEntries.length > 0) {
        await this.evict(staleEntries.map((e) => e.key.value));
      }

      return staleEntries.length;
    } catch (error) {
      console.error(`Failed to evict stale entries: ${error}`);
      return 0;
    }
  }

  async delete(key: string): Promise<void> {
    this.ensureInitialized();

    try {
      await this.db!.delete(CacheConfig.STORE_NAME, key);
    } catch (error) {
      console.error(`Failed to delete cache entry: ${error}`);
    }
  }

  async clearRepository(repositoryId: string): Promise<void> {
    this.ensureInitialized();

    try {
      const entries = await this.getByRepository(repositoryId);
      await this.evict(entries.map((e) => e.key.value));
    } catch (error) {
      console.error(`Failed to clear repository cache: ${error}`);
    }
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();

    try {
      await this.db!.clear(CacheConfig.STORE_NAME);
    } catch (error) {
      console.error(`Failed to clear all cache: ${error}`);
    }
  }

  async getAll(): Promise<CachedDataEntry[]> {
    this.ensureInitialized();

    try {
      const rawEntries = await this.db!.getAll(CacheConfig.STORE_NAME);

      const entries: CachedDataEntry[] = [];

      for (const raw of rawEntries) {
        const result = CachedDataEntry.fromStorage(raw);
        if (result.ok) {
          entries.push(result.value);
        }
      }

      return entries;
    } catch (error) {
      console.error(`Failed to get all cache entries: ${error}`);
      return [];
    }
  }

  async getStats(): Promise<CacheStats> {
    this.ensureInitialized();

    try {
      const allEntries = await this.getAll();

      if (allEntries.length === 0) {
        return {
          totalEntries: 0,
          totalSizeBytes: 0,
          oldestEntry: null,
          newestEntry: null,
        };
      }

      const totalSizeBytes = allEntries.reduce(
        (sum, e) => sum + e.sizeBytes,
        0,
      );

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
    } catch (error) {
      console.error(`Failed to get cache stats: ${error}`);
      return {
        totalEntries: 0,
        totalSizeBytes: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  async getTotalSize(): Promise<number> {
    const stats = await this.getStats();
    return stats.totalSizeBytes;
  }

  async getEntryCount(): Promise<number> {
    this.ensureInitialized();

    try {
      return await this.db!.count(CacheConfig.STORE_NAME);
    } catch (error) {
      console.error(`Failed to get entry count: ${error}`);
      return 0;
    }
  }

  /**
   * Check cache usage and evict entries if needed
   *
   * @param aggressive - If true, evict down to 50% capacity instead of 60%
   */
  private async evictIfNeeded(aggressive = false): Promise<void> {
    const totalSize = await this.getTotalSize();
    const totalCount = await this.getEntryCount();

    // Check if eviction is needed by size
    const shouldEvictBySize = this.evictionService.shouldEvict(
      totalSize,
      CacheConfig.MAX_CACHE_SIZE,
    );

    // Check if eviction is needed by count
    const shouldEvictByCount = this.evictionService.shouldEvictByCount(
      totalCount,
      CacheConfig.MAX_ENTRIES,
    );

    if (!shouldEvictBySize && !shouldEvictByCount) {
      return; // No eviction needed
    }

    // Get all entries for eviction calculation
    const allEntries = await this.getAll();

    // Calculate target size and count
    const targetSize = aggressive
      ? CacheConfig.MAX_CACHE_SIZE * 0.5 // 50% for aggressive eviction
      : CacheConfig.MAX_CACHE_SIZE * CacheConfig.EVICTION_TARGET; // 60% normally

    const targetCount = aggressive
      ? Math.floor(CacheConfig.MAX_ENTRIES * 0.5)
      : Math.floor(CacheConfig.MAX_ENTRIES * CacheConfig.EVICTION_TARGET);

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
        `Evicting ${candidateKeys.size} cache entries (size: ${(totalSize / 1024 / 1024).toFixed(2)}MB, count: ${totalCount})`,
      );
      await this.evict(Array.from(candidateKeys));
    }
  }
}
