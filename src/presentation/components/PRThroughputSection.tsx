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
import { SizeBucketAnalysis } from "./SizeBucketAnalysis";
import { InsightMessage } from "./InsightMessage";

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
 * - Summary statistics (average, median, count) - User Story 1
 * - Scatter plot (PR size vs lead time) - User Story 2
 * - Size bucket table and bar chart - User Story 3
 * - Automated insight message - User Story 4
 * - Empty state when no merged PRs available
 */
export function PRThroughputSection({ throughput }: PRThroughputSectionProps) {
  const t = useTranslations("prThroughput");

  // Show empty state if no data or no merged PRs
  const showEmptyState = !throughput || throughput.totalMergedPRs === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle id="pr-throughput-title">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <CardContent>
        {showEmptyState ? (
          <EmptyState />
        ) : (
          <div
            className="space-y-6"
            role="region"
            aria-labelledby="pr-throughput-title"
          >
            {/* Summary Statistics */}
            <SummaryStats
              averageLeadTimeDays={throughput.averageLeadTimeDays}
              medianLeadTimeDays={throughput.medianLeadTimeDays}
              totalMergedPRs={throughput.totalMergedPRs}
            />

            {/* Scatter Plot: PR Size vs Lead Time */}
            {throughput.scatterData && throughput.scatterData.length > 0 && (
              <div
                className="mt-6"
                role="img"
                aria-label="PR Size vs Lead Time Scatter Plot"
              >
                <PRSizeVsLeadTimeChart data={throughput.scatterData} />
              </div>
            )}

            {/* Size Bucket Analysis: Table and Bar Chart */}
            {throughput.sizeBuckets && throughput.sizeBuckets.length > 0 && (
              <div
                className="mt-6"
                role="region"
                aria-label="Size Bucket Analysis"
              >
                <SizeBucketAnalysis
                  sizeBuckets={throughput.sizeBuckets}
                  optimalBucket={throughput.insight?.optimalBucket}
                />
              </div>
            )}

            {/* Automated Insight Message - User Story 4 */}
            {throughput.insight && (
              <InsightMessage insight={throughput.insight} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
