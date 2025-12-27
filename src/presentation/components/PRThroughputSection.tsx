"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThroughputResult } from "@/application/dto/ThroughputResult";
import { SummaryStats } from "./SummaryStats";
import { EmptyState } from "./EmptyState";
import { PRSizeVsLeadTimeChart } from "./PRSizeVsLeadTimeChart";

export interface PRThroughputSectionProps {
  /**
   * Throughput analysis result from AnalyzeRepository use case
   * Can be null or undefined if no throughput data is available
   */
  throughput?: ThroughputResult | null;
}

/**
 * Main PR Throughput Analysis Section Component
 *
 * Displays:
 * - Summary statistics (average, median, count)
 * - Scatter plot (PR size vs lead time) - User Story 2
 * - Empty state when no merged PRs available
 *
 * Future enhancements (User Stories 3-4):
 * - Size bucket table and bar chart
 * - Automated insight message
 */
export function PRThroughputSection({ throughput }: PRThroughputSectionProps) {
  const t = useTranslations("prThroughput");

  // Show empty state if no data or no merged PRs
  const showEmptyState = !throughput || throughput.totalMergedPRs === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <CardContent>
        {showEmptyState ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {/* Summary Statistics */}
            <SummaryStats
              averageLeadTimeDays={throughput.averageLeadTimeDays}
              medianLeadTimeDays={throughput.medianLeadTimeDays}
              totalMergedPRs={throughput.totalMergedPRs}
            />

            {/* Scatter Plot: PR Size vs Lead Time */}
            {throughput.scatterData && throughput.scatterData.length > 0 && (
              <div className="mt-6">
                <PRSizeVsLeadTimeChart data={throughput.scatterData} />
              </div>
            )}

            {/* Future: Size bucket table, bar chart, and insights will be added here */}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
