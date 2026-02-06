import { Suspense } from "react";
import DashboardContent from "./DashboardContent";
import { DashboardWithInitialData } from "./DashboardWithInitialData";
import { DateRange } from "@/domain/value-objects/DateRange";

interface DashboardPageProps {
  searchParams: Promise<{
    repo?: string;
    start?: string;
    end?: string;
    range?: string; // Preset range (e.g., "7d", "30d", "90d")
  }>;
}

/**
 * Dashboard page - Server Component with progressive loading support
 *
 * Two modes:
 * 1. With URL params (repo + optional date range) → Server Component fetches initial 30-day data
 * 2. Without URL params → Shows form for user input (existing flow)
 *
 * Progressive loading strategy:
 * - Server Component fetches initial data (30 days or custom range)
 * - Client Component displays data immediately
 * - Client Component loads historical data in background (Phase 4)
 */
export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  // Await searchParams in Next.js 15
  const params = await searchParams;

  // Check if we have repo URL in search params
  const repoUrl = params.repo;

  // If no repo URL, show the standard form-based flow
  if (!repoUrl) {
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

  // Parse date range from URL params
  const dateRange = parseDateRangeFromParams(params);

  // Render with Server Component that fetches initial data
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-8 bg-background">Loading...</div>
      }
    >
      <DashboardWithInitialData repositoryUrl={repoUrl} dateRange={dateRange} />
    </Suspense>
  );
}

/**
 * Parse date range from URL search params
 *
 * Priority:
 * 1. Preset range (range=7d|30d|90d|6m|1y)
 * 2. Custom range (start + end)
 * 3. Default (last 30 days)
 */
function parseDateRangeFromParams(searchParams: {
  start?: string;
  end?: string;
  range?: string;
}): DateRange {
  // Handle preset ranges
  if (searchParams.range) {
    switch (searchParams.range) {
      case "7d":
        return DateRange.last7Days();
      case "30d":
        return DateRange.last30Days();
      case "90d":
        return DateRange.last90Days();
      case "6m":
        return DateRange.last6Months();
      case "1y":
        return DateRange.lastYear();
    }
  }

  // Handle custom range
  if (searchParams.start && searchParams.end) {
    try {
      const start = new Date(searchParams.start);
      const end = new Date(searchParams.end);

      // Validate dates
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const result = DateRange.create(start, end);
        if (result.ok) {
          return result.value;
        }
      }
    } catch (error) {
      // Fall through to default
    }
  }

  // Default: last 30 days
  return DateRange.last30Days();
}
