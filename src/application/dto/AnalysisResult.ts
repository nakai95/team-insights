import { ContributorDto } from "./ContributorDto";

/**
 * DTO for successful repository analysis response
 * Used by Server Actions and API routes
 */
export interface AnalysisResult {
  analysis: {
    id: string;
    repositoryUrl: string;
    analyzedAt: string; // ISO 8601 timestamp
    dateRange: {
      start: string;
      end: string;
    };
    status: "completed";
  };
  contributors: ContributorDto[];
  summary: {
    totalContributors: number;
    totalCommits: number;
    totalPullRequests: number;
    totalReviewComments: number;
    analysisTimeMs: number;
  };
}

/**
 * Error codes for analysis failures
 */
export const AnalysisErrorCode = {
  INVALID_URL: "INVALID_URL",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  AUTH_REQUIRED: "AUTH_REQUIRED", // Alias for clearer client-side handling
  SESSION_EXPIRED: "SESSION_EXPIRED", // Session expiration during active use
  REPO_NOT_FOUND: "REPO_NOT_FOUND",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  CLONE_FAILED: "CLONE_FAILED",
  ANALYSIS_TIMEOUT: "ANALYSIS_TIMEOUT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
export type AnalysisErrorCode =
  (typeof AnalysisErrorCode)[keyof typeof AnalysisErrorCode];

/**
 * DTO for analysis error responses
 */
export interface AnalysisError {
  code: AnalysisErrorCode;
  message: string;
  details?: unknown;
}
