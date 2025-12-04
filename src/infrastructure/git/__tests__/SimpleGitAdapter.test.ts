import { describe, it, expect } from "vitest";
import { SimpleGitAdapter } from "../SimpleGitAdapter";

describe("SimpleGitAdapter - getLog", () => {
  it("retrieves git log and verifies data structure", async () => {
    const adapter = new SimpleGitAdapter();
    const repoPath = process.cwd(); // Current repository

    // Get commits from 2024 onwards
    const sinceDate = new Date("2024-01-01");
    const result = await adapter.getLog(repoPath, sinceDate);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const commits = result.value;

      // Verify data structure
      expect(commits.length).toBeGreaterThan(0);

      const firstCommit = commits[0];
      expect(firstCommit).toBeDefined();
      expect(firstCommit?.hash).toBeDefined();
      expect(firstCommit?.hash.length).toBeGreaterThan(0);
      expect(firstCommit?.author).toBeDefined();
      expect(firstCommit?.email).toBeDefined();
      expect(firstCommit?.date).toBeInstanceOf(Date);
      expect(firstCommit?.message).toBeDefined();
      expect(typeof firstCommit?.filesChanged).toBe("number");
      expect(typeof firstCommit?.linesAdded).toBe("number");
      expect(typeof firstCommit?.linesDeleted).toBe("number");
    }
  });
});
