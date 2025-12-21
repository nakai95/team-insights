"use client";

import { useSearchParams } from "next/navigation";
import { useAnalysis } from "../hooks/useAnalysis";
import { Dashboard } from "../components/Dashboard";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Dashboard content component that uses search params
 * Separated to allow Suspense boundary wrapping
 */
export default function DashboardContent() {
  const searchParams = useSearchParams();
  const { state, analyze } = useAnalysis();

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
    <main className="min-h-screen p-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Loading State */}
        {state.status === "loading" && <ProgressIndicator />}

        {/* Error State */}
        {state.status === "error" && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Analysis Failed</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p>
                    <strong>Error Code:</strong> {state.error.code}
                  </p>
                  <p>
                    <strong>Message:</strong> {state.error.message}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
            <div className="flex justify-center">
              <Link href="/">
                <Button>Return to Home</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Success State */}
        {state.status === "success" && <Dashboard result={state.data} />}

        {/* Idle State */}
        {state.status === "idle" && (
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold">No Analysis Data</h1>
            <p className="text-muted-foreground">
              Start an analysis from the home page
            </p>
            <Link href="/">
              <Button>Go to Home</Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
