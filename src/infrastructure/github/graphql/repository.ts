/**
 * Repository Access GraphQL Query and Types
 *
 * This module contains the query and types for validating repository access.
 */

/**
 * Query to validate repository access
 */
export const REPOSITORY_ACCESS_QUERY = `
  query ValidateRepoAccess($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      id
    }
  }
`;

/**
 * Repository access validation response
 */
export interface RepositoryAccessResponse {
  repository: {
    id: string;
  };
}
