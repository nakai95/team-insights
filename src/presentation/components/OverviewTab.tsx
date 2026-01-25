"use client";

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

export interface OverviewTabProps {
  /** Contributors list for display */
  contributors: ContributorDto[];
}

/**
 * Overview Tab Component
 *
 * Displays:
 * - Implementation activity chart
 * - Review activity chart
 * - Contributor list
 *
 * Note: Header, summary cards, and identity merger are now in AnalysisTabs (shared across all tabs)
 */
export function OverviewTab({ contributors }: OverviewTabProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="space-y-6">
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
