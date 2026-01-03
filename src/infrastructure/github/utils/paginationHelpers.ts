/**
 * Pagination Utilities
 *
 * This module provides reusable utilities for handling GitHub GraphQL API pagination.
 * All GitHub GraphQL queries use cursor-based pagination with a consistent structure.
 */

/**
 * Standard pagination info from GitHub GraphQL API
 */
export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

/**
 * Split an array into batches of specified size
 * Used for parallel processing of large datasets
 *
 * @param items Array to split into batches
 * @param batchSize Size of each batch
 * @returns Array of batches
 *
 * @example
 * createBatches([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 */
export function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Check if pagination should continue based on pageInfo
 */
export function shouldContinuePagination(pageInfo: PageInfo): boolean {
  return pageInfo.hasNextPage && pageInfo.endCursor !== null;
}

/**
 * Get the next cursor for pagination
 * Returns null if pagination should stop
 */
export function getNextCursor(pageInfo: PageInfo): string | null {
  return shouldContinuePagination(pageInfo) ? pageInfo.endCursor : null;
}
