import type { DateRange } from "@/domain/value-objects/DateRange";
import { getTranslations } from "next-intl/server";
import { getCachedContributors } from "@/app/[locale]/analytics/contributor-fetcher";
import { ContributorList } from "@/app/[locale]/components/ContributorList";
import { ImplementationActivityChart } from "@/app/[locale]/components/ImplementationActivityChart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, AlertCircle } from "lucide-react";

/**
 * TeamTab Component
 *
 * Purpose: Detailed team and contributor analysis
 *
 * Content:
 * - Implementation activity chart (commits, lines changed)
 * - Review activity breakdown
 * - Detailed contributor table with rankings and metrics
 *
 * Architecture:
 * - Server Component
 * - Fetches detailed contributor data via cached fetcher
 * - Reuses ContributorList and charts from dashboard
 *
 * Usage:
 * ```tsx
 * {activeTab === 'team' && (
 *   <TeamTab repositoryId={repositoryId} dateRange={dateRange} />
 * )}
 * ```
 */

interface TeamTabProps {
  repositoryId: string;
  dateRange: DateRange;
}

export async function TeamTab({ repositoryId, dateRange }: TeamTabProps) {
  const t = await getTranslations("analytics.tabs.team");

  // Fetch contributor data
  const result = await getCachedContributors(repositoryId, dateRange);

  // Handle error
  if (!result.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t("error.title")}
          </CardTitle>
          <CardDescription>{t("error.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
            {result.error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  const contributors = result.value;

  // Handle empty state
  if (contributors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">{t("emptyState.title")}</p>
            <p className="text-sm">{t("emptyState.description")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Implementation Activity Chart */}
        <ImplementationActivityChart
          contributors={contributors}
          maxContributors={10}
        />

        {/* Review Activity Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reviewActivity.title")}</CardTitle>
            <CardDescription>{t("reviewActivity.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contributors
                .sort(
                  (a, b) =>
                    b.reviewActivity.reviewScore -
                    a.reviewActivity.reviewScore,
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
                        {t("reviewActivity.prsReviewed")} ·{" "}
                        {contributor.reviewActivity.reviewCommentCount}{" "}
                        {t("reviewActivity.comments")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {contributor.reviewActivity.reviewScore.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("reviewActivity.score")}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Contributor Table */}
      <ContributorList contributors={contributors} />
    </div>
  );
}
