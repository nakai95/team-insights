"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ContributorDto } from "@/application/dto/ContributorDto";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContributorList } from "@/app/[locale]/components/ContributorList";
import { ImplementationActivityChart } from "@/app/[locale]/components/ImplementationActivityChart";
import { IdentityMerger } from "@/presentation/components/IdentityMerger";
import { GitBranch, GitPullRequest, MessageSquare, Users } from "lucide-react";

export interface OverviewTabProps {
  /** Repository analysis metadata */
  analysis: {
    id: string;
    repositoryUrl: string;
    analyzedAt: string;
    dateRange: {
      start: string;
      end: string;
    };
  };
  /** Contributors list for display */
  contributors: ContributorDto[];
  /** Summary statistics for cards */
  summary: {
    totalContributors: number;
    totalCommits: number;
    totalPullRequests: number;
    totalReviewComments: number;
    analysisTimeMs: number;
  };
}

/**
 * Overview Tab Component
 *
 * Displays:
 * - Repository metadata and date range
 * - Summary cards (contributors, commits, PRs, review comments)
 * - Implementation activity chart
 * - Review activity chart
 * - Contributor list
 * - Identity merger for duplicate contributors
 */
export function OverviewTab({
  analysis,
  contributors: initialContributors,
  summary,
}: OverviewTabProps) {
  const t = useTranslations("dashboard");
  const [contributors, setContributors] =
    useState<ContributorDto[]>(initialContributors);

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

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <ImplementationActivityChart
          contributors={contributors}
          maxContributors={10}
        />

        <Card>
          <CardHeader>
            <CardTitle>{t("charts.reviewActivity")}</CardTitle>
            <CardDescription>
              {t("charts.reviewActivityDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contributors
                .sort(
                  (a, b) =>
                    b.reviewActivity.reviewScore - a.reviewActivity.reviewScore,
                )
                .slice(0, 10)
                .map((contributor) => (
                  <div key={contributor.id} className="flex items-center">
                    <div className="flex-1">
                      <div className="font-medium">
                        {contributor.displayName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {contributor.reviewActivity.pullRequestsReviewed}{" "}
                        {t("overview.prsReviewed")} ·{" "}
                        {contributor.reviewActivity.reviewCommentCount}{" "}
                        {t("overview.comments")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {contributor.reviewActivity.reviewScore.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("overview.score")}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contributor List */}
      <ContributorList contributors={contributors} />
    </div>
  );
}
