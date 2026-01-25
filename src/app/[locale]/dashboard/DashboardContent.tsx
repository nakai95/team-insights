"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAnalysis } from "../hooks/useAnalysis";
import { AnalysisForm } from "../components/AnalysisForm";
import { AnalysisTabs } from "@/presentation/components/AnalysisTabs";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

/**
 * Dashboard content component that uses search params
 * Main application workspace for authenticated users
 * Includes analysis form, progress tracking, results display, and error handling
 */
export default function DashboardContent() {
  const searchParams = useSearchParams();
  const { state, analyze, reset } = useAnalysis();
  const t = useTranslations("dashboard");

  // Auto-trigger analysis from URL parameters if provided
  useEffect(() => {
    const repoUrl = searchParams.get("repo");
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

    if (repoUrl && state.status === "idle") {
      analyze({
        repositoryUrl: repoUrl,
        dateRange:
          startDate && endDate ? { start: startDate, end: endDate } : undefined,
      });
    }
  }, [searchParams, state.status, analyze]);

  return (
    <main className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Idle State: Show Form */}
        {state.status === "idle" && <AnalysisForm onSubmit={analyze} />}

        {/* Loading State: Show Progress */}
        {state.status === "loading" && (
          <ProgressIndicator dateRange={state.dateRange} />
        )}

        {/* Error State: Show Error Message */}
        {state.status === "error" && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("error.title")}</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p>
                    <strong>{t("error.errorCode")}:</strong> {state.error.code}
                  </p>
                  <p>
                    <strong>{t("error.message")}:</strong> {state.error.message}
                  </p>
                  {/* Show actionable guidance for permission errors */}
                  {(state.error.code === "INSUFFICIENT_PERMISSIONS" ||
                    state.error.code === "REPO_NOT_FOUND") && (
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <p className="font-semibold text-sm mb-2">
                        {t("error.permissionGuidance.title")}
                      </p>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>{t("error.permissionGuidance.step1")}</li>
                        <li>{t("error.permissionGuidance.step2")}</li>
                        <li>{t("error.permissionGuidance.step3")}</li>
                        <li>{t("error.permissionGuidance.step4")}</li>
                      </ul>
                    </div>
                  )}
                  {state.error.details ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer">
                        {t("error.technicalDetails")}
                      </summary>
                      <pre className="mt-2 text-xs overflow-auto p-2 bg-muted rounded">
                        {typeof state.error.details === "string"
                          ? state.error.details
                          : JSON.stringify(state.error.details, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              </AlertDescription>
            </Alert>
            <div className="flex justify-center">
              <Button onClick={reset}>{t("tryAgain")}</Button>
            </div>
          </div>
        )}

        {/* Success State: Show Dashboard with Tabs */}
        {state.status === "success" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={reset}>
                {t("analyzeAnother")}
              </Button>
            </div>
            <AnalysisTabs analysisResult={state.data} />
          </div>
        )}
      </div>
    </main>
  );
}
