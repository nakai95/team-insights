import { Result, ok, err } from "@/lib/result";
import { RepositoryUrl } from "@/domain/value-objects/RepositoryUrl";
import { DateRange } from "@/domain/value-objects/DateRange";
import { AnalysisStatus } from "@/domain/types";
import { Contributor } from "./Contributor";

export class RepositoryAnalysis {
  private constructor(
    public readonly id: string,
    public readonly repositoryUrl: RepositoryUrl,
    public readonly analyzedAt: Date,
    public readonly dateRange: DateRange,
    public readonly status: AnalysisStatus,
    public readonly contributors: Contributor[],
    public readonly errorMessage: string | null,
  ) {}

  static create(params: {
    id: string;
    repositoryUrl: RepositoryUrl;
    analyzedAt: Date;
    dateRange: DateRange;
    status: AnalysisStatus;
    contributors: Contributor[];
    errorMessage?: string | null;
  }): Result<RepositoryAnalysis> {
    // Validate ID
    if (!params.id || params.id.trim().length === 0) {
      return err(new Error("Analysis ID cannot be empty"));
    }

    // Validate status
    const validStatuses = Object.values(AnalysisStatus);
    if (!validStatuses.includes(params.status)) {
      return err(new Error("Invalid analysis status"));
    }

    // Business rule: Cannot be marked complete without contributors
    if (
      params.status === AnalysisStatus.COMPLETED &&
      params.contributors.length === 0
    ) {
      return err(
        new Error("Cannot mark analysis as completed without contributors"),
      );
    }

    // Business rule: Error message required if status is failed
    if (params.status === AnalysisStatus.FAILED && !params.errorMessage) {
      return err(new Error("Error message is required when status is failed"));
    }

    return ok(
      new RepositoryAnalysis(
        params.id,
        params.repositoryUrl,
        params.analyzedAt,
        params.dateRange,
        params.status,
        params.contributors,
        params.errorMessage ?? null,
      ),
    );
  }

  static createInProgress(
    id: string,
    repositoryUrl: RepositoryUrl,
    dateRange: DateRange,
  ): Result<RepositoryAnalysis> {
    return RepositoryAnalysis.create({
      id,
      repositoryUrl,
      analyzedAt: new Date(),
      dateRange,
      status: AnalysisStatus.IN_PROGRESS,
      contributors: [],
      errorMessage: null,
    });
  }

  complete(contributors: Contributor[]): Result<RepositoryAnalysis> {
    if (this.status !== AnalysisStatus.IN_PROGRESS) {
      return err(new Error("Can only complete analysis that is in progress"));
    }

    if (contributors.length === 0) {
      return err(new Error("Cannot complete analysis without contributors"));
    }

    return RepositoryAnalysis.create({
      id: this.id,
      repositoryUrl: this.repositoryUrl,
      analyzedAt: this.analyzedAt,
      dateRange: this.dateRange,
      status: AnalysisStatus.COMPLETED,
      contributors,
      errorMessage: null,
    });
  }

  fail(errorMessage: string): Result<RepositoryAnalysis> {
    if (this.status !== AnalysisStatus.IN_PROGRESS) {
      return err(new Error("Can only fail analysis that is in progress"));
    }

    if (!errorMessage || errorMessage.trim().length === 0) {
      return err(new Error("Error message cannot be empty"));
    }

    return RepositoryAnalysis.create({
      id: this.id,
      repositoryUrl: this.repositoryUrl,
      analyzedAt: this.analyzedAt,
      dateRange: this.dateRange,
      status: AnalysisStatus.FAILED,
      contributors: this.contributors,
      errorMessage,
    });
  }
}
