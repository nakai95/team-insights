import { describe, it, expect } from "vitest";
import { GitLogParser } from "@/infrastructure/git/GitLogParser";

describe("GitLogParser", () => {
  describe("parseNumstatFormat", () => {
    it("should parse single commit with numstat data", () => {
      const logOutput = `abc123
John Doe
john@example.com
2024-01-15T10:30:00Z
Add new feature

10      5       src/feature.ts
2       1       README.md
--END-COMMIT--`;

      const result = GitLogParser.parseNumstatFormat(logOutput);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);

        const commit = result.value[0]!;
        expect(commit.hash).toBe("abc123");
        expect(commit.author).toBe("John Doe");
        expect(commit.email).toBe("john@example.com");
        expect(commit.date).toEqual(new Date("2024-01-15T10:30:00Z"));
        expect(commit.message).toBe("Add new feature");
        expect(commit.filesChanged).toBe(2);
        expect(commit.linesAdded).toBe(12); // 10 + 2
        expect(commit.linesDeleted).toBe(6); // 5 + 1
      }
    });

    it("should parse multiple commits", () => {
      const logOutput = `commit1
Alice
alice@example.com
2024-01-10T09:00:00Z
First commit

5       2       file1.ts
--END-COMMIT--
commit2
Bob
bob@example.com
2024-01-11T14:30:00Z
Second commit

3       1       file2.ts
7       0       file3.ts
--END-COMMIT--`;

      const result = GitLogParser.parseNumstatFormat(logOutput);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);

        const commit1 = result.value[0]!;
        expect(commit1.hash).toBe("commit1");
        expect(commit1.author).toBe("Alice");
        expect(commit1.filesChanged).toBe(1);
        expect(commit1.linesAdded).toBe(5);
        expect(commit1.linesDeleted).toBe(2);

        const commit2 = result.value[1]!;
        expect(commit2.hash).toBe("commit2");
        expect(commit2.author).toBe("Bob");
        expect(commit2.filesChanged).toBe(2);
        expect(commit2.linesAdded).toBe(10); // 3 + 7
        expect(commit2.linesDeleted).toBe(1);
      }
    });

    it("should handle binary files in numstat", () => {
      const logOutput = `abc456
Jane Doe
jane@example.com
2024-01-12T11:00:00Z
Add binary file

-       -       image.png
10      5       script.ts
--END-COMMIT--`;

      const result = GitLogParser.parseNumstatFormat(logOutput);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);

        const commit = result.value[0]!;
        expect(commit.filesChanged).toBe(2); // Both binary and text file
        expect(commit.linesAdded).toBe(10); // Only from text file
        expect(commit.linesDeleted).toBe(5); // Only from text file
      }
    });

    it("should handle commits with no file changes", () => {
      const logOutput = `abc789
Empty Commit
empty@example.com
2024-01-13T08:00:00Z
Empty commit message

--END-COMMIT--`;

      const result = GitLogParser.parseNumstatFormat(logOutput);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);

        const commit = result.value[0]!;
        expect(commit.filesChanged).toBe(0);
        expect(commit.linesAdded).toBe(0);
        expect(commit.linesDeleted).toBe(0);
      }
    });

    it("should handle multiline commit messages", () => {
      const logOutput = `def456
MultiLine Author
multi@example.com
2024-01-14T16:45:00Z
This is the subject line
This is the body
More body text

5       2       file.ts
--END-COMMIT--`;

      const result = GitLogParser.parseNumstatFormat(logOutput);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);

        const commit = result.value[0]!;
        expect(commit.message).toBe("This is the subject line"); // First line only
        expect(commit.filesChanged).toBe(1);
      }
    });

    it("should handle empty log output", () => {
      const result = GitLogParser.parseNumstatFormat("");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it("should skip malformed commits", () => {
      const logOutput = `good1
Good Author
good@example.com
2024-01-15T10:00:00Z
Good commit

5       2       file.ts
--END-COMMIT--
incomplete
--END-COMMIT--
good2
Another Author
another@example.com
2024-01-16T10:00:00Z
Another good commit

3       1       file2.ts
--END-COMMIT--`;

      const result = GitLogParser.parseNumstatFormat(logOutput);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2); // Only good commits
        expect(result.value[0]!.hash).toBe("good1");
        expect(result.value[1]!.hash).toBe("good2");
      }
    });

    it("should handle commits with special characters in message", () => {
      const logOutput = `xyz123
Special Chars
special@example.com
2024-01-17T12:00:00Z
Fix: issue #123 (urgent!)

10      5       fix.ts
--END-COMMIT--`;

      const result = GitLogParser.parseNumstatFormat(logOutput);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]!.message).toBe("Fix: issue #123 (urgent!)");
      }
    });
  });

  describe("parseSimpleFormat", () => {
    it("should parse commits without file stats", () => {
      const logOutput = `abc123
John Doe
john@example.com
2024-01-15T10:30:00Z
Simple commit
--END-COMMIT--`;

      const result = GitLogParser.parseSimpleFormat(logOutput);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);

        const commit = result.value[0]!;
        expect(commit.hash).toBe("abc123");
        expect(commit.author).toBe("John Doe");
        expect(commit.email).toBe("john@example.com");
        expect(commit.message).toBe("Simple commit");
        expect(commit.filesChanged).toBe(0);
        expect(commit.linesAdded).toBe(0);
        expect(commit.linesDeleted).toBe(0);
      }
    });

    it("should parse multiple simple commits", () => {
      const logOutput = `commit1
Alice
alice@example.com
2024-01-10T09:00:00Z
First
--END-COMMIT--
commit2
Bob
bob@example.com
2024-01-11T14:30:00Z
Second
--END-COMMIT--`;

      const result = GitLogParser.parseSimpleFormat(logOutput);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]!.author).toBe("Alice");
        expect(result.value[1]!.author).toBe("Bob");
      }
    });

    it("should handle empty log output", () => {
      const result = GitLogParser.parseSimpleFormat("");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it("should skip commits with invalid dates", () => {
      const logOutput = `good1
Good Author
good@example.com
2024-01-15T10:00:00Z
Good commit
--END-COMMIT--
bad1
Bad Author
bad@example.com
invalid-date
Bad commit
--END-COMMIT--
good2
Another Author
another@example.com
2024-01-16T10:00:00Z
Another good
--END-COMMIT--`;

      const result = GitLogParser.parseSimpleFormat(logOutput);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2); // Only commits with valid dates
        expect(result.value[0]!.hash).toBe("good1");
        expect(result.value[1]!.hash).toBe("good2");
      }
    });
  });
});
