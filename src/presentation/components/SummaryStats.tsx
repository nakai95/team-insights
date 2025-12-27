"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, GitMerge } from "lucide-react";

export interface SummaryStatsProps {
  averageLeadTimeDays: number;
  medianLeadTimeDays: number;
  totalMergedPRs: number;
}

export function SummaryStats({
  averageLeadTimeDays,
  medianLeadTimeDays,
  totalMergedPRs,
}: SummaryStatsProps) {
  const t = useTranslations("prThroughput.summaryStats");

  return (
    <div
      className="grid gap-4 md:grid-cols-3"
      role="region"
      aria-label="PR Throughput Summary Statistics"
    >
      {/* Average Lead Time Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("averageLeadTime")}
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div
            className="text-2xl font-bold"
            role="status"
            aria-live="polite"
            aria-label={`Average lead time: ${averageLeadTimeDays.toFixed(1)} days`}
          >
            {averageLeadTimeDays.toFixed(1)} {t("days")}
          </div>
        </CardContent>
      </Card>

      {/* Median Lead Time Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("medianLeadTime")}
          </CardTitle>
          <TrendingUp
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        </CardHeader>
        <CardContent>
          <div
            className="text-2xl font-bold"
            role="status"
            aria-live="polite"
            aria-label={`Median lead time: ${medianLeadTimeDays.toFixed(1)} days`}
          >
            {medianLeadTimeDays.toFixed(1)} {t("days")}
          </div>
        </CardContent>
      </Card>

      {/* Total Merged PRs Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("totalMergedPRs")}
          </CardTitle>
          <GitMerge
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        </CardHeader>
        <CardContent>
          <div
            className="text-2xl font-bold"
            role="status"
            aria-live="polite"
            aria-label={`Total merged pull requests: ${totalMergedPRs}`}
          >
            {totalMergedPRs}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
