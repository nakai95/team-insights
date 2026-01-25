"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  OutlierWeekDto,
  ChangeTrendDto,
  TimeseriesSummary,
} from "@/application/dto/TimeseriesResult";
import { TrendDirection } from "@/domain/value-objects/ChangeTrend";

export interface TimeseriesInsightsProps {
  /** Outlier weeks for display */
  outlierWeeks: OutlierWeekDto[];
  /** Trend analysis (null if insufficient data) */
  trend: ChangeTrendDto | null;
  /** Summary statistics */
  summary: TimeseriesSummary;
}

/**
 * Timeseries Insights Component
 *
 * Displays:
 * - Outlier weeks (abnormally high code changes)
 * - Trend analysis (increasing/decreasing/stable)
 * - Summary statistics (total PRs, average changes, etc.)
 *
 * This component implements User Story 2, 3, and 4 from the feature specification.
 */
export function TimeseriesInsights({
  outlierWeeks,
  trend,
  summary,
}: TimeseriesInsightsProps) {
  const t = useTranslations("prTimeseries.insights");

  return (
    <div className="space-y-6">
      {/* Outlier Weeks Section (US2) */}
      {outlierWeeks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
              {t("outliers.title")}
            </CardTitle>
            <CardDescription>{t("outliers.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {outlierWeeks.map((outlier) => {
                const weekDate = new Date(outlier.weekStart).toLocaleDateString(
                  undefined,
                  {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  },
                );

                return (
                  <Alert
                    key={outlier.weekStart}
                    className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    <AlertTitle className="text-amber-900 dark:text-amber-100">
                      {t("outliers.weekOf", { date: weekDate })}
                    </AlertTitle>
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      <div className="mt-2 space-y-1 text-sm">
                        <p>
                          <strong>{t("outliers.totalChanges")}:</strong>{" "}
                          {outlier.totalChanges.toLocaleString()}{" "}
                          {t("outliers.lines")}
                        </p>
                        <p>
                          <strong>{t("outliers.prCount")}:</strong>{" "}
                          {outlier.prCount} {t("outliers.prs")}
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          {t("outliers.zScore", {
                            zScore: outlier.zScore.toFixed(2),
                          })}{" "}
                          (
                          {t("outliers.mean", {
                            mean: Math.round(
                              outlier.meanValue,
                            ).toLocaleString(),
                          })}
                          , σ=
                          {Math.round(outlier.stdDeviation).toLocaleString()})
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trend Analysis Section (US3) - Coming in future tasks */}
      {trend && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {trend.direction === TrendDirection.INCREASING && (
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-500" />
              )}
              {trend.direction === TrendDirection.DECREASING && (
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500" />
              )}
              {trend.direction === TrendDirection.STABLE && (
                <Minus className="h-5 w-5 text-gray-600 dark:text-gray-500" />
              )}
              {t("trend.title")}
            </CardTitle>
            <CardDescription>{t("trend.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Trend visualization coming soon (T028-T031)
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                Direction: {trend.direction}, Change:{" "}
                {trend.percentChange.toFixed(1)}%
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics Section (US4) - Coming in future tasks */}
      <Card>
        <CardHeader>
          <CardTitle>{t("summary.title")}</CardTitle>
          <CardDescription>{t("summary.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Summary statistics coming soon (T032-T034)
            </p>
            <div className="mt-2 text-xs text-muted-foreground">
              Total PRs: {summary.totalPRs}, Weeks: {summary.weeksAnalyzed}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
