import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createSessionProvider } from "../SessionProviderFactory";
import { EnvTokenAdapter } from "../EnvTokenAdapter";
import { NextAuthAdapter } from "../NextAuthAdapter";

// Mock Octokit - required for EnvTokenAdapter
vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn(function (this: any) {
    this.rest = {
      users: {
        getAuthenticated: vi.fn(),
      },
    };
    return this;
  }),
}));

// Mock next-auth modules - required for NextAuthAdapter initialization
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    auth: vi.fn(),
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock("next-auth/providers/github", () => ({
  default: vi.fn(),
}));

describe("SessionProviderFactory", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalGitHubToken = process.env.GITHUB_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original values
    (process.env as { NODE_ENV?: string }).NODE_ENV = originalNodeEnv;
    (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN =
      originalGitHubToken;
  });

  describe("createSessionProvider", () => {
    it("should return NextAuthAdapter when GITHUB_TOKEN is not set", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      // Delete the property completely to simulate it not being set
      const env = process.env as { GITHUB_TOKEN?: string };
      delete env.GITHUB_TOKEN;

      const provider = createSessionProvider();

      expect(provider).toBeInstanceOf(NextAuthAdapter);
    });

    it("should return EnvTokenAdapter when GITHUB_TOKEN is set in development", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN =
        "ghp_validToken123";

      const provider = createSessionProvider();

      expect(provider).toBeInstanceOf(EnvTokenAdapter);
    });

    it("should return EnvTokenAdapter when GITHUB_TOKEN is set in test mode", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN =
        "ghp_validToken123";

      const provider = createSessionProvider();

      expect(provider).toBeInstanceOf(EnvTokenAdapter);
    });

    it("should throw error when GITHUB_TOKEN is set in production", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN =
        "ghp_validToken123";

      expect(() => createSessionProvider()).toThrow(
        "GITHUB_TOKEN can only be used in development or test mode",
      );
    });

    it("should throw error with detailed message for production mode", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN =
        "ghp_validToken123";

      expect(() => createSessionProvider()).toThrow(
        "For production, use OAuth authentication",
      );
    });

    it("should return NextAuthAdapter when GITHUB_TOKEN is empty string", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN = "";

      const provider = createSessionProvider();

      expect(provider).toBeInstanceOf(NextAuthAdapter);
    });

    it("should return NextAuthAdapter when GITHUB_TOKEN is undefined", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      // Delete the property completely to simulate it not being set
      const env = process.env as { GITHUB_TOKEN?: string };
      delete env.GITHUB_TOKEN;

      const provider = createSessionProvider();

      expect(provider).toBeInstanceOf(NextAuthAdapter);
    });

    it("should prioritize GITHUB_TOKEN over OAuth configuration", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN =
        "ghp_validToken123";
      process.env.AUTH_GITHUB_ID = "oauth_client_id";
      process.env.AUTH_GITHUB_SECRET = "oauth_client_secret";
      process.env.AUTH_SECRET = "oauth_secret_key_min_32_characters_long";

      const provider = createSessionProvider();

      // Should return EnvTokenAdapter, not NextAuthAdapter
      expect(provider).toBeInstanceOf(EnvTokenAdapter);
    });

    it("should handle missing NODE_ENV (treat as non-dev/test)", () => {
      // When NODE_ENV is undefined and GITHUB_TOKEN is set, it should throw
      const env = process.env as { NODE_ENV?: string; GITHUB_TOKEN?: string };
      delete env.NODE_ENV;
      env.GITHUB_TOKEN = "ghp_validToken123";

      // Factory checks if nodeEnv !== "development" && nodeEnv !== "test"
      // undefined fails both checks, so it should throw
      expect(() => createSessionProvider()).toThrow(
        "GITHUB_TOKEN can only be used in development or test mode",
      );
    });
  });

  describe("edge cases", () => {
    it("should handle whitespace-only GITHUB_TOKEN as invalid format", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN = "   ";

      // Whitespace is truthy, so factory will try to create EnvTokenAdapter
      // EnvTokenAdapter constructor will validate the format and throw
      expect(() => createSessionProvider()).toThrow(
        "Invalid GitHub token format",
      );
    });

    it("should work when called multiple times", () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      (process.env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN =
        "ghp_validToken123";

      const provider1 = createSessionProvider();
      const provider2 = createSessionProvider();

      // Should create new instances each time
      expect(provider1).toBeInstanceOf(EnvTokenAdapter);
      expect(provider2).toBeInstanceOf(EnvTokenAdapter);
      expect(provider1).not.toBe(provider2);
    });
  });
});
