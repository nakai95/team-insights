"use client";

import { Suspense } from "react";
import DashboardContent from "./DashboardContent";

/**
 * Dedicated dashboard page for displaying analysis results
 * Can be used for deep-linking to specific analyses or bookmarking results
 */
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-8 bg-background">Loading...</div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
