import { Result, ok, err } from "@/lib/result";
import { IStoragePort } from "@/domain/interfaces/IStoragePort";

/**
 * LocalStorage adapter for browser-based storage
 * Implements IStoragePort using browser's localStorage API
 */
export class LocalStorageAdapter implements IStoragePort {
  private readonly prefix: string;

  constructor(prefix = "team-insights") {
    this.prefix = prefix;
  }

  /**
   * Check if localStorage is available
   */
  private isAvailable(): boolean {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return false;
      }
      // Test localStorage access
      const testKey = `${this.prefix}:test`;
      window.localStorage.setItem(testKey, "test");
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get full storage key with prefix
   */
  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async save<T>(key: string, value: T): Promise<Result<void>> {
    try {
      if (!this.isAvailable()) {
        return err(new Error("localStorage is not available"));
      }

      const fullKey = this.getKey(key);
      const serialized = JSON.stringify(value);
      window.localStorage.setItem(fullKey, serialized);

      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to save to localStorage: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async load<T>(key: string): Promise<Result<T | null>> {
    try {
      if (!this.isAvailable()) {
        return err(new Error("localStorage is not available"));
      }

      const fullKey = this.getKey(key);
      const stored = window.localStorage.getItem(fullKey);

      if (stored === null) {
        return ok(null);
      }

      const parsed = JSON.parse(stored) as T;
      return ok(parsed);
    } catch (error) {
      return err(
        new Error(
          `Failed to load from localStorage: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async remove(key: string): Promise<Result<void>> {
    try {
      if (!this.isAvailable()) {
        return err(new Error("localStorage is not available"));
      }

      const fullKey = this.getKey(key);
      window.localStorage.removeItem(fullKey);

      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to remove from localStorage: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async exists(key: string): Promise<Result<boolean>> {
    try {
      if (!this.isAvailable()) {
        return err(new Error("localStorage is not available"));
      }

      const fullKey = this.getKey(key);
      const exists = window.localStorage.getItem(fullKey) !== null;

      return ok(exists);
    } catch (error) {
      return err(
        new Error(
          `Failed to check localStorage: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}
