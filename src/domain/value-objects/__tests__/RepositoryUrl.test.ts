import { describe, it, expect } from "vitest";
import { RepositoryUrl } from "@/domain/value-objects/RepositoryUrl";

describe("RepositoryUrl", () => {
  describe("create", () => {
    it("should create valid repository URL", () => {
      const result = RepositoryUrl.create("https://github.com/owner/repo");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.value).toBe("https://github.com/owner/repo");
        expect(result.value.owner).toBe("owner");
        expect(result.value.repo).toBe("repo");
      }
    });

    it("should trim whitespace", () => {
      const result = RepositoryUrl.create("  https://github.com/owner/repo  ");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.value).toBe("https://github.com/owner/repo");
      }
    });

    it("should accept owner and repo with hyphens", () => {
      const result = RepositoryUrl.create(
        "https://github.com/my-owner/my-repo",
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.owner).toBe("my-owner");
        expect(result.value.repo).toBe("my-repo");
      }
    });

    it("should accept owner and repo with underscores", () => {
      const result = RepositoryUrl.create(
        "https://github.com/my_owner/my_repo",
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.owner).toBe("my_owner");
        expect(result.value.repo).toBe("my_repo");
      }
    });

    it("should reject non-HTTPS URL", () => {
      const result = RepositoryUrl.create("http://github.com/owner/repo");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Invalid GitHub repository URL format",
        );
      }
    });

    it("should reject URL with query parameters", () => {
      const result = RepositoryUrl.create(
        "https://github.com/owner/repo?tab=readme",
      );

      expect(result.ok).toBe(false);
    });

    it("should reject URL with fragment", () => {
      const result = RepositoryUrl.create(
        "https://github.com/owner/repo#readme",
      );

      expect(result.ok).toBe(false);
    });

    it("should reject non-GitHub domain", () => {
      const result = RepositoryUrl.create("https://gitlab.com/owner/repo");

      expect(result.ok).toBe(false);
    });

    it("should reject URL missing repository name", () => {
      const result = RepositoryUrl.create("https://github.com/owner");

      expect(result.ok).toBe(false);
    });

    it("should reject URL with extra path segments", () => {
      const result = RepositoryUrl.create(
        "https://github.com/owner/repo/extra",
      );

      expect(result.ok).toBe(false);
    });

    it("should reject URL exceeding 500 characters", () => {
      // Create URL longer than 500 chars: "https://github.com/" (19) + owner (476) + "/" (1) + "repo" (4) = 500+
      const longOwner = "a".repeat(478);
      const longUrl = `https://github.com/${longOwner}/repo`;
      const result = RepositoryUrl.create(longUrl);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("exceeds maximum length");
      }
    });

    it("should reject empty owner", () => {
      const result = RepositoryUrl.create("https://github.com//repo");

      expect(result.ok).toBe(false);
    });
  });

  describe("apiBase", () => {
    it("should return correct API base URL", () => {
      const result = RepositoryUrl.create("https://github.com/owner/repo");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.apiBase).toBe(
          "https://api.github.com/repos/owner/repo",
        );
      }
    });
  });

  describe("equals", () => {
    it("should return true for equal URLs", () => {
      const url1Result = RepositoryUrl.create("https://github.com/owner/repo");
      const url2Result = RepositoryUrl.create("https://github.com/owner/repo");

      expect(url1Result.ok).toBe(true);
      expect(url2Result.ok).toBe(true);

      if (url1Result.ok && url2Result.ok) {
        expect(url1Result.value.equals(url2Result.value)).toBe(true);
      }
    });

    it("should return false for different URLs", () => {
      const url1Result = RepositoryUrl.create("https://github.com/owner/repo1");
      const url2Result = RepositoryUrl.create("https://github.com/owner/repo2");

      expect(url1Result.ok).toBe(true);
      expect(url2Result.ok).toBe(true);

      if (url1Result.ok && url2Result.ok) {
        expect(url1Result.value.equals(url2Result.value)).toBe(false);
      }
    });
  });
});
