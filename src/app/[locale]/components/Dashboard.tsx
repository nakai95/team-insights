"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnalysisResult } from "@/application/dto/AnalysisResult";
import { ContributorDto } from "@/application/dto/ContributorDto";
import { OverviewTab } from "@/presentation/components/OverviewTab";
import { PRThroughputSection } from "@/presentation/components/PRThroughputSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch, GitPullRequest, MessageSquare, Users } from "lucide-react";
import { IdentityMerger } from "@/presentation/components/IdentityMerger";

export interface DashboardProps {
  result: AnalysisResult;
}

/**
 * Main dashboard component for displaying analysis results
 *
 * @deprecated This component has been superseded by AnalysisTabs.
 * Use AnalysisTabs for new implementations, which provides tab navigation.
 * This wrapper is maintained for backward compatibility.
 *
 * The content has been moved to:
 * - OverviewTab: Charts and contributor details (simplified)
 * - PRThroughputSection: PR throughput analysis (already extracted)
 * - ChangesTimeseriesTab: PR changes timeseries (new feature)
 * - Header and summary cards are now included here for backward compatibility
 *
 * See: src/presentation/components/AnalysisTabs.tsx
 */
export function Dashboard({ result }: DashboardProps) {
  const t = useTranslations("dashboard");
  const { analysis, summary } = result;

  // Manage contributors state (for identity merging)
  const [contributors, setContributors] = useState<ContributorDto[]>(
    result.contributors,
  );

  /**
   * Handle merge completion by updating the contributors list
   */
  const handleMergeComplete = (mergedContributor: ContributorDto) => {
    setContributors((prev) => {
      // Get all emails from the merged contributor
      const mergedEmails = new Set([
        mergedContributor.primaryEmail,
        ...mergedContributor.mergedEmails,
      ]);

      // Remove all contributors whose primary email is in the merged set
      const remaining = prev.filter((c) => !mergedEmails.has(c.primaryEmail));

      // Add the merged contributor at the beginning
      return [mergedContributor, ...remaining];
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground">{analysis.repositoryUrl}</p>
          <p className="text-sm text-muted-foreground">
            {t("overview.analyzed")}:{" "}
            {new Date(analysis.analyzedAt).toLocaleString()} |{" "}
            {t("overview.period")}:{" "}
            {new Date(analysis.dateRange.start).toLocaleDateString()} -{" "}
            {new Date(analysis.dateRange.end).toLocaleDateString()}
          </p>
        </div>
        <IdentityMerger
          contributors={contributors}
          repositoryUrl={analysis.repositoryUrl}
          onMergeComplete={handleMergeComplete}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("summary.totalContributors")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalContributors}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("summary.totalCommits")}
            </CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalCommits.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("summary.pullRequests")}
            </CardTitle>
            <GitPullRequest className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalPullRequests.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("summary.reviewComments")}
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalReviewComments.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("analysisTime", {
                seconds: (summary.analysisTimeMs / 1000).toFixed(1),
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overview content (extracted to OverviewTab) */}
      <OverviewTab contributors={contributors} />

      {/* PR Throughput Analysis (kept in place for backward compatibility) */}
      <PRThroughputSection throughput={result.throughput} />
    </div>
  );
}
