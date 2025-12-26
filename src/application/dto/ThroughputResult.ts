import { SizeBucket } from "@/domain/value-objects/SizeBucket";
import { ThroughputInsight } from "@/domain/value-objects/ThroughputInsight";
import { PRThroughput } from "@/domain/entities/PRThroughput";

/**
 * Scatter plot data point
 */
export interface ScatterDataPoint {
  prNumber: number;
  size: number;
  leadTime: number;
}

/**
 * DTO for PR Throughput Analysis results
 * Maps domain entity to presentation-friendly structure
 */
export interface ThroughputResult {
  totalMergedPRs: number;
  averageLeadTimeHours: number;
  averageLeadTimeDays: number;
  medianLeadTimeHours: number;
  medianLeadTimeDays: number;
  scatterData: ScatterDataPoint[];
  sizeBuckets: SizeBucket[];
  insight: ThroughputInsight;
}

/**
 * Convert PRThroughput domain entity to ThroughputResult DTO
 */
export function fromDomain(throughput: PRThroughput): ThroughputResult {
  return {
    totalMergedPRs: throughput.totalMergedPRs,
    averageLeadTimeHours: throughput.averageLeadTimeHours,
    averageLeadTimeDays: throughput.averageLeadTimeDays,
    medianLeadTimeHours: throughput.medianLeadTimeHours,
    medianLeadTimeDays: throughput.medianLeadTimeDays,
    scatterData: throughput.prData.map((pr) => ({
      prNumber: pr.prNumber,
      size: pr.size,
      leadTime: pr.leadTimeHours,
    })),
    sizeBuckets: throughput.sizeBuckets,
    insight: throughput.insight,
  };
}
