"use client";

import { AnalysisResult } from "@/application/dto/AnalysisResult";
import { OverviewTab } from "@/presentation/components/OverviewTab";
import { PRThroughputSection } from "@/presentation/components/PRThroughputSection";

export interface DashboardProps {
  result: AnalysisResult;
}

/**
 * Main dashboard component for displaying analysis results
 *
 * @deprecated This component has been superseded by AnalysisTabs.
 * Use AnalysisTabs for new implementations, which provides tab navigation.
 * This wrapper is maintained for backward compatibility.
 *
 * The content has been moved to:
 * - OverviewTab: Summary cards, charts, and contributor details
 * - PRThroughputSection: PR throughput analysis (already extracted)
 * - ChangesTimeseriesTab: PR changes timeseries (new feature)
 *
 * See: src/presentation/components/AnalysisTabs.tsx
 */
export function Dashboard({ result }: DashboardProps) {
  const { analysis, contributors, summary } = result;

  return (
    <div className="space-y-6">
      {/* Overview content (extracted to OverviewTab) */}
      <OverviewTab
        analysis={analysis}
        contributors={contributors}
        summary={summary}
      />

      {/* PR Throughput Analysis (kept in place for backward compatibility) */}
      <PRThroughputSection throughput={result.throughput} />
    </div>
  );
}
