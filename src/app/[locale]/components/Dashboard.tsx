"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnalysisResult } from "@/application/dto/AnalysisResult";
import { ContributorDto } from "@/application/dto/ContributorDto";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContributorList } from "./ContributorList";
import { ImplementationActivityChart } from "./ImplementationActivityChart";
import { IdentityMerger } from "@/presentation/components/IdentityMerger";
import { PRThroughputSection } from "@/presentation/components/PRThroughputSection";
import { GitBranch, GitPullRequest, MessageSquare, Users } from "lucide-react";

export interface DashboardProps {
  result: AnalysisResult;
}

/**
 * Main dashboard component for displaying analysis results
 * Shows summary cards, charts, and contributor details
 */
export function Dashboard({ result }: DashboardProps) {
  const t = useTranslations("dashboard");
  const { analysis, summary } = result;
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
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{analysis.repositoryUrl}</p>
          <p className="text-sm text-muted-foreground">
            Analyzed: {new Date(analysis.analyzedAt).toLocaleString()} | Period:{" "}
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
            <CardTitle>Review Activity</CardTitle>
            <CardDescription>
              Top 10 contributors by review score
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
                        {contributor.reviewActivity.pullRequestsReviewed} PRs
                        reviewed ·{" "}
                        {contributor.reviewActivity.reviewCommentCount} comments
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {contributor.reviewActivity.reviewScore.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">score</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PR Throughput Analysis */}
      <PRThroughputSection throughput={result.throughput} />

      {/* Contributor List */}
      <ContributorList contributors={contributors} />
    </div>
  );
}
