"use client";

import { useTranslations } from "next-intl";
import { FileX } from "lucide-react";

export interface EmptyStateProps {
  /** Repository URL for display */
  repositoryUrl: string;
  /** Date range that was analyzed */
  dateRange: {
    start: string;
    end: string;
  };
  /** Optional custom message */
  message?: string;
}

/**
 * Empty State Component for PR Changes Timeseries
 *
 * Displayed when no merged PRs exist in the analyzed date range.
 * Provides context about the repository and date range, and suggests
 * expanding the date range to find more data.
 */
export function EmptyState({
  repositoryUrl,
  dateRange,
  message,
}: EmptyStateProps) {
  const t = useTranslations("prTimeseries");

  // Format dates for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <FileX className="h-12 w-12 text-muted-foreground" />
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-foreground">
          {message || t("emptyState")}
        </p>
        <p className="text-sm text-muted-foreground">
          No merged PRs found between {formatDate(dateRange.start)} and{" "}
          {formatDate(dateRange.end)}
        </p>
        <p className="text-xs text-muted-foreground max-w-md">
          Try expanding your date range to include more repository history, or
          verify that PRs have been merged during this period.
        </p>
      </div>
    </div>
  );
}
