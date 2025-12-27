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
 * - Empty state when no merged PRs available
 *
 * Future enhancements (User Stories 2-4):
 * - Scatter plot (PR size vs lead time)
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
            <SummaryStats
              averageLeadTimeDays={throughput.averageLeadTimeDays}
              medianLeadTimeDays={throughput.medianLeadTimeDays}
              totalMergedPRs={throughput.totalMergedPRs}
            />
            {/* Future: Scatter plot, size bucket analysis, and insights will be added here */}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
