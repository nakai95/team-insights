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
const mockGraphql = vi.fn();

// Mock the Octokit class
vi.mock("@octokit/rest", () => {
  return {
    Octokit: class MockOctokit {
      graphql = mockGraphql;
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

// Helper function to create mock GraphQL response for pull requests
interface MockPRNode {
  number?: number;
  title?: string;
  author?: { login: string } | null;
  createdAt?: string;
  state?: "OPEN" | "CLOSED" | "MERGED";
  mergedAt?: string | null;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
  reviews?: { totalCount: number };
  comments?: {
    nodes: Array<{
      id: string;
      author: { login: string } | null;
      createdAt: string;
      body: string;
    }>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

function createMockGraphQLPRResponse(
  prs: MockPRNode[],
  pageInfo?: { hasNextPage: boolean; endCursor: string | null },
) {
  return {
    repository: {
      pullRequests: {
        nodes: prs.map((pr) => ({
          number: pr.number ?? 1,
          title: pr.title ?? "Test PR",
          author: pr.author ?? { login: "testuser" },
          createdAt: pr.createdAt ?? "2024-01-01T00:00:00Z",
          state: pr.state ?? "OPEN",
          mergedAt: pr.mergedAt ?? null,
          additions: pr.additions ?? 0,
          deletions: pr.deletions ?? 0,
          changedFiles: pr.changedFiles ?? 0,
          reviews: pr.reviews ?? { totalCount: 0 },
          comments: pr.comments ?? {
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        })),
        pageInfo: pageInfo ?? { hasNextPage: false, endCursor: null },
      },
    },
    rateLimit: {
      limit: 5000,
      cost: 1,
      remaining: 4999,
      resetAt: new Date(Date.now() + 3600000).toISOString(),
    },
  };
}

// Helper function to create mock GraphQL response for commits
function createMockGraphQLCommitsResponse(
  commits: Array<{
    oid?: string;
    author?: { name: string; email: string; date: string } | null;
    message?: string;
    additions?: number;
    deletions?: number;
    changedFilesIfAvailable?: number;
    parents?: { totalCount: number };
  }>,
  pageInfo?: { hasNextPage: boolean; endCursor: string | null },
) {
  return {
    repository: {
      defaultBranchRef: {
        target: {
          history: {
            nodes: commits.map((commit) => ({
              oid: commit.oid ?? "abc123",
              author: commit.author ?? {
                name: "Test Author",
                email: "test@example.com",
                date: "2024-01-01T00:00:00Z",
              },
              message: commit.message ?? "Test commit",
              additions: commit.additions ?? 0,
              deletions: commit.deletions ?? 0,
              changedFilesIfAvailable: commit.changedFilesIfAvailable ?? 0,
              parents: commit.parents ?? { totalCount: 1 },
            })),
            pageInfo: pageInfo ?? { hasNextPage: false, endCursor: null },
          },
        },
      },
    },
    rateLimit: {
      limit: 5000,
      cost: 1,
      remaining: 4999,
      resetAt: new Date(Date.now() + 3600000).toISOString(),
    },
  };
}

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
      mockGraphql.mockResolvedValue(createMockGraphQLPRResponse([]));

      const result = await adapter.getPullRequests("owner", "repo");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it("should fetch and transform open PRs correctly", async () => {
      mockGraphql.mockResolvedValue(
        createMockGraphQLPRResponse([
          {
            number: 1,
            title: "Test PR",
            author: { login: "testuser" },
            createdAt: "2024-01-01T00:00:00Z",
            state: "OPEN",
          },
        ]),
      );

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
          additions: 0,
          deletions: 0,
          changedFiles: 0,
        });
      }
    });

    it("should fetch detailed stats for merged PRs", async () => {
      mockGraphql.mockResolvedValue(
        createMockGraphQLPRResponse([
          {
            number: 2,
            title: "Merged PR",
            author: { login: "testuser" },
            createdAt: "2024-01-01T00:00:00Z",
            state: "MERGED",
            mergedAt: "2024-01-02T00:00:00Z",
            additions: 100,
            deletions: 50,
            changedFiles: 5,
          },
        ]),
      );

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
    });

    it("should handle cursor-based pagination correctly", async () => {
      // First page with cursor
      mockGraphql
        .mockResolvedValueOnce(
          createMockGraphQLPRResponse([{ number: 1, title: "PR 1" }], {
            hasNextPage: true,
            endCursor: "cursor123",
          }),
        )
        // Second page, no more pages
        .mockResolvedValueOnce(
          createMockGraphQLPRResponse([{ number: 2, title: "PR 2" }], {
            hasNextPage: false,
            endCursor: null,
          }),
        );

      const result = await adapter.getPullRequests("owner", "repo");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]?.number).toBe(1);
        expect(result.value[1]?.number).toBe(2);
      }

      // Verify pagination was called correctly
      expect(mockGraphql).toHaveBeenCalledTimes(2);
      expect(mockGraphql).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        expect.objectContaining({
          owner: "owner",
          repo: "repo",
          first: 100,
          after: null,
        }),
      );
      expect(mockGraphql).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        expect.objectContaining({
          owner: "owner",
          repo: "repo",
          first: 100,
          after: "cursor123",
        }),
      );
    });

    it("should filter PRs by sinceDate", async () => {
      mockGraphql.mockResolvedValue(
        createMockGraphQLPRResponse([
          {
            number: 1,
            title: "Recent PR",
            createdAt: "2024-01-10T00:00:00Z",
            state: "OPEN",
          },
          {
            number: 2,
            title: "Old PR",
            createdAt: "2024-01-01T00:00:00Z",
            state: "OPEN",
          },
        ]),
      );

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
      mockGraphql.mockRejectedValue({
        errors: [{ type: "FORBIDDEN" }],
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
      mockGraphql.mockRejectedValue({
        errors: [{ type: "NOT_FOUND" }],
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
      mockGraphql.mockResolvedValue({
        repository: {
          pullRequest: {
            number: 1,
            comments: {
              nodes: [],
              pageInfo: {
                hasNextPage: false,
                endCursor: null,
              },
            },
          },
        },
        rateLimit: {
          limit: 5000,
          cost: 1,
          remaining: 4999,
          resetAt: new Date(Date.now() + 3600000).toISOString(),
        },
      });

      const result = await adapter.getReviewComments("owner", "repo", [1]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it("should fetch and transform review comments correctly", async () => {
      mockGraphql.mockResolvedValue({
        repository: {
          pullRequest: {
            number: 1,
            comments: {
              nodes: [
                {
                  id: "123",
                  author: { login: "reviewer" },
                  createdAt: "2024-01-01T00:00:00Z",
                  body: "Please fix this",
                },
              ],
              pageInfo: {
                hasNextPage: false,
                endCursor: null,
              },
            },
          },
        },
        rateLimit: {
          limit: 5000,
          cost: 1,
          remaining: 4999,
          resetAt: new Date(Date.now() + 3600000).toISOString(),
        },
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
      mockGraphql
        .mockResolvedValueOnce({
          repository: {
            pullRequest: {
              number: 1,
              comments: {
                nodes: [
                  {
                    id: "1",
                    author: { login: "reviewer1" },
                    createdAt: "2024-01-01T00:00:00Z",
                    body: "Comment on PR 1",
                  },
                ],
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null,
                },
              },
            },
          },
          rateLimit: {
            limit: 5000,
            cost: 1,
            remaining: 4999,
            resetAt: new Date(Date.now() + 3600000).toISOString(),
          },
        })
        .mockResolvedValueOnce({
          repository: {
            pullRequest: {
              number: 2,
              comments: {
                nodes: [
                  {
                    id: "2",
                    author: { login: "reviewer2" },
                    createdAt: "2024-01-02T00:00:00Z",
                    body: "Comment on PR 2",
                  },
                ],
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null,
                },
              },
            },
          },
          rateLimit: {
            limit: 5000,
            cost: 1,
            remaining: 4998,
            resetAt: new Date(Date.now() + 3600000).toISOString(),
          },
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
      mockGraphql.mockRejectedValue({
        errors: [
          {
            type: "FORBIDDEN",
            message: "Resource not accessible by integration",
          },
        ],
      });

      const result = await adapter.getReviewComments("owner", "repo", [1]);

      // With parallel batching, errors don't fail the entire request
      // The method returns ok=true but with 0 comments and logs errors
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0); // No comments returned due to error
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
    it("should parse GitHub URL correctly", async () => {
      mockGraphql.mockResolvedValue(createMockGraphQLCommitsResponse([]));

      const result = await adapter.getLog("https://github.com/owner/repo");

      expect(result.ok).toBe(true);
      expect(mockGraphql).toHaveBeenCalledWith(
        expect.any(String),
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
      mockGraphql.mockResolvedValue(
        createMockGraphQLCommitsResponse([
          {
            oid: "abc123",
            author: {
              name: "Test Author",
              email: "test@example.com",
              date: "2024-01-01T00:00:00Z",
            },
            message: "Test commit\nDetailed description",
            additions: 10,
            deletions: 5,
            changedFilesIfAvailable: 1,
            parents: { totalCount: 1 },
          },
        ]),
      );

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
      mockGraphql.mockResolvedValue(
        createMockGraphQLCommitsResponse([
          {
            oid: "merge123",
            author: {
              name: "Test Author",
              email: "test@example.com",
              date: "2024-01-01T00:00:00Z",
            },
            message: "Merge branch",
            parents: { totalCount: 2 }, // Multiple parents = merge commit
          },
        ]),
      );

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
      mockGraphql.mockRejectedValue({
        errors: [{ type: "FORBIDDEN", message: "Rate limit exceeded" }],
      });

      const result = await adapter.getLog("https://github.com/owner/repo");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "You do not have permission to access this repository",
        );
      }
    });

    it("should handle 404 not found error", async () => {
      mockGraphql.mockRejectedValue({
        errors: [{ type: "NOT_FOUND", message: "Repository not found" }],
      });

      const result = await adapter.getLog("https://github.com/owner/repo");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Repository not found");
      }
    });
  });

  describe("Parallel Batching Helper Functions", () => {
    describe("createBatches", () => {
      it("should split 165 items into 11 batches of 15", () => {
        const items = Array.from({ length: 165 }, (_, i) => i + 1);
        // Access private method using bracket notation
        const batches = (adapter as any)["createBatches"](items, 15);

        expect(batches).toHaveLength(11);
        expect(batches[0]).toHaveLength(15);
        expect(batches[10]).toHaveLength(15);
        expect(batches[0][0]).toBe(1);
        expect(batches[10][14]).toBe(165);
      });

      it("should handle non-divisible batch sizes", () => {
        const items = Array.from({ length: 17 }, (_, i) => i + 1);
        const batches = (adapter as any)["createBatches"](items, 5);

        expect(batches).toHaveLength(4);
        expect(batches[0]).toHaveLength(5);
        expect(batches[3]).toHaveLength(2); // Last batch has remainder
        expect(batches[3][0]).toBe(16);
        expect(batches[3][1]).toBe(17);
      });

      it("should handle empty array", () => {
        const batches = (adapter as any)["createBatches"]([], 10);
        expect(batches).toHaveLength(0);
      });

      it("should create single batch when items less than batch size", () => {
        const items = [1, 2, 3];
        const batches = (adapter as any)["createBatches"](items, 10);

        expect(batches).toHaveLength(1);
        expect(batches[0]).toHaveLength(3);
        expect(batches[0]).toEqual([1, 2, 3]);
      });
    });

    describe("fetchCommentsForPR", () => {
      it("should fetch comments for single PR with pagination", async () => {
        // Mock first page with hasNextPage=true
        mockGraphql
          .mockResolvedValueOnce({
            repository: {
              pullRequest: {
                number: 1,
                comments: {
                  nodes: [
                    {
                      id: "1",
                      body: "Comment 1",
                      author: { login: "user1" },
                      createdAt: "2024-01-01T00:00:00Z",
                    },
                  ],
                  pageInfo: { hasNextPage: true, endCursor: "cursor1" },
                },
              },
            },
            rateLimit: {
              limit: 5000,
              cost: 1,
              remaining: 4999,
              resetAt: new Date(Date.now() + 3600000).toISOString(),
            },
          })
          .mockResolvedValueOnce({
            repository: {
              pullRequest: {
                number: 1,
                comments: {
                  nodes: [
                    {
                      id: "2",
                      body: "Comment 2",
                      author: { login: "user2" },
                      createdAt: "2024-01-02T00:00:00Z",
                    },
                  ],
                  pageInfo: { hasNextPage: false, endCursor: null },
                },
              },
            },
            rateLimit: {
              limit: 5000,
              cost: 1,
              remaining: 4998,
              resetAt: new Date(Date.now() + 3600000).toISOString(),
            },
          });

        const mockOctokit = { graphql: mockGraphql };
        const result = await (adapter as any)["fetchCommentsForPR"](
          mockOctokit,
          "owner",
          "repo",
          1,
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toHaveLength(2);
          expect(result.value[0].body).toBe("Comment 1");
          expect(result.value[1].body).toBe("Comment 2");
          expect(result.value[0].pullRequestNumber).toBe(1);
        }
        expect(mockGraphql).toHaveBeenCalledTimes(2);
      });

      it("should return error on GraphQL failure", async () => {
        mockGraphql.mockRejectedValueOnce(new Error("GraphQL error"));

        const mockOctokit = { graphql: mockGraphql };
        const result = await (adapter as any)["fetchCommentsForPR"](
          mockOctokit,
          "owner",
          "repo",
          1,
        );

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("Failed to fetch comments");
        }
      });

      it("should handle PR with no comments", async () => {
        mockGraphql.mockResolvedValueOnce({
          repository: {
            pullRequest: {
              number: 1,
              comments: {
                nodes: [],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          },
          rateLimit: {
            limit: 5000,
            cost: 1,
            remaining: 4999,
            resetAt: new Date(Date.now() + 3600000).toISOString(),
          },
        });

        const mockOctokit = { graphql: mockGraphql };
        const result = await (adapter as any)["fetchCommentsForPR"](
          mockOctokit,
          "owner",
          "repo",
          1,
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toHaveLength(0);
        }
      });
    });

    describe("fetchCommentsForBatch", () => {
      it("should fetch comments for multiple PRs in parallel", async () => {
        // Mock successful responses for all 3 PRs
        mockGraphql.mockResolvedValue({
          repository: {
            pullRequest: {
              number: 1,
              comments: {
                nodes: [
                  {
                    id: "1",
                    body: "Comment",
                    author: { login: "user" },
                    createdAt: "2024-01-01T00:00:00Z",
                  },
                ],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          },
          rateLimit: {
            limit: 5000,
            cost: 1,
            remaining: 4999,
            resetAt: new Date(Date.now() + 3600000).toISOString(),
          },
        });

        const mockOctokit = { graphql: mockGraphql };
        const { comments, errors } = await (adapter as any)[
          "fetchCommentsForBatch"
        ](mockOctokit, "owner", "repo", [1, 2, 3]);

        expect(comments).toHaveLength(3);
        expect(errors).toHaveLength(0);
        expect(mockGraphql).toHaveBeenCalledTimes(3);
      });

      it("should handle partial failures gracefully", async () => {
        // PR 1: success
        mockGraphql
          .mockResolvedValueOnce({
            repository: {
              pullRequest: {
                number: 1,
                comments: {
                  nodes: [
                    {
                      id: "1",
                      body: "Success",
                      author: { login: "user" },
                      createdAt: "2024-01-01T00:00:00Z",
                    },
                  ],
                  pageInfo: { hasNextPage: false, endCursor: null },
                },
              },
            },
            rateLimit: {
              limit: 5000,
              cost: 1,
              remaining: 4999,
              resetAt: new Date(Date.now() + 3600000).toISOString(),
            },
          })
          // PR 2: failure
          .mockRejectedValueOnce(new Error("Failed PR 2"))
          // PR 3: success
          .mockResolvedValueOnce({
            repository: {
              pullRequest: {
                number: 3,
                comments: {
                  nodes: [
                    {
                      id: "3",
                      body: "Success",
                      author: { login: "user" },
                      createdAt: "2024-01-03T00:00:00Z",
                    },
                  ],
                  pageInfo: { hasNextPage: false, endCursor: null },
                },
              },
            },
            rateLimit: {
              limit: 5000,
              cost: 1,
              remaining: 4998,
              resetAt: new Date(Date.now() + 3600000).toISOString(),
            },
          });

        const mockOctokit = { graphql: mockGraphql };
        const { comments, errors } = await (adapter as any)[
          "fetchCommentsForBatch"
        ](mockOctokit, "owner", "repo", [1, 2, 3]);

        expect(comments.length).toBeGreaterThan(0); // Some succeeded
        expect(errors).toHaveLength(1); // One failed
        expect(errors[0].message).toContain("Failed to fetch comments");
      });

      it("should handle empty PR list", async () => {
        const mockOctokit = { graphql: mockGraphql };
        const { comments, errors } = await (adapter as any)[
          "fetchCommentsForBatch"
        ](mockOctokit, "owner", "repo", []);

        expect(comments).toHaveLength(0);
        expect(errors).toHaveLength(0);
        expect(mockGraphql).not.toHaveBeenCalled();
      });
    });
  });

  describe("getReviewComments (parallel batching)", () => {
    it("should fetch comments for large PR list in batches", async () => {
      const prNumbers = Array.from({ length: 45 }, (_, i) => i + 1); // 3 batches of 15

      // Mock successful responses for all PRs
      mockGraphql.mockResolvedValue({
        repository: {
          pullRequest: {
            number: 1,
            comments: {
              nodes: [],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
        rateLimit: {
          limit: 5000,
          cost: 1,
          remaining: 4999,
          resetAt: new Date(Date.now() + 3600000).toISOString(),
        },
      });

      const result = await adapter.getReviewComments(
        "owner",
        "repo",
        prNumbers,
      );

      expect(result.ok).toBe(true);
      expect(mockGraphql).toHaveBeenCalledTimes(45); // All PRs fetched
    });

    it("should complete successfully with no errors for typical case", async () => {
      const prNumbers = [1, 2, 3];

      mockGraphql.mockResolvedValue({
        repository: {
          pullRequest: {
            number: 1,
            comments: {
              nodes: [
                {
                  id: "1",
                  body: "Test comment",
                  author: { login: "user" },
                  createdAt: "2024-01-01T00:00:00Z",
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
        rateLimit: {
          limit: 5000,
          cost: 1,
          remaining: 4999,
          resetAt: new Date(Date.now() + 3600000).toISOString(),
        },
      });

      const result = await adapter.getReviewComments(
        "owner",
        "repo",
        prNumbers,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(3); // One comment per PR
      }
    });

    it("should handle empty PR list", async () => {
      const result = await adapter.getReviewComments("owner", "repo", []);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
      expect(mockGraphql).not.toHaveBeenCalled();
    });
  });
});
