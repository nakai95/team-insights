import { describe, it, expect } from "vitest";
import { SimpleGitAdapter } from "../SimpleGitAdapter";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtempSync, rmSync } from "fs";
import { execSync } from "child_process";

describe("SimpleGitAdapter - Real Repository Test", () => {
  it("should retrieve data from etrade-ui repository correctly", async () => {
    // Create temporary directory
    const tempDir = mkdtempSync(join(tmpdir(), "test-repo-"));

    try {
      // Clone the repository
      console.log("Cloning repository...");
      execSync("git clone https://github.com/wingarc-dev/etrade-ui.git .", {
        cwd: tempDir,
        stdio: "pipe",
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: "0", // Disable interactive prompts
        },
      });

      const adapter = new SimpleGitAdapter();

      // Test period: 2024/11/24 ~ 2024/12/3
      const sinceDate = new Date("2025-11-24T00:00:00Z");
      const untilDate = new Date("2025-12-03T23:59:59Z");

      console.log("Fetching git log...");

      // First, check raw git log output for onishi.ke@wingarc.com
      console.log("\n=== Checking raw git log for onishi.ke@wingarc.com ===");
      try {
        const rawLog = execSync(
          `git log --all --no-merges --author="onishi.ke@wingarc.com" --since="2025-11-24" --until="2025-12-03" --numstat --format="COMMIT:%H%nAUTHOR:%an%nEMAIL:%ae%nDATE:%aI%n"`,
          {
            cwd: tempDir,
            encoding: "utf-8",
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          },
        );
        console.log("Raw log output length:", rawLog.length);
        console.log("First 2000 characters:");
        console.log(rawLog.substring(0, 2000));
      } catch (error) {
        console.error("Failed to get raw log:", error);
      }

      const result = await adapter.getLog(tempDir, sinceDate, untilDate);

      expect(result.ok).toBe(true);

      if (result.ok) {
        const commits = result.value;

        console.log(`\n=== Repository Analysis Results ===`);
        console.log(`Total commits in period: ${commits.length}`);

        if (commits.length > 0) {
          // Analyze contributors
          const contributorStats = new Map<
            string,
            {
              commitCount: number;
              linesAdded: number;
              linesDeleted: number;
              filesChanged: number;
            }
          >();

          for (const commit of commits) {
            const email = commit.email.toLowerCase();
            const existing = contributorStats.get(email) || {
              commitCount: 0,
              linesAdded: 0,
              linesDeleted: 0,
              filesChanged: 0,
            };

            existing.commitCount++;
            existing.linesAdded += commit.linesAdded;
            existing.linesDeleted += commit.linesDeleted;
            existing.filesChanged += commit.filesChanged;

            contributorStats.set(email, existing);
          }

          console.log(`\n=== Contributors (${contributorStats.size}) ===`);

          // Sort by total line changes
          const sortedContributors = Array.from(
            contributorStats.entries(),
          ).sort((a, b) => {
            const totalA = a[1].linesAdded + a[1].linesDeleted;
            const totalB = b[1].linesAdded + b[1].linesDeleted;
            return totalB - totalA;
          });

          for (const [email, stats] of sortedContributors) {
            const totalChanges = stats.linesAdded + stats.linesDeleted;
            console.log(`\n${email}:`);
            console.log(`  Commits: ${stats.commitCount}`);
            console.log(`  Lines Added: ${stats.linesAdded}`);
            console.log(`  Lines Deleted: ${stats.linesDeleted}`);
            console.log(`  Total Line Changes: ${totalChanges}`);
            console.log(`  Files Changed: ${stats.filesChanged}`);
          }

          // Sample commits
          console.log(`\n=== Sample Commits (first 5) ===`);
          for (let i = 0; i < Math.min(5, commits.length); i++) {
            const commit = commits[i];
            if (commit) {
              console.log(
                `\n${i + 1}. ${commit.hash.substring(0, 7)} - ${commit.message}`,
              );
              console.log(`   Author: ${commit.author} <${commit.email}>`);
              console.log(`   Date: ${commit.date.toISOString()}`);
              console.log(
                `   Files: ${commit.filesChanged}, +${commit.linesAdded}/-${commit.linesDeleted}`,
              );
            }
          }

          // Check if there are any commits with abnormally high line counts
          console.log(`\n=== Commits with High Line Counts (>1000) ===`);
          const highLineCommits = commits.filter(
            (c) => c.linesAdded + c.linesDeleted > 1000,
          );
          if (highLineCommits.length > 0) {
            for (const commit of highLineCommits) {
              console.log(
                `\n${commit.hash.substring(0, 7)} - ${commit.message}`,
              );
              console.log(`   Author: ${commit.author} <${commit.email}>`);
              console.log(
                `   Lines: +${commit.linesAdded}/-${commit.linesDeleted} (total: ${commit.linesAdded + commit.linesDeleted})`,
              );
            }
          } else {
            console.log("No commits with >1000 line changes found.");
          }

          // Verify data quality
          expect(commits.length).toBeGreaterThan(0);

          // Check a sample commit for data structure
          const sampleCommit = commits[0];
          if (sampleCommit) {
            expect(sampleCommit.hash).toBeDefined();
            expect(sampleCommit.hash.length).toBeGreaterThan(0);
            expect(sampleCommit.author).toBeDefined();
            expect(sampleCommit.email).toBeDefined();
            expect(sampleCommit.date).toBeInstanceOf(Date);
            expect(sampleCommit.message).toBeDefined();

            // Verify metrics are non-negative
            expect(sampleCommit.filesChanged).toBeGreaterThanOrEqual(0);
            expect(sampleCommit.linesAdded).toBeGreaterThanOrEqual(0);
            expect(sampleCommit.linesDeleted).toBeGreaterThanOrEqual(0);
          }

          // Verify no abnormally high line counts (e.g., > 50,000 lines which might indicate generated files)
          for (const [, stats] of sortedContributors) {
            const totalChanges = stats.linesAdded + stats.linesDeleted;
            expect(totalChanges).toBeLessThan(50000); // Sanity check for generated files
          }
        } else {
          console.log("No commits found in the specified period");
        }
      }
    } finally {
      // Cleanup: remove temporary directory
      console.log("\nCleaning up temporary directory...");
      rmSync(tempDir, { recursive: true, force: true });
    }
  }, 120000); // 120 second timeout for cloning and processing
});
