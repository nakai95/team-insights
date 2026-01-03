import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock @octokit/graphql BEFORE importing EnvTokenAdapter
vi.mock("@octokit/graphql");

import { graphql, GraphqlResponseError } from "@octokit/graphql";
import { EnvTokenAdapter } from "../EnvTokenAdapter";

const mockGraphql = vi.mocked(graphql);

// Helper to create GraphqlResponseError instances for testing
function createGraphqlError(
  message: string,
  status: string,
): GraphqlResponseError<Record<string, unknown>> {
  const proto = GraphqlResponseError.prototype;
  const error = Object.create(proto) as GraphqlResponseError<
    Record<string, unknown>
  >;
  Error.captureStackTrace(error, createGraphqlError);
  error.name = "GraphqlResponseError";
  error.message = message;
  (error as any).headers = { status };
  (error as any).request = { query: "", variables: {} };
  (error as any).response = { data: null, errors: [] };
  (error as any).errors = [];
  return error;
}

describe("EnvTokenAdapter", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalGitHubToken = process.env.GITHUB_TOKEN;
  const validToken = "ghp_validToken1234567890";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original values
    (process.env as { NODE_ENV?: string }).NODE_ENV = originalNodeEnv;
    (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN =
      originalGitHubToken;
  });

  describe("constructor", () => {
    it("should initialize successfully with valid token in development mode", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN = validToken;

      const adapter = new EnvTokenAdapter();
      expect(adapter).toBeInstanceOf(EnvTokenAdapter);
    });

    it("should initialize successfully with valid token in test mode", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN = validToken;

      const adapter = new EnvTokenAdapter();
      expect(adapter).toBeInstanceOf(EnvTokenAdapter);
    });

    it("should throw error when NODE_ENV is production", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN = validToken;

      expect(() => new EnvTokenAdapter()).toThrow(
        "EnvTokenAdapter can only be used in development or test mode",
      );
    });

    it("should throw error when GITHUB_TOKEN is not set", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      // Delete the property completely to simulate it not being set
      const env = process.env as { GITHUB_TOKEN?: string };
      delete env.GITHUB_TOKEN;

      expect(() => new EnvTokenAdapter()).toThrow(
        "GITHUB_TOKEN environment variable is not set",
      );
    });

    it("should throw error for invalid token format", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN =
        "invalid_token_format";

      expect(() => new EnvTokenAdapter()).toThrow(
        "Invalid GitHub token format",
      );
    });

    it("should accept token with ghp_ prefix", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN = "ghp_123456789";

      expect(() => new EnvTokenAdapter()).not.toThrow();
    });

    it("should accept token with gho_ prefix", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN = "gho_123456789";

      expect(() => new EnvTokenAdapter()).not.toThrow();
    });

    it("should accept token with ghs_ prefix", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN = "ghs_123456789";

      expect(() => new EnvTokenAdapter()).not.toThrow();
    });

    it("should accept token with github_pat_ prefix", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN =
        "github_pat_123456789";

      expect(() => new EnvTokenAdapter()).not.toThrow();
    });
  });

  describe("getAccessToken", () => {
    beforeEach(() => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN = validToken;
    });

    it("should return access token after fetching user info", async () => {
      mockGraphql.mockResolvedValue({
        viewer: {
          login: "testuser",
          name: "Test User",
          email: "test@example.com",
          id: 12345,
        },
      });

      const adapter = new EnvTokenAdapter();
      const result = await adapter.getAccessToken();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(validToken);
      }
    });

    it("should cache user info after first fetch", async () => {
      mockGraphql.mockResolvedValue({
        viewer: {
          login: "testuser",
          name: "Test User",
          email: "test@example.com",
          id: 12345,
        },
      });

      const adapter = new EnvTokenAdapter();

      // First call
      await adapter.getAccessToken();
      // Second call
      await adapter.getAccessToken();

      // Should only fetch once
      expect(mockGraphql).toHaveBeenCalledTimes(1);
    });

    it("should return error for invalid token (401)", async () => {
      mockGraphql.mockRejectedValue(
        createGraphqlError("Bad credentials", "401"),
      );

      const adapter = new EnvTokenAdapter();
      const result = await adapter.getAccessToken();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Invalid or expired GitHub token",
        );
      }
    });

    it("should return error for insufficient permissions (403)", async () => {
      mockGraphql.mockRejectedValue(createGraphqlError("Forbidden", "403"));

      const adapter = new EnvTokenAdapter();
      const result = await adapter.getAccessToken();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("lacks required permissions");
        expect(result.error.message).toContain("read:user, user:email, repo");
      }
    });

    it("should return error for network failures", async () => {
      mockGraphql.mockRejectedValue(new Error("Network error"));

      const adapter = new EnvTokenAdapter();
      const result = await adapter.getAccessToken();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Failed to validate GitHub token",
        );
      }
    });

    it("should handle non-Error exceptions", async () => {
      // Mock a non-Error rejection (e.g., a string or number)
      mockGraphql.mockRejectedValue("String error");

      const adapter = new EnvTokenAdapter();
      const result = await adapter.getAccessToken();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // When a non-Error is thrown, it gets caught and wrapped
        expect(result.error.message).toContain(
          "Failed to validate GitHub token",
        );
      }
    });
  });

  describe("getUserInfo", () => {
    beforeEach(() => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN = validToken;
    });

    it("should return undefined before user info is fetched", () => {
      const adapter = new EnvTokenAdapter();
      expect(adapter.getUserInfo()).toBeUndefined();
    });

    it("should return user info after successful fetch", async () => {
      const mockUserData = {
        login: "testuser",
        name: "Test User",
        id: 12345,
      };

      mockGraphql.mockResolvedValue({
        viewer: {
          login: "testuser",
          name: "Test User",
          id: 12345,
        },
      });

      const adapter = new EnvTokenAdapter();
      await adapter.getAccessToken();

      const userInfo = adapter.getUserInfo();
      expect(userInfo).toEqual(mockUserData);
    });
  });

  describe("token masking", () => {
    beforeEach(() => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    });

    it("should mask token in error messages", async () => {
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN =
        "ghp_1234567890abcdef";

      mockGraphql.mockRejectedValue(
        createGraphqlError("Bad credentials", "401"),
      );

      const adapter = new EnvTokenAdapter();
      const result = await adapter.getAccessToken();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Should contain masked token
        expect(result.error.message).toContain("ghp_***cdef");
        // Should NOT contain full token
        expect(result.error.message).not.toContain("ghp_1234567890abcdef");
      }
    });
  });
});
