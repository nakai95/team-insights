import { describe, it, expect, beforeEach } from "vitest";
import { OctokitAdapter } from "../OctokitAdapter";
import { MockSessionProvider } from "../../auth/__mocks__/MockSessionProvider";

/**
 * OctokitAdapter Unit Tests
 *
 * These tests verify that the OctokitAdapter correctly uses the ISessionProvider
 * to retrieve access tokens. Full GitHub API integration is tested in E2E tests.
 *
 * Note: We focus on session provider integration rather than mocking the entire
 * Octokit library, as that would be brittle and not test the real integration.
 */
describe("OctokitAdapter", () => {
  let mockSessionProvider: MockSessionProvider;
  let adapter: OctokitAdapter;

  beforeEach(() => {
    mockSessionProvider = new MockSessionProvider("ghp_testToken123");
    adapter = new OctokitAdapter(mockSessionProvider);
  });

  describe("Session Provider Integration", () => {
    it("should be constructed with a valid session provider", () => {
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(OctokitAdapter);
    });

    it("should return error when no session is available for validateAccess", async () => {
      mockSessionProvider.clearToken();

      const result = await adapter.validateAccess("owner", "repo");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("No active session");
      }
    });

    it("should return error when no session is available for getPullRequests", async () => {
      mockSessionProvider.clearToken();

      const result = await adapter.getPullRequests("owner", "repo");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("No active session");
      }
    });

    it("should return error when no session is available for getReviewComments", async () => {
      mockSessionProvider.clearToken();

      const result = await adapter.getReviewComments("owner", "repo", [1]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("No active session");
      }
    });

    it("should return error when no session is available for getRateLimitStatus", async () => {
      mockSessionProvider.clearToken();

      const result = await adapter.getRateLimitStatus();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("No active session");
      }
    });

    it("should handle session provider with valid token", async () => {
      // Verify the session provider returns a valid token
      const tokenResult = await mockSessionProvider.getAccessToken();
      expect(tokenResult.ok).toBe(true);
      if (tokenResult.ok) {
        expect(tokenResult.value).toBe("ghp_testToken123");
      }
    });

    it("should handle session provider with error state", async () => {
      mockSessionProvider.setError("Session expired");

      const tokenResult = await mockSessionProvider.getAccessToken();
      expect(tokenResult.ok).toBe(false);
      if (!tokenResult.ok) {
        expect(tokenResult.error.message).toContain("Session expired");
      }
    });
  });
});
