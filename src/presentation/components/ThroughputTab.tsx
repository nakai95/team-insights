"use client";

import { ThroughputResult } from "@/application/dto/ThroughputResult";
import { PRThroughputSection } from "./PRThroughputSection";

export interface ThroughputTabProps {
  /** PR throughput analysis data (optional, null if not available) */
  throughputData?: ThroughputResult | null;
}

/**
 * Throughput Tab Component
 *
 * Simple wrapper around the existing PRThroughputSection component.
 * This provides a clean separation between tab navigation and the
 * throughput analysis content.
 *
 * Displays:
 * - Summary statistics (average, median, count)
 * - Scatter plot (PR size vs lead time)
 * - Size bucket table and bar chart
 * - Automated insight message
 * - Empty state when no merged PRs available
 */
export function ThroughputTab({ throughputData }: ThroughputTabProps) {
  return <PRThroughputSection throughput={throughputData} />;
}
