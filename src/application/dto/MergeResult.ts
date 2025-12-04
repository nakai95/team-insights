import { ContributorDto } from "./ContributorDto";

/**
 * Success result DTO for merge operation
 */
export interface MergeResult {
  merge: {
    id: string;
    primaryContributorId: string;
    mergedContributorIds: string[];
    createdAt: string;
  };
  mergedContributor: ContributorDto;
}

/**
 * Error codes for merge operation
 */
export const MergeErrorCode = {
  CONTRIBUTOR_NOT_FOUND: "CONTRIBUTOR_NOT_FOUND",
  DUPLICATE_MERGE: "DUPLICATE_MERGE",
  INVALID_MERGE: "INVALID_MERGE",
  STORAGE_ERROR: "STORAGE_ERROR",
  INVALID_URL: "INVALID_URL",
} as const;

export type MergeErrorCode =
  (typeof MergeErrorCode)[keyof typeof MergeErrorCode];

/**
 * Error result DTO for merge operation
 */
export interface MergeError {
  code: MergeErrorCode;
  message: string;
  details?: unknown;
}
