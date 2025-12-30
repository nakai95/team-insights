"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SizeBucketData } from "@/application/dto/ThroughputResult";
import { SizeBucketType } from "@/domain/value-objects/SizeBucket";

export interface SizeBucketTableProps {
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
 * Size Bucket Table Component
 *
 * Displays a table showing PR size buckets with their metrics:
 * - Bucket name (S, M, L, XL)
 * - Line range (e.g., "1-50", "51-200")
 * - Average lead time in days
 * - PR count
 * - Percentage of total PRs
 *
 * Optionally highlights the optimal bucket with visual styling
 */
export function SizeBucketTable({
  sizeBuckets,
  optimalBucket,
}: SizeBucketTableProps) {
  const t = useTranslations("prThroughput.sizeBucketTable");

  /**
   * Format number to 1 decimal place
   */
  const formatDecimal = (value: number): string => {
    return value.toFixed(1);
  };

  /**
   * Check if a bucket should be highlighted
   */
  const isOptimal = (bucket: SizeBucketType): boolean => {
    return optimalBucket !== null && bucket === optimalBucket;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("headers.bucket")}</TableHead>
            <TableHead>{t("headers.lineRange")}</TableHead>
            <TableHead className="text-right">
              {t("headers.averageLeadTime")}
            </TableHead>
            <TableHead className="text-right">{t("headers.prCount")}</TableHead>
            <TableHead className="text-right">
              {t("headers.percentage")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sizeBuckets.map((bucket) => {
            const isHighlighted = isOptimal(bucket.bucket);

            return (
              <TableRow
                key={bucket.bucket}
                className={
                  isHighlighted
                    ? "bg-green-50 dark:bg-green-950 font-semibold"
                    : undefined
                }
              >
                <TableCell className="font-medium">{bucket.bucket}</TableCell>
                <TableCell>{bucket.lineRange}</TableCell>
                <TableCell className="text-right">
                  {formatDecimal(bucket.averageLeadTimeDays)} {t("days")}
                </TableCell>
                <TableCell className="text-right">{bucket.prCount}</TableCell>
                <TableCell className="text-right">
                  {formatDecimal(bucket.percentage)}%
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
