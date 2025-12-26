import { describe, it, expect, beforeEach, vi } from "vitest";
import { OctokitAdapter } from "../OctokitAdapter";
import { MockSessionProvider } from "../../auth/__mocks__/MockSessionProvider";

// Create mock functions that will be used by the mock Octokit instance
const mockReposGet = vi.fn();
const mockReposListCommits = vi.fn();
const mockReposGetCommit = vi.fn();
const mockPullsList = vi.fn();
const mockPullsGet = vi.fn();
const mockPullsListReviewComments = vi.fn();
const mockRateLimitGet = vi.fn();

// Mock the Octokit class
vi.mock("@octokit/rest", () => {
  return {
    Octokit: class MockOctokit {
      rest = {
        repos: {
          get: mockReposGet,
          listCommits: mockReposListCommits,
          getCommit: mockReposGetCommit,
        },
        pulls: {
          list: mockPullsList,
          get: mockPullsGet,
          listReviewComments: mockPullsListReviewComments,
        },
        rateLimit: {
          get: mockRateLimitGet,
        },
      };
    },
  };
});

/**
 * OctokitAdapter Unit Tests
 *
 * These tests verify OctokitAdapter's functionality:
 * - Session provider integration
 * - Error handling for different API error scenarios
 * - Data transformation from GitHub API to domain models
 * - Rate limiting behavior
 */
describe("OctokitAdapter", () => {
  let mockSessionProvider: MockSessionProvider;
  let adapter: OctokitAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionProvider = new MockSessionProvider("ghp_testToken123");
    adapter = new OctokitAdapter(mockSessionProvider);
  });

  describe("validateAccess", () => {
    it("should return success when repository access is valid", async () => {
      mockReposGet.mockResolvedValue({
        data: { id: 123, name: "test-repo" },
      });

      const result = await adapter.validateAccess("owner", "repo");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
      expect(mockReposGet).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
      });
    });

    it("should return error when session is not available", async () => {
      mockSessionProvider.clearToken();

      const result = await adapter.validateAccess("owner", "repo");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("No active session");
      }
    });

    it("should return error for 401 unauthorized", async () => {
      mockReposGet.mockRejectedValue({
        status: 401,
        message: "Unauthorized",
      });

      const result = await adapter.validateAccess("owner", "repo");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Invalid GitHub token");
      }
    });

    it("should return error for 404 not found", async () => {
      mockReposGet.mockRejectedValue({
        status: 404,
        message: "Not Found",
      });

      const result = await adapter.validateAccess("owner", "repo");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Repository not found");
      }
    });

    it("should return error for 403 forbidden", async () => {
      mockReposGet.mockRejectedValue({
        status: 403,
        message: "Forbidden",
      });

      const result = await adapter.validateAccess("owner", "repo");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "You do not have permission to access this repository",
        );
      }
    });
  });

  describe("getPullRequests", () => {
    beforeEach(() => {
      // Mock rate limit to avoid rate limiting behavior
      mockRateLimitGet.mockResolvedValue({
        data: {
          rate: {
            limit: 5000,
            remaining: 4999,
            reset: Math.floor(Date.now() / 1000) + 3600,
          },
        },
      });
    });

    it("should return empty array when no PRs exist", async () => {
      mockPullsList.mockResolvedValue({
        data: [],
      });

      const result = await adapter.getPullRequests("owner", "repo");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it("should fetch and transform open PRs correctly", async () => {
      mockPullsList.mockResolvedValue({
        data: [
          {
            number: 1,
            title: "Test PR",
            user: { login: "testuser" },
            created_at: "2024-01-01T00:00:00Z",
            state: "open",
            merged_at: null,
          },
        ],
      });

      const result = await adapter.getPullRequests("owner", "repo");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]).toEqual({
          number: 1,
          title: "Test PR",
          author: "testuser",
          createdAt: new Date("2024-01-01T00:00:00Z"),
          state: "open",
          reviewCommentCount: 0,
        });
      }
    });

    it("should fetch detailed stats for merged PRs", async () => {
      mockPullsList.mockResolvedValue({
        data: [
          {
            number: 2,
            title: "Merged PR",
            user: { login: "testuser" },
            created_at: "2024-01-01T00:00:00Z",
            state: "closed",
            merged_at: "2024-01-02T00:00:00Z",
          },
        ],
      });

      mockPullsGet.mockResolvedValue({
        data: {
          additions: 100,
          deletions: 50,
          changed_files: 5,
        },
      });

      const result = await adapter.getPullRequests("owner", "repo");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]).toEqual({
          number: 2,
          title: "Merged PR",
          author: "testuser",
          createdAt: new Date("2024-01-01T00:00:00Z"),
          state: "merged",
          reviewCommentCount: 0,
          mergedAt: new Date("2024-01-02T00:00:00Z"),
          additions: 100,
          deletions: 50,
          changedFiles: 5,
        });
      }
      expect(mockPullsGet).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        pull_number: 2,
      });
    });

    it("should filter PRs by sinceDate", async () => {
      mockPullsList.mockResolvedValue({
        data: [
          {
            number: 1,
            title: "Recent PR",
            user: { login: "testuser" },
            created_at: "2024-01-10T00:00:00Z",
            state: "open",
            merged_at: null,
          },
          {
            number: 2,
            title: "Old PR",
            user: { login: "testuser" },
            created_at: "2024-01-01T00:00:00Z",
            state: "open",
            merged_at: null,
          },
        ],
      });

      const sinceDate = new Date("2024-01-05T00:00:00Z");
      const result = await adapter.getPullRequests("owner", "repo", sinceDate);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.number).toBe(1);
      }
    });

    it("should return error when session is not available", async () => {
      mockSessionProvider.clearToken();

      const result = await adapter.getPullRequests("owner", "repo");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("No active session");
      }
    });

    it("should handle 403 permission error", async () => {
      mockPullsList.mockRejectedValue({
        status: 403,
        message: "Forbidden",
      });

      const result = await adapter.getPullRequests("owner", "repo");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "You do not have permission to access this repository",
        );
      }
    });

    it("should handle 404 not found error", async () => {
      mockPullsList.mockRejectedValue({
        status: 404,
        message: "Not Found",
      });

      const result = await adapter.getPullRequests("owner", "repo");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Repository not found");
      }
    });
  });

  describe("getReviewComments", () => {
    beforeEach(() => {
      // Mock rate limit to avoid rate limiting behavior
      mockRateLimitGet.mockResolvedValue({
        data: {
          rate: {
            limit: 5000,
            remaining: 4999,
            reset: Math.floor(Date.now() / 1000) + 3600,
          },
        },
      });
    });

    it("should return empty array when no comments exist", async () => {
      mockPullsListReviewComments.mockResolvedValue({
        data: [],
      });

      const result = await adapter.getReviewComments("owner", "repo", [1]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it("should fetch and transform review comments correctly", async () => {
      mockPullsListReviewComments.mockResolvedValue({
        data: [
          {
            id: 123,
            user: { login: "reviewer" },
            created_at: "2024-01-01T00:00:00Z",
            body: "Please fix this",
          },
        ],
      });

      const result = await adapter.getReviewComments("owner", "repo", [1]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]).toEqual({
          id: 123,
          author: "reviewer",
          createdAt: new Date("2024-01-01T00:00:00Z"),
          body: "Please fix this",
          pullRequestNumber: 1,
        });
      }
    });

    it("should fetch comments for multiple PRs", async () => {
      mockPullsListReviewComments
        .mockResolvedValueOnce({
          data: [
            {
              id: 1,
              user: { login: "reviewer1" },
              created_at: "2024-01-01T00:00:00Z",
              body: "Comment on PR 1",
            },
          ],
        })
        .mockResolvedValueOnce({
          data: [
            {
              id: 2,
              user: { login: "reviewer2" },
              created_at: "2024-01-02T00:00:00Z",
              body: "Comment on PR 2",
            },
          ],
        });

      const result = await adapter.getReviewComments("owner", "repo", [1, 2]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]?.pullRequestNumber).toBe(1);
        expect(result.value[1]?.pullRequestNumber).toBe(2);
      }
    });

    it("should return error when session is not available", async () => {
      mockSessionProvider.clearToken();

      const result = await adapter.getReviewComments("owner", "repo", [1]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("No active session");
      }
    });

    it("should handle 403 permission error", async () => {
      mockPullsListReviewComments.mockRejectedValue({
        status: 403,
        message: "Forbidden",
      });

      const result = await adapter.getReviewComments("owner", "repo", [1]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "You do not have permission to access this repository",
        );
      }
    });
  });

  describe("getRateLimitStatus", () => {
    it("should fetch and transform rate limit info correctly", async () => {
      const resetTimestamp = Math.floor(Date.now() / 1000) + 3600;
      mockRateLimitGet.mockResolvedValue({
        data: {
          rate: {
            limit: 5000,
            remaining: 4999,
            reset: resetTimestamp,
          },
        },
      });

      const result = await adapter.getRateLimitStatus();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({
          limit: 5000,
          remaining: 4999,
          resetAt: new Date(resetTimestamp * 1000),
        });
      }
    });

    it("should return error when session is not available", async () => {
      mockSessionProvider.clearToken();

      const result = await adapter.getRateLimitStatus();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("No active session");
      }
    });

    it("should handle API error", async () => {
      mockRateLimitGet.mockRejectedValue({
        message: "API Error",
      });

      const result = await adapter.getRateLimitStatus();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Failed to fetch rate limit status",
        );
      }
    });
  });

  describe("getLog", () => {
    beforeEach(() => {
      // Mock rate limit to avoid rate limiting behavior
      mockRateLimitGet.mockResolvedValue({
        data: {
          rate: {
            limit: 5000,
            remaining: 4999,
            reset: Math.floor(Date.now() / 1000) + 3600,
          },
        },
      });
    });

    it("should parse GitHub URL correctly", async () => {
      mockReposListCommits.mockResolvedValue({
        data: [],
      });

      const result = await adapter.getLog("https://github.com/owner/repo");

      expect(result.ok).toBe(true);
      expect(mockReposListCommits).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "owner",
          repo: "repo",
        }),
      );
    });

    it("should return error for invalid GitHub URL", async () => {
      const result = await adapter.getLog("invalid-url");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Invalid GitHub URL");
      }
    });

    it("should fetch and transform commits correctly", async () => {
      mockReposListCommits.mockResolvedValue({
        data: [
          {
            sha: "abc123",
            commit: {
              author: {
                name: "Test Author",
                email: "test@example.com",
                date: "2024-01-01T00:00:00Z",
              },
              message: "Test commit\nDetailed description",
            },
            parents: [{ sha: "parent123" }],
          },
        ],
      });

      mockReposGetCommit.mockResolvedValue({
        data: {
          files: [
            {
              filename: "test.ts",
              additions: 10,
              deletions: 5,
            },
          ],
        },
      });

      const result = await adapter.getLog("https://github.com/owner/repo");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]).toEqual({
          hash: "abc123",
          author: "Test Author",
          email: "test@example.com",
          date: new Date("2024-01-01T00:00:00Z"),
          message: "Test commit",
          filesChanged: 1,
          linesAdded: 10,
          linesDeleted: 5,
        });
      }
    });

    it("should skip merge commits", async () => {
      mockReposListCommits.mockResolvedValue({
        data: [
          {
            sha: "merge123",
            commit: {
              author: {
                name: "Test Author",
                email: "test@example.com",
                date: "2024-01-01T00:00:00Z",
              },
              message: "Merge branch",
            },
            parents: [{ sha: "parent1" }, { sha: "parent2" }], // Multiple parents = merge commit
          },
        ],
      });

      const result = await adapter.getLog("https://github.com/owner/repo");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0); // Merge commit should be skipped
      }
    });

    it("should return error when session is not available", async () => {
      mockSessionProvider.clearToken();

      const result = await adapter.getLog("https://github.com/owner/repo");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("No active session");
      }
    });

    it("should handle 403 rate limit error", async () => {
      mockReposListCommits.mockRejectedValue({
        status: 403,
        message: "Rate limit exceeded",
      });

      const result = await adapter.getLog("https://github.com/owner/repo");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("rate limit");
      }
    });

    it("should handle 404 not found error", async () => {
      mockReposListCommits.mockRejectedValue({
        status: 404,
        message: "Not Found",
      });

      const result = await adapter.getLog("https://github.com/owner/repo");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Repository not found");
      }
    });
  });
});
