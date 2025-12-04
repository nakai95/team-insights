/**
 * Request DTO for merging contributor identities
 */
export interface MergeRequest {
  repositoryUrl: string;
  primaryContributorId: string;
  mergedContributorIds: string[];
}
