"use client";

import { useAnalysis } from "./hooks/useAnalysis";
import { AnalysisForm } from "./components/AnalysisForm";
import { Dashboard } from "./components/Dashboard";
import { ProgressIndicator } from "./components/ProgressIndicator";
import { Header } from "@/presentation/components/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Home page with analysis form and results
 * Handles the complete analysis workflow using useAnalysis hook
 */
export default function Home() {
  const { state, analyze, reset } = useAnalysis();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Idle State: Show Form */}
          {state.status === "idle" && <AnalysisForm onSubmit={analyze} />}

          {/* Loading State: Show Progress */}
          {state.status === "loading" && <ProgressIndicator />}

          {/* Error State: Show Error Message */}
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
                    {state.error.details ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer">
                          Technical Details
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
                <Button onClick={reset}>Try Again</Button>
              </div>
            </div>
          )}

          {/* Success State: Show Dashboard */}
          {state.status === "success" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" onClick={reset}>
                  Analyze Another Repository
                </Button>
              </div>
              <Dashboard result={state.data} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
