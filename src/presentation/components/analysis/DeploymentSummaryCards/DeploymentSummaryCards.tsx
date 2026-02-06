"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, TrendingUp, Calendar, Clock } from "lucide-react";

export interface DeploymentSummaryCardsProps {
  /** Total number of deployments in the period */
  totalDeployments: number;
  /** Average deployments per week */
  averagePerWeek: number;
  /** Average deployments per month */
  averagePerMonth: number;
  /** Number of days in the analysis period */
  periodDays: number;
}

/**
 * Deployment summary cards component
 * Displays key deployment frequency statistics
 */
export const DeploymentSummaryCards = React.memo(
  function DeploymentSummaryCards({
    totalDeployments,
    averagePerWeek,
    averagePerMonth,
    periodDays,
  }: DeploymentSummaryCardsProps) {
    const t = useTranslations("deployment.summary");

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalDeployments")}
            </CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalDeployments.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("allEvents")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("averagePerWeek")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averagePerWeek.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("weeklyRate")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("averagePerMonth")}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averagePerMonth.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("monthlyRate")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("analysisPeriod")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodDays}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {periodDays === 1 ? t("dayOfData") : t("daysOfData")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  },
);
