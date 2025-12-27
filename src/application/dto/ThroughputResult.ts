import { SizeBucket, SizeBucketType } from "@/domain/value-objects/SizeBucket";
import {
  ThroughputInsight,
  InsightType,
} from "@/domain/value-objects/ThroughputInsight";
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
 * Plain object representation of SizeBucket for serialization
 */
export interface SizeBucketData {
  bucket: SizeBucketType;
  lineRange: string;
  averageLeadTimeHours: number;
  averageLeadTimeDays: number;
  prCount: number;
  percentage: number;
}

/**
 * Plain object representation of ThroughputInsight for serialization
 */
export interface ThroughputInsightData {
  type: InsightType;
  message: string;
  optimalBucket: SizeBucketType | null;
}

/**
 * DTO for PR Throughput Analysis results
 * Maps domain entity to presentation-friendly structure
 * All nested objects are plain objects (not class instances) for Next.js serialization
 */
export interface ThroughputResult {
  totalMergedPRs: number;
  averageLeadTimeHours: number;
  averageLeadTimeDays: number;
  medianLeadTimeHours: number;
  medianLeadTimeDays: number;
  scatterData: ScatterDataPoint[];
  sizeBuckets: SizeBucketData[];
  insight: ThroughputInsightData;
}

/**
 * Convert SizeBucket to plain object
 */
function sizeBucketToData(bucket: SizeBucket): SizeBucketData {
  return {
    bucket: bucket.bucket,
    lineRange: bucket.lineRange,
    averageLeadTimeHours: bucket.averageLeadTimeHours,
    averageLeadTimeDays: bucket.averageLeadTimeDays,
    prCount: bucket.prCount,
    percentage: bucket.percentage,
  };
}

/**
 * Convert ThroughputInsight to plain object
 */
function insightToData(insight: ThroughputInsight): ThroughputInsightData {
  return {
    type: insight.type,
    message: insight.message,
    optimalBucket: insight.optimalBucket,
  };
}

/**
 * Convert PRThroughput domain entity to ThroughputResult DTO
 * Converts all class instances to plain objects for Next.js serialization
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
    sizeBuckets: throughput.sizeBuckets.map(sizeBucketToData),
    insight: insightToData(throughput.insight),
  };
}
