import { describe, expect, it } from "vitest";
import { parseNumstat } from "../numstatParser";

describe("parseNumstat", () => {
  describe("basic parsing", () => {
    it("should parse a single file change", () => {
      const lines = ["10\t5\tsrc/feature.ts"];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(1);
      expect(result.linesAdded).toBe(10);
      expect(result.linesDeleted).toBe(5);
    });

    it("should parse multiple file changes", () => {
      const lines = [
        "10\t5\tsrc/feature.ts",
        "2\t1\tREADME.md",
        "7\t3\tsrc/utils.ts",
      ];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(3);
      expect(result.linesAdded).toBe(19); // 10 + 2 + 7
      expect(result.linesDeleted).toBe(9); // 5 + 1 + 3
    });

    it("should handle empty array", () => {
      const result = parseNumstat([]);

      expect(result.filesChanged).toBe(0);
      expect(result.linesAdded).toBe(0);
      expect(result.linesDeleted).toBe(0);
    });

    it("should skip empty lines", () => {
      const lines = ["10\t5\tsrc/feature.ts", "", "2\t1\tREADME.md", "   "];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(2);
      expect(result.linesAdded).toBe(12);
      expect(result.linesDeleted).toBe(6);
    });

    it("should skip malformed lines with insufficient parts", () => {
      const lines = [
        "10\t5\tsrc/feature.ts",
        "invalid-line",
        "2\t1\tREADME.md",
        "10\t", // Missing filename
      ];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(2);
      expect(result.linesAdded).toBe(12);
      expect(result.linesDeleted).toBe(6);
    });
  });

  describe("binary files", () => {
    it("should handle binary files marked with dashes", () => {
      const lines = ["-\t-\timage.png", "10\t5\tscript.ts"];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(2); // Both files counted
      expect(result.linesAdded).toBe(10); // Only text file
      expect(result.linesDeleted).toBe(5); // Only text file
    });

    it("should handle multiple binary files", () => {
      const lines = ["-\t-\timage1.png", "-\t-\timage2.jpg", "5\t2\tcode.ts"];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(3);
      expect(result.linesAdded).toBe(5);
      expect(result.linesDeleted).toBe(2);
    });

    it("should handle only binary files", () => {
      const lines = ["-\t-\timage.png", "-\t-\tdocument.pdf"];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(2);
      expect(result.linesAdded).toBe(0);
      expect(result.linesDeleted).toBe(0);
    });
  });

  describe("file exclusion", () => {
    it("should exclude lock files", () => {
      const lines = [
        "100\t50\tpackage-lock.json",
        "10\t5\tsrc/feature.ts",
        "200\t100\tpnpm-lock.yaml",
      ];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(1); // Only feature.ts
      expect(result.linesAdded).toBe(10);
      expect(result.linesDeleted).toBe(5);
    });

    it("should exclude build artifacts", () => {
      const lines = [
        "50\t20\tdist/bundle.js",
        "10\t5\tsrc/feature.ts",
        "30\t10\tbuild/output.js",
        "5\t2\t.next/server.js",
      ];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(1); // Only feature.ts
      expect(result.linesAdded).toBe(10);
      expect(result.linesDeleted).toBe(5);
    });

    it("should exclude node_modules files", () => {
      const lines = [
        "1000\t500\tnode_modules/react/index.js",
        "10\t5\tsrc/feature.ts",
        "500\t200\tnode_modules/lodash/dist/lodash.js",
      ];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(1);
      expect(result.linesAdded).toBe(10);
      expect(result.linesDeleted).toBe(5);
    });

    it("should exclude minified files", () => {
      const lines = [
        "100\t0\tbundle.min.js",
        "10\t5\tsrc/feature.ts",
        "50\t0\tstyles.min.css",
      ];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(1);
      expect(result.linesAdded).toBe(10);
      expect(result.linesDeleted).toBe(5);
    });

    it("should exclude source maps", () => {
      const lines = [
        "200\t0\tbundle.js.map",
        "10\t5\tsrc/feature.ts",
        "100\t0\tstyles.css.map",
      ];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(1);
      expect(result.linesAdded).toBe(10);
      expect(result.linesDeleted).toBe(5);
    });

    it("should exclude coverage files", () => {
      const lines = [
        "500\t0\tcoverage/lcov-report/index.html",
        "10\t5\tsrc/feature.ts",
      ];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(1);
      expect(result.linesAdded).toBe(10);
      expect(result.linesDeleted).toBe(5);
    });

    it("should handle all excluded files", () => {
      const lines = [
        "100\t50\tpackage-lock.json",
        "200\t100\tdist/bundle.js",
        "300\t150\tnode_modules/react/index.js",
      ];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(0);
      expect(result.linesAdded).toBe(0);
      expect(result.linesDeleted).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should handle filenames with spaces (tab-separated)", () => {
      const lines = ["10\t5\tpath/to/file with spaces.ts"];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(1);
      expect(result.linesAdded).toBe(10);
      expect(result.linesDeleted).toBe(5);
    });

    it("should handle zero additions and deletions", () => {
      const lines = ["0\t0\tfile.ts"];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(1);
      expect(result.linesAdded).toBe(0);
      expect(result.linesDeleted).toBe(0);
    });

    it("should handle large numbers", () => {
      const lines = ["9999\t8888\tsrc/large-file.ts"];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(1);
      expect(result.linesAdded).toBe(9999);
      expect(result.linesDeleted).toBe(8888);
    });

    it("should handle invalid numbers gracefully", () => {
      const lines = [
        "abc\t5\tsrc/invalid.ts", // Invalid addition
        "10\txyz\tsrc/invalid2.ts", // Invalid deletion
        "10\t5\tsrc/valid.ts",
      ];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(1); // Only valid.ts
      expect(result.linesAdded).toBe(10);
      expect(result.linesDeleted).toBe(5);
    });

    it("should handle file renames (shown as separate entries)", () => {
      const lines = [
        "0\t10\told-file.ts", // Deletion
        "10\t0\tnew-file.ts", // Addition
      ];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(2);
      expect(result.linesAdded).toBe(10);
      expect(result.linesDeleted).toBe(10);
    });
  });

  describe("mixed scenarios", () => {
    it("should handle combination of text, binary, and excluded files", () => {
      const lines = [
        "10\t5\tsrc/feature.ts",
        "-\t-\timage.png",
        "100\t50\tpackage-lock.json",
        "20\t10\tsrc/utils.ts",
        "500\t200\tnode_modules/react/index.js",
        "-\t-\tdist/logo.svg",
      ];
      const result = parseNumstat(lines);

      // Only src/feature.ts, image.png, and src/utils.ts should be counted
      expect(result.filesChanged).toBe(3);
      expect(result.linesAdded).toBe(30); // 10 + 20
      expect(result.linesDeleted).toBe(15); // 5 + 10
    });

    it("should handle empty lines and whitespace mixed with valid data", () => {
      const lines = [
        "",
        "10\t5\tsrc/feature.ts",
        "   ",
        "20\t10\tsrc/utils.ts",
        "",
      ];
      const result = parseNumstat(lines);

      expect(result.filesChanged).toBe(2);
      expect(result.linesAdded).toBe(30);
      expect(result.linesDeleted).toBe(15);
    });
  });
});
