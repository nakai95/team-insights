/**
 * Collection utility functions for grouping and transforming arrays
 */

/**
 * Groups an array of items by a key extracted from each item.
 *
 * @template T - The type of items in the array
 * @template K - The type of the key (must be string or number for Map keys)
 * @param items - The array of items to group
 * @param keyFn - Function that extracts the grouping key from each item
 * @returns A Map where keys are the extracted keys and values are arrays of items
 *
 * @example
 * ```typescript
 * const users = [
 *   { name: 'Alice', age: 25 },
 *   { name: 'Bob', age: 25 },
 *   { name: 'Charlie', age: 30 }
 * ];
 *
 * const byAge = groupBy(users, user => user.age);
 * // Map { 25 => [Alice, Bob], 30 => [Charlie] }
 *
 * const commits = [
 *   { email: 'alice@example.com', message: 'fix' },
 *   { email: 'bob@example.com', message: 'feat' },
 *   { email: 'alice@example.com', message: 'docs' }
 * ];
 *
 * const byEmail = groupBy(commits, commit => commit.email.toLowerCase());
 * // Map { 'alice@example.com' => [fix, docs], 'bob@example.com' => [feat] }
 * ```
 */
export const groupBy = <T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K,
): Map<K, T[]> => {
  const grouped = new Map<K, T[]>();

  for (const item of items) {
    const key = keyFn(item);

    // Note: existing is a reference to the array in the Map
    // When we push to it, the Map's value is automatically updated
    const existing = grouped.get(key);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(key, [item]);
    }
  }

  return grouped;
};
