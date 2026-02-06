/**
 * Dashboard Loading State
 *
 * Purpose: Suspense boundary fallback for dashboard page
 *
 * This file is automatically used by Next.js 15 App Router when:
 * - Dashboard page is loading (Server Component fetch)
 * - Navigation to dashboard is in progress
 * - Any Suspense boundary in dashboard triggers
 *
 * Performance:
 * - Displays within <500ms of navigation
 * - Shows structural skeleton matching final layout
 * - Provides immediate visual feedback
 *
 * Usage: Automatic - Next.js renders this during Suspense
 *
 * Reference:
 * https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
 */

import { DashboardSkeleton } from "@/presentation/components/layout/DashboardSkeleton";

export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
