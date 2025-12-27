"use client";

import { useTranslations } from "next-intl";
import { SizeBucketData } from "@/application/dto/ThroughputResult";
import { SizeBucketType } from "@/domain/value-objects/SizeBucket";
import { SizeBucketTable } from "./SizeBucketTable";
import { SizeBucketBarChart } from "./SizeBucketBarChart";

export interface SizeBucketAnalysisProps {
  /**
   * Size bucket analysis data (always 4 buckets: S, M, L, XL)
   */
  sizeBuckets: SizeBucketData[];

  /**
   * Optional bucket to highlight (optimal bucket from insight)
   */
  optimalBucket?: SizeBucketType | null;
}

/**
 * Size Bucket Analysis Component
 *
 * Wrapper component that combines:
 * - SizeBucketTable: Detailed metrics in table format
 * - SizeBucketBarChart: Visual comparison via bar chart
 *
 * Provides responsive layout:
 * - Mobile: Stacked vertically (chart on top, table below)
 * - Desktop: Side-by-side or full-width depending on screen size
 *
 * Both child components share the same data and optional highlighting
 * of the optimal bucket.
 */
export function SizeBucketAnalysis({
  sizeBuckets,
  optimalBucket,
}: SizeBucketAnalysisProps) {
  const t = useTranslations("prThroughput.sizeBucketAnalysis");

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div>
        <h3 className="text-lg font-semibold">{t("title")}</h3>
        <p className="text-sm text-gray-600">{t("description")}</p>
      </div>

      {/* Bar Chart */}
      <SizeBucketBarChart
        sizeBuckets={sizeBuckets}
        optimalBucket={optimalBucket}
      />

      {/* Table */}
      <SizeBucketTable
        sizeBuckets={sizeBuckets}
        optimalBucket={optimalBucket}
      />
    </div>
  );
}
