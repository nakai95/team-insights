import { describe, it, expect } from "vitest";
import { CalculateMetrics } from "../CalculateMetrics";
import { GitCommit } from "@/domain/interfaces/IGitOperations";
import { PullRequest, ReviewComment } from "@/domain/interfaces/IGitHubAPI";

describe("CalculateMetrics", () => {
  const calculateMetrics = new CalculateMetrics();

  describe("execute", () => {
    it("should successfully process empty input", async () => {
      const input = {
        commits: [],
        pullRequests: [],
        reviewComments: [],
      };

      const result = await calculateMetrics.execute(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.contributors).toEqual([]);
      }
    });

    it("should create contributor from commits", async () => {
      const commits: GitCommit[] = [
        {
          hash: "abc123",
          author: "John Doe",
          email: "john@example.com",
          date: new Date("2024-01-01"),
          message: "Initial commit",
          filesChanged: 5,
          linesAdded: 100,
          linesDeleted: 20,
        },
        {
          hash: "def456",
          author: "John Doe",
          email: "john@example.com",
          date: new Date("2024-01-02"),
          message: "Second commit",
          filesChanged: 3,
          linesAdded: 50,
          linesDeleted: 10,
        },
      ];

      const input = {
        commits,
        pullRequests: [],
        reviewComments: [],
      };

      const result = await calculateMetrics.execute(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.contributors).toHaveLength(1);
        const contributor = result.value.contributors[0];
        expect(contributor?.displayName).toBe("John Doe");
        expect(contributor?.primaryEmail.value).toBe("john@example.com");
        expect(contributor?.implementationActivity.commitCount).toBe(2);
        expect(contributor?.implementationActivity.linesAdded).toBe(150);
        expect(contributor?.implementationActivity.linesDeleted).toBe(30);
        expect(contributor?.implementationActivity.filesChanged).toBe(8);
      }
    });

    it("should aggregate commits by email (case-insensitive)", async () => {
      const commits: GitCommit[] = [
        {
          hash: "abc123",
          author: "John Doe",
          email: "John@Example.com",
          date: new Date("2024-01-01"),
          message: "First commit",
          filesChanged: 2,
          linesAdded: 50,
          linesDeleted: 5,
        },
        {
          hash: "def456",
          author: "John Doe",
          email: "john@example.com",
          date: new Date("2024-01-02"),
          message: "Second commit",
          filesChanged: 3,
          linesAdded: 75,
          linesDeleted: 10,
        },
      ];

      const input = {
        commits,
        pullRequests: [],
        reviewComments: [],
      };

      const result = await calculateMetrics.execute(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should be grouped into one contributor despite case difference
        expect(result.value.contributors).toHaveLength(1);
        const contributor = result.value.contributors[0];
        expect(contributor?.implementationActivity.commitCount).toBe(2);
        expect(contributor?.implementationActivity.linesAdded).toBe(125);
      }
    });

    it("should create separate contributors for different emails", async () => {
      const commits: GitCommit[] = [
        {
          hash: "abc123",
          author: "John Doe",
          email: "john@example.com",
          date: new Date("2024-01-01"),
          message: "Commit by John",
          filesChanged: 2,
          linesAdded: 50,
          linesDeleted: 5,
        },
        {
          hash: "def456",
          author: "Jane Smith",
          email: "jane@example.com",
          date: new Date("2024-01-02"),
          message: "Commit by Jane",
          filesChanged: 3,
          linesAdded: 75,
          linesDeleted: 10,
        },
      ];

      const input = {
        commits,
        pullRequests: [],
        reviewComments: [],
      };

      const result = await calculateMetrics.execute(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.contributors).toHaveLength(2);
        const johnContributor = result.value.contributors.find(
          (c) => c.displayName === "John Doe",
        );
        const janeContributor = result.value.contributors.find(
          (c) => c.displayName === "Jane Smith",
        );
        expect(johnContributor?.implementationActivity.commitCount).toBe(1);
        expect(janeContributor?.implementationActivity.commitCount).toBe(1);
      }
    });

    it("should calculate review activity from PRs and comments", async () => {
      const pullRequests: PullRequest[] = [
        {
          number: 1,
          title: "PR by Alice",
          author: "alice",
          createdAt: new Date("2024-01-01"),
          state: "merged",
          reviewCommentCount: 0,
        },
      ];

      const reviewComments: ReviewComment[] = [
        {
          id: 1,
          pullRequestNumber: 2, // Reviewing someone else's PR
          author: "alice",
          body: "Looks good",
          createdAt: new Date("2024-01-02"),
        },
        {
          id: 2,
          pullRequestNumber: 2,
          author: "alice",
          body: "Another comment",
          createdAt: new Date("2024-01-03"),
        },
      ];

      const input = {
        commits: [],
        pullRequests,
        reviewComments,
      };

      const result = await calculateMetrics.execute(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.contributors).toHaveLength(1);
        const contributor = result.value.contributors[0];
        expect(contributor?.reviewActivity.pullRequestCount).toBe(1);
        expect(contributor?.reviewActivity.reviewCommentCount).toBe(2);
        expect(contributor?.reviewActivity.pullRequestsReviewed).toBe(1);
      }
    });

    it("should exclude comments on own PRs from review metrics", async () => {
      const pullRequests: PullRequest[] = [
        {
          number: 1,
          title: "PR by Bob",
          author: "bob",
          createdAt: new Date("2024-01-01"),
          state: "merged",
          reviewCommentCount: 0,
        },
      ];

      const reviewComments: ReviewComment[] = [
        {
          id: 1,
          pullRequestNumber: 1, // Comment on own PR
          author: "bob",
          body: "Updating based on feedback",
          createdAt: new Date("2024-01-02"),
        },
        {
          id: 2,
          pullRequestNumber: 2, // Comment on someone else's PR
          author: "bob",
          body: "LGTM",
          createdAt: new Date("2024-01-03"),
        },
      ];

      const input = {
        commits: [],
        pullRequests,
        reviewComments,
      };

      const result = await calculateMetrics.execute(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.contributors).toHaveLength(1);
        const contributor = result.value.contributors[0];
        expect(contributor?.reviewActivity.pullRequestCount).toBe(1);
        // Only the comment on PR #2 should count
        expect(contributor?.reviewActivity.reviewCommentCount).toBe(1);
        expect(contributor?.reviewActivity.pullRequestsReviewed).toBe(1);
      }
    });

    it("should handle mixed commits, PRs, and comments", async () => {
      const commits: GitCommit[] = [
        {
          hash: "abc123",
          author: "Charlie",
          email: "charlie@example.com",
          date: new Date("2024-01-01"),
          message: "Feature implementation",
          filesChanged: 10,
          linesAdded: 200,
          linesDeleted: 50,
        },
      ];

      const pullRequests: PullRequest[] = [
        {
          number: 1,
          title: "Add feature",
          author: "charlie",
          createdAt: new Date("2024-01-02"),
          state: "merged",
          reviewCommentCount: 0,
        },
      ];

      const reviewComments: ReviewComment[] = [
        {
          id: 1,
          pullRequestNumber: 2,
          author: "charlie",
          body: "Code review comment",
          createdAt: new Date("2024-01-03"),
        },
      ];

      const input = {
        commits,
        pullRequests,
        reviewComments,
      };

      const result = await calculateMetrics.execute(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should handle both email and username identifiers
        // charlie@example.com from commits and "charlie" from PRs/comments
        expect(result.value.contributors.length).toBeGreaterThanOrEqual(1);

        // Find contributor by email
        const emailContributor = result.value.contributors.find(
          (c) => c.primaryEmail.value === "charlie@example.com",
        );
        expect(emailContributor?.implementationActivity.commitCount).toBe(1);

        // Find contributor by username
        const usernameContributor = result.value.contributors.find(
          (c) => c.displayName === "charlie",
        );
        expect(usernameContributor?.reviewActivity.pullRequestCount).toBe(1);
      }
    });

    it("should handle commits with zero changes", async () => {
      const commits: GitCommit[] = [
        {
          hash: "abc123",
          author: "Dave",
          email: "dave@example.com",
          date: new Date("2024-01-01"),
          message: "Empty commit",
          filesChanged: 0,
          linesAdded: 0,
          linesDeleted: 0,
        },
      ];

      const input = {
        commits,
        pullRequests: [],
        reviewComments: [],
      };

      const result = await calculateMetrics.execute(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.contributors).toHaveLength(1);
        const contributor = result.value.contributors[0];
        expect(contributor?.implementationActivity.commitCount).toBe(1);
        expect(contributor?.implementationActivity.linesAdded).toBe(0);
        expect(contributor?.implementationActivity.linesDeleted).toBe(0);
        expect(contributor?.implementationActivity.filesChanged).toBe(0);
      }
    });

    it("should handle large numbers of commits", async () => {
      // Create 100 commits for the same contributor
      const commits: GitCommit[] = Array.from({ length: 100 }, (_, i) => ({
        hash: `commit${i}`,
        author: "Prolific Coder",
        email: "prolific@example.com",
        date: new Date(`2024-01-${(i % 30) + 1}`),
        message: `Commit ${i}`,
        filesChanged: i % 10,
        linesAdded: i * 10,
        linesDeleted: i * 2,
      }));

      const input = {
        commits,
        pullRequests: [],
        reviewComments: [],
      };

      const result = await calculateMetrics.execute(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.contributors).toHaveLength(1);
        const contributor = result.value.contributors[0];
        expect(contributor?.implementationActivity.commitCount).toBe(100);
        // Verify aggregation is correct
        const expectedLinesAdded = commits.reduce(
          (sum, c) => sum + c.linesAdded,
          0,
        );
        const expectedLinesDeleted = commits.reduce(
          (sum, c) => sum + c.linesDeleted,
          0,
        );
        expect(contributor?.implementationActivity.linesAdded).toBe(
          expectedLinesAdded,
        );
        expect(contributor?.implementationActivity.linesDeleted).toBe(
          expectedLinesDeleted,
        );
      }
    });
  });
});
