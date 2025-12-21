"use client";

import { useState, FormEvent, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { AnalysisRequest } from "@/application/dto/AnalysisRequest";
import { DateRange } from "@/domain/value-objects/DateRange";

export interface AnalysisFormProps {
  onSubmit: (request: AnalysisRequest) => void;
  isLoading?: boolean;
}

/**
 * Form component for inputting repository analysis parameters
 * Collects repository URL and optional date range
 * GitHub token is automatically sourced from authenticated session
 */
export function AnalysisForm({
  onSubmit,
  isLoading = false,
}: AnalysisFormProps) {
  const t = useTranslations("form");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Validate date range and get warnings
  const dateRangeValidation = useMemo(() => {
    if (!startDate || !endDate) {
      return { valid: true, error: null, warning: null };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const result = DateRange.create(start, end);
    if (!result.ok) {
      return { valid: false, error: result.error.message, warning: null };
    }

    const warning = result.value.getLargeRangeWarning();
    return { valid: true, error: null, warning };
  }, [startDate, endDate]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Don't submit if date range is invalid
    if (!dateRangeValidation.valid) return;

    const request: AnalysisRequest = {
      repositoryUrl: repositoryUrl.trim(),
      dateRange:
        startDate && endDate
          ? {
              start: startDate,
              end: endDate,
            }
          : undefined,
    };

    onSubmit(request);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("repositoryUrlHelp")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repository-url">{t("repositoryUrlRequired")}</Label>
            <Input
              id="repository-url"
              type="url"
              placeholder={t("repositoryUrlPlaceholder")}
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              {t("repositoryUrlHelp")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">{t("startDate")}</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isLoading}
                className={
                  dateRangeValidation.error ? "border-destructive" : ""
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">{t("endDate")}</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isLoading}
                className={
                  dateRangeValidation.error ? "border-destructive" : ""
                }
              />
            </div>
          </div>

          {dateRangeValidation.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{dateRangeValidation.error}</AlertDescription>
            </Alert>
          )}

          {dateRangeValidation.warning && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{dateRangeValidation.warning}</AlertDescription>
            </Alert>
          )}

          <p className="text-sm text-muted-foreground">{t("dateRangeHelp")}</p>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !dateRangeValidation.valid}
          >
            {isLoading ? t("analyzing") : t("analyze")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
