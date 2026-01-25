"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch, GitPullRequest, MessageSquare, Users } from "lucide-react";

export interface AnalysisSummaryCardsProps {
  /** Summary statistics */
  summary: {
    totalContributors: number;
    totalCommits: number;
    totalPullRequests: number;
    totalReviewComments: number;
    analysisTimeMs: number;
  };
}

/**
 * Analysis summary cards component
 * Shared across all tabs, rendered above tab navigation
 */
export function AnalysisSummaryCards({ summary }: AnalysisSummaryCardsProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("summary.totalContributors")}
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalContributors}</div>
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
  );
}
