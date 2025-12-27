import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { EnvTokenAdapter } from "../EnvTokenAdapter";

// Create mock function for getAuthenticated
const mockGetAuthenticated = vi.fn();

// Mock Octokit - only mock external API calls, not logging
vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn(function (this: any) {
    this.rest = {
      users: {
        getAuthenticated: mockGetAuthenticated,
      },
    };
    return this;
  }),
}));

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
      mockGetAuthenticated.mockResolvedValue({
        data: {
          login: "testuser",
          name: "Test User",
          email: "test@example.com",
          id: 12345,
        },
      } as any);

      const adapter = new EnvTokenAdapter();
      const result = await adapter.getAccessToken();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(validToken);
      }
    });

    it("should cache user info after first fetch", async () => {
      mockGetAuthenticated.mockResolvedValue({
        data: {
          login: "testuser",
          name: "Test User",
          email: "test@example.com",
          id: 12345,
        },
      } as any);

      const adapter = new EnvTokenAdapter();

      // First call
      await adapter.getAccessToken();
      // Second call
      await adapter.getAccessToken();

      // Should only fetch once
      expect(mockGetAuthenticated).toHaveBeenCalledTimes(1);
    });

    it("should return error for invalid token (401)", async () => {
      mockGetAuthenticated.mockRejectedValue(
        new Error("Request failed with status code 401"),
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
      mockGetAuthenticated.mockRejectedValue(
        new Error("Request failed with status code 403"),
      );

      const adapter = new EnvTokenAdapter();
      const result = await adapter.getAccessToken();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("lacks required permissions");
        expect(result.error.message).toContain("read:user, user:email, repo");
      }
    });

    it("should return error for network failures", async () => {
      mockGetAuthenticated.mockRejectedValue(new Error("Network error"));

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
      mockGetAuthenticated.mockRejectedValue("String error");

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
        email: "test@example.com",
        id: 12345,
      };

      mockGetAuthenticated.mockResolvedValue({
        data: mockUserData,
      } as any);

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

      mockGetAuthenticated.mockRejectedValue(
        new Error("Request failed with status code 401"),
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
