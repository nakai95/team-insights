"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ContributorDto } from "@/application/dto/ContributorDto";
import { IdentityMerger } from "../IdentityMerger";

export interface AnalysisHeaderProps {
  /** Repository URL */
  repositoryUrl: string;
  /** Analysis timestamp */
  analyzedAt: string;
  /** Analysis date range */
  dateRange: {
    start: string;
    end: string;
  };
  /** Contributors list for identity merger */
  contributors: ContributorDto[];
  /** Callback when identity merge completes */
  onMergeComplete: (mergedContributor: ContributorDto) => void;
  /** Optional callback when reset/analyze another is clicked */
  onReset?: () => void;
}

/**
 * Analysis header component with repository info, identity merger, and optional reset button
 * Shared across all tabs, rendered above tab navigation
 */
export function AnalysisHeader({
  repositoryUrl,
  analyzedAt,
  dateRange,
  contributors,
  onMergeComplete,
  onReset,
}: AnalysisHeaderProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="text-muted-foreground">{repositoryUrl}</p>
        <p className="text-sm text-muted-foreground">
          {t("overview.analyzed")}: {new Date(analyzedAt).toLocaleString()} |{" "}
          {t("overview.period")}:{" "}
          {new Date(dateRange.start).toLocaleDateString()} -{" "}
          {new Date(dateRange.end).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {onReset && (
          <Button variant="outline" onClick={onReset}>
            {t("analyzeAnother")}
          </Button>
        )}
        <IdentityMerger
          contributors={contributors}
          repositoryUrl={repositoryUrl}
          onMergeComplete={onMergeComplete}
        />
      </div>
    </div>
  );
}
