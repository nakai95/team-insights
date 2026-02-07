/**
 * Loading mode for repository analysis
 * - 'full': Fetch all data for the date range (existing behavior)
 * - 'progressive': Fetch initial 30-day data only, enable background loading
 */
export type AnalysisMode = "full" | "progressive";

/**
 * DTO for repository analysis request
 * Used by Server Actions and API routes
 */
export interface AnalysisRequest {
  repositoryUrl: string; // GitHub HTTPS URL
  dateRange?: {
    start: string; // ISO 8601 date string
    end: string; // ISO 8601 date string
  };
  /**
   * Loading mode (optional, defaults to 'full')
   * - 'full': Load all data for date range (existing behavior)
   * - 'progressive': Load initial 30-day data only, client handles background loading
   */
  mode?: AnalysisMode;
}
