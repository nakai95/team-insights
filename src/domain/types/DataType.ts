/**
 * DataType enum using string literal pattern
 *
 * Represents types of data that can be cached and loaded progressively.
 *
 * @example
 * const type = DataType.PULL_REQUESTS;
 * // instead of hardcoded: "pull_requests"
 */
export const DataType = {
  PULL_REQUESTS: "pull_requests",
  DEPLOYMENTS: "deployments",
  COMMITS: "commits",
} as const;

export type DataType = (typeof DataType)[keyof typeof DataType];
