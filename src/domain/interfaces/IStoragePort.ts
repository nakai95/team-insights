import { Result } from "@/lib/result";

export interface IStoragePort {
  /**
   * Save data to storage
   * @param key Storage key
   * @param value Data to store (will be JSON serialized)
   * @returns Result with save success status
   */
  save<T>(key: string, value: T): Promise<Result<void>>;

  /**
   * Load data from storage
   * @param key Storage key
   * @returns Result with loaded data or null if not found
   */
  load<T>(key: string): Promise<Result<T | null>>;

  /**
   * Remove data from storage
   * @param key Storage key
   * @returns Result with removal success status
   */
  remove(key: string): Promise<Result<void>>;

  /**
   * Check if key exists in storage
   * @param key Storage key
   * @returns Result with existence status
   */
  exists(key: string): Promise<Result<boolean>>;
}
