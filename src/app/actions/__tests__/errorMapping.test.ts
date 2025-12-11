import { describe, expect, it } from "vitest";
import { mapErrorCode } from "../errorMapping";
import { AnalysisErrorCode } from "@/application/dto/AnalysisResult";

describe("mapErrorCode", () => {
  describe("INVALID_URL mapping", () => {
    it.each([
      ["Invalid URL format", "Invalid URL format"],
      ["INVALID URL FORMAT", "INVALID URL FORMAT"], // case insensitive
      ["The url is invalid", "The url is invalid"],
      ["Invalid repository url provided", "Invalid repository url provided"],
    ])(
      "should map to INVALID_URL when message contains 'invalid' and 'url': %s",
      (_description, errorMessage) => {
        expect(mapErrorCode(errorMessage)).toBe(AnalysisErrorCode.INVALID_URL);
      },
    );
  });

  describe("INVALID_TOKEN mapping", () => {
    it.each([
      ["Invalid token provided", "Invalid token provided"],
      ["INVALID TOKEN", "INVALID TOKEN"], // case insensitive
      ["The token is invalid", "The token is invalid"],
      ["Invalid GitHub token format", "Invalid GitHub token format"],
    ])(
      "should map to INVALID_TOKEN when message contains 'invalid' and 'token': %s",
      (_description, errorMessage) => {
        expect(mapErrorCode(errorMessage)).toBe(
          AnalysisErrorCode.INVALID_TOKEN,
        );
      },
    );
  });

  describe("REPO_NOT_FOUND mapping", () => {
    it.each([
      ["Repository not found", "Repository not found"],
      ["NOT FOUND", "NOT FOUND"], // case insensitive
      ["The repository was not found", "The repository was not found"],
      ["Error: 404", "Error: 404"],
      ["HTTP 404 Not Found", "HTTP 404 Not Found"],
      ["404 response from server", "404 response from server"],
    ])(
      "should map to REPO_NOT_FOUND when message contains 'not found' or '404': %s",
      (_description, errorMessage) => {
        expect(mapErrorCode(errorMessage)).toBe(
          AnalysisErrorCode.REPO_NOT_FOUND,
        );
      },
    );
  });

  describe("INSUFFICIENT_PERMISSIONS mapping", () => {
    it.each([
      ["Insufficient permissions", "Insufficient permissions"],
      ["Permission denied", "Permission denied"],
      ["PERMISSION ERROR", "PERMISSION ERROR"], // case insensitive
      ["No permission to access", "No permission to access"],
      ["Error: 403", "Error: 403"],
      ["HTTP 403 Forbidden", "HTTP 403 Forbidden"],
      ["403 response from server", "403 response from server"],
    ])(
      "should map to INSUFFICIENT_PERMISSIONS when message contains 'permission' or '403': %s",
      (_description, errorMessage) => {
        expect(mapErrorCode(errorMessage)).toBe(
          AnalysisErrorCode.INSUFFICIENT_PERMISSIONS,
        );
      },
    );
  });

  describe("RATE_LIMIT_EXCEEDED mapping", () => {
    it.each([
      ["Rate limit exceeded", "Rate limit exceeded"],
      ["RATE LIMIT ERROR", "RATE LIMIT ERROR"], // case insensitive
      ["GitHub rate limit reached", "GitHub rate limit reached"],
      ["API rate limit exceeded", "API rate limit exceeded"],
    ])(
      "should map to RATE_LIMIT_EXCEEDED when message contains 'rate limit': %s",
      (_description, errorMessage) => {
        expect(mapErrorCode(errorMessage)).toBe(
          AnalysisErrorCode.RATE_LIMIT_EXCEEDED,
        );
      },
    );
  });

  describe("CLONE_FAILED mapping", () => {
    it.each([
      ["Failed to clone repository", "Failed to clone repository"],
      ["CLONE ERROR", "CLONE ERROR"], // case insensitive
      ["Git clone failed", "Git clone failed"],
      ["Unable to clone the repository", "Unable to clone the repository"],
    ])(
      "should map to CLONE_FAILED when message contains 'clone': %s",
      (_description, errorMessage) => {
        expect(mapErrorCode(errorMessage)).toBe(AnalysisErrorCode.CLONE_FAILED);
      },
    );
  });

  describe("ANALYSIS_TIMEOUT mapping", () => {
    it.each([
      ["Analysis timeout", "Analysis timeout"],
      ["TIMEOUT ERROR", "TIMEOUT ERROR"], // case insensitive
      ["Request timeout", "Request timeout"],
      ["Connection timeout occurred", "Connection timeout occurred"],
      ["Operation timed out", "Operation timed out"], // two words variant
      ["Request TIMED OUT", "Request TIMED OUT"], // case insensitive
    ])(
      "should map to ANALYSIS_TIMEOUT when message contains 'timeout' or 'timed out': %s",
      (_description, errorMessage) => {
        expect(mapErrorCode(errorMessage)).toBe(
          AnalysisErrorCode.ANALYSIS_TIMEOUT,
        );
      },
    );
  });

  describe("INTERNAL_ERROR fallback", () => {
    it.each([
      ["Unknown error", "Unknown error"],
      ["Something went wrong", "Something went wrong"],
      ["Unexpected error occurred", "Unexpected error occurred"],
      ["Database connection failed", "Database connection failed"],
      ["Random error message", "Random error message"],
      ["", ""], // empty string
    ])(
      "should map to INTERNAL_ERROR for unmatched messages: %s",
      (_description, errorMessage) => {
        expect(mapErrorCode(errorMessage)).toBe(
          AnalysisErrorCode.INTERNAL_ERROR,
        );
      },
    );
  });

  describe("Edge cases and priority", () => {
    it("should prioritize INVALID_URL over INVALID_TOKEN when both 'invalid' and 'url' are present", () => {
      // This tests the current behavior where the first matching condition wins
      expect(mapErrorCode("Invalid URL format")).toBe(
        AnalysisErrorCode.INVALID_URL,
      );
    });

    it("should prioritize 'not found' over '404' when both are present", () => {
      // Both patterns should map to the same code anyway
      expect(mapErrorCode("Repository not found (404)")).toBe(
        AnalysisErrorCode.REPO_NOT_FOUND,
      );
    });

    it("should prioritize 'permission' over '403' when both are present", () => {
      // Both patterns should map to the same code anyway
      expect(mapErrorCode("Permission denied (403)")).toBe(
        AnalysisErrorCode.INSUFFICIENT_PERMISSIONS,
      );
    });

    it("should handle messages with multiple error indicators", () => {
      // When multiple patterns match, the first one in the if-chain wins
      expect(mapErrorCode("Invalid URL and clone failed with timeout")).toBe(
        AnalysisErrorCode.INVALID_URL,
      );
    });
  });
});
