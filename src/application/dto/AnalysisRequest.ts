/**
 * DTO for repository analysis request
 * Used by Server Actions and API routes
 */
export interface AnalysisRequest {
  repositoryUrl: string; // GitHub HTTPS URL
  githubToken: string; // Personal access token
  dateRange?: {
    start: string; // ISO 8601 date string
    end: string; // ISO 8601 date string
  };
}
