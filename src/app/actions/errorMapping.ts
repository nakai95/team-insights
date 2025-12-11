import { AnalysisErrorCode } from "@/application/dto/AnalysisResult";

/**
 * Represents a pattern matcher for error messages
 */
interface ErrorPattern {
  /** The error code to return when this pattern matches */
  code: AnalysisErrorCode;
  /**
   * Matcher function that tests if the error message matches this pattern
   * Receives the lowercased error message
   */
  matches: (message: string) => boolean;
}

/**
 * Configuration-based error pattern matching
 * Patterns are evaluated in order - first match wins
 */
const ERROR_PATTERNS: ReadonlyArray<ErrorPattern> = [
  {
    code: AnalysisErrorCode.INVALID_URL,
    matches: (msg) => msg.includes("invalid") && msg.includes("url"),
  },
  {
    code: AnalysisErrorCode.INVALID_TOKEN,
    matches: (msg) => msg.includes("invalid") && msg.includes("token"),
  },
  {
    code: AnalysisErrorCode.REPO_NOT_FOUND,
    matches: (msg) => msg.includes("not found") || msg.includes("404"),
  },
  {
    code: AnalysisErrorCode.INSUFFICIENT_PERMISSIONS,
    matches: (msg) => msg.includes("permission") || msg.includes("403"),
  },
  {
    code: AnalysisErrorCode.RATE_LIMIT_EXCEEDED,
    matches: (msg) => msg.includes("rate limit"),
  },
  {
    code: AnalysisErrorCode.CLONE_FAILED,
    matches: (msg) => msg.includes("clone"),
  },
  {
    code: AnalysisErrorCode.ANALYSIS_TIMEOUT,
    matches: (msg) => msg.includes("timeout") || msg.includes("timed out"),
  },
];

/**
 * Map domain error messages to API error codes
 *
 * This function uses a configuration-based approach to match error messages
 * against known patterns. Patterns are evaluated in order, and the first
 * matching pattern determines the error code.
 *
 * @param errorMessage - The error message to classify
 * @returns The corresponding AnalysisErrorCode, or INTERNAL_ERROR if no pattern matches
 *
 * @example
 * mapErrorCode("Invalid URL format") // returns INVALID_URL
 * mapErrorCode("Repository not found") // returns REPO_NOT_FOUND
 * mapErrorCode("Unknown error") // returns INTERNAL_ERROR
 */
export function mapErrorCode(errorMessage: string): AnalysisErrorCode {
  const normalizedMessage = errorMessage.toLowerCase();

  // Find the first pattern that matches
  const matchedPattern = ERROR_PATTERNS.find((pattern) =>
    pattern.matches(normalizedMessage),
  );

  // Return the matched code or fallback to INTERNAL_ERROR
  return matchedPattern?.code ?? AnalysisErrorCode.INTERNAL_ERROR;
}
