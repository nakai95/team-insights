import { describe, it, expect } from "vitest";
import { RepositoryAnalysis } from "@/domain/entities/RepositoryAnalysis";
import { RepositoryUrl } from "@/domain/value-objects/RepositoryUrl";
import { DateRange } from "@/domain/value-objects/DateRange";
import { AnalysisStatus } from "@/domain/types";

describe("RepositoryAnalysis", () => {
  const createValidParams = () => {
    const urlResult = RepositoryUrl.create("https://github.com/owner/repo");
    const rangeResult = DateRange.fromMonths(6);

    if (!urlResult.ok || !rangeResult.ok) {
      throw new Error("Test setup failed");
    }

    return {
      id: "test-id-123",
      repositoryUrl: urlResult.value,
      analyzedAt: new Date("2024-01-01"),
      dateRange: rangeResult.value,
      status: AnalysisStatus.IN_PROGRESS,
      contributors: [],
      errorMessage: null,
    };
  };

  describe("create", () => {
    it("should create valid analysis", () => {
      const params = createValidParams();
      const result = RepositoryAnalysis.create(params);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("test-id-123");
        expect(result.value.status).toBe(AnalysisStatus.IN_PROGRESS);
      }
    });

    it("should reject empty ID", () => {
      const params = createValidParams();
      params.id = "";

      const result = RepositoryAnalysis.create(params);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("ID cannot be empty");
      }
    });

    it("should reject completion without contributors", () => {
      const params = createValidParams();
      params.status = AnalysisStatus.COMPLETED;
      params.contributors = [];

      const result = RepositoryAnalysis.create(params);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Cannot mark analysis as completed without contributors",
        );
      }
    });

    it("should reject failed status without error message", () => {
      const params = createValidParams();
      params.status = AnalysisStatus.FAILED;
      params.errorMessage = null;

      const result = RepositoryAnalysis.create(params);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Error message is required when status is failed",
        );
      }
    });
  });

  describe("createInProgress", () => {
    it("should create in-progress analysis", () => {
      const urlResult = RepositoryUrl.create("https://github.com/owner/repo");
      const rangeResult = DateRange.fromMonths(6);

      expect(urlResult.ok).toBe(true);
      expect(rangeResult.ok).toBe(true);

      if (urlResult.ok && rangeResult.ok) {
        const result = RepositoryAnalysis.createInProgress(
          "test-id",
          urlResult.value,
          rangeResult.value,
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.status).toBe(AnalysisStatus.IN_PROGRESS);
          expect(result.value.contributors).toHaveLength(0);
          expect(result.value.errorMessage).toBeNull();
        }
      }
    });
  });

  describe("complete", () => {
    it("should transition from in-progress to completed", () => {
      const urlResult = RepositoryUrl.create("https://github.com/owner/repo");
      const rangeResult = DateRange.fromMonths(6);

      expect(urlResult.ok).toBe(true);
      expect(rangeResult.ok).toBe(true);

      if (urlResult.ok && rangeResult.ok) {
        const analysisResult = RepositoryAnalysis.createInProgress(
          "test-id",
          urlResult.value,
          rangeResult.value,
        );

        expect(analysisResult.ok).toBe(true);
        if (analysisResult.ok) {
          // Mock contributor (we'll create the real class next)
          const contributors: any[] = [{ id: "contributor-1" }];
          const completedResult = analysisResult.value.complete(contributors);

          expect(completedResult.ok).toBe(true);
          if (completedResult.ok) {
            expect(completedResult.value.status).toBe(AnalysisStatus.COMPLETED);
            expect(completedResult.value.contributors).toHaveLength(1);
          }
        }
      }
    });

    it("should reject completion without contributors", () => {
      const urlResult = RepositoryUrl.create("https://github.com/owner/repo");
      const rangeResult = DateRange.fromMonths(6);

      expect(urlResult.ok).toBe(true);
      expect(rangeResult.ok).toBe(true);

      if (urlResult.ok && rangeResult.ok) {
        const analysisResult = RepositoryAnalysis.createInProgress(
          "test-id",
          urlResult.value,
          rangeResult.value,
        );

        expect(analysisResult.ok).toBe(true);
        if (analysisResult.ok) {
          const completedResult = analysisResult.value.complete([]);

          expect(completedResult.ok).toBe(false);
          if (!completedResult.ok) {
            expect(completedResult.error.message).toContain(
              "Cannot complete analysis without contributors",
            );
          }
        }
      }
    });

    it("should reject completion when not in progress", () => {
      const params = createValidParams();
      params.status = AnalysisStatus.COMPLETED;
      params.contributors = [{ id: "contributor-1" } as any];

      const analysisResult = RepositoryAnalysis.create(params);
      expect(analysisResult.ok).toBe(true);

      if (analysisResult.ok) {
        const completedResult = analysisResult.value.complete([
          { id: "new-contributor" } as any,
        ]);

        expect(completedResult.ok).toBe(false);
        if (!completedResult.ok) {
          expect(completedResult.error.message).toContain(
            "Can only complete analysis that is in progress",
          );
        }
      }
    });
  });

  describe("fail", () => {
    it("should transition from in-progress to failed", () => {
      const urlResult = RepositoryUrl.create("https://github.com/owner/repo");
      const rangeResult = DateRange.fromMonths(6);

      expect(urlResult.ok).toBe(true);
      expect(rangeResult.ok).toBe(true);

      if (urlResult.ok && rangeResult.ok) {
        const analysisResult = RepositoryAnalysis.createInProgress(
          "test-id",
          urlResult.value,
          rangeResult.value,
        );

        expect(analysisResult.ok).toBe(true);
        if (analysisResult.ok) {
          const failedResult = analysisResult.value.fail("Test error message");

          expect(failedResult.ok).toBe(true);
          if (failedResult.ok) {
            expect(failedResult.value.status).toBe(AnalysisStatus.FAILED);
            expect(failedResult.value.errorMessage).toBe("Test error message");
          }
        }
      }
    });

    it("should reject empty error message", () => {
      const urlResult = RepositoryUrl.create("https://github.com/owner/repo");
      const rangeResult = DateRange.fromMonths(6);

      expect(urlResult.ok).toBe(true);
      expect(rangeResult.ok).toBe(true);

      if (urlResult.ok && rangeResult.ok) {
        const analysisResult = RepositoryAnalysis.createInProgress(
          "test-id",
          urlResult.value,
          rangeResult.value,
        );

        expect(analysisResult.ok).toBe(true);
        if (analysisResult.ok) {
          const failedResult = analysisResult.value.fail("");

          expect(failedResult.ok).toBe(false);
          if (!failedResult.ok) {
            expect(failedResult.error.message).toContain(
              "Error message cannot be empty",
            );
          }
        }
      }
    });

    it("should reject failure when not in progress", () => {
      const params = createValidParams();
      params.status = AnalysisStatus.FAILED;
      params.errorMessage = "Previous error";

      const analysisResult = RepositoryAnalysis.create(params);
      expect(analysisResult.ok).toBe(true);

      if (analysisResult.ok) {
        const failedResult = analysisResult.value.fail("New error");

        expect(failedResult.ok).toBe(false);
        if (!failedResult.ok) {
          expect(failedResult.error.message).toContain(
            "Can only fail analysis that is in progress",
          );
        }
      }
    });
  });
});
