"use client";

import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

/**
 * AppLayout Component
 *
 * Purpose: Main application layout wrapper (Google Analytics style)
 *
 * Layout Structure:
 * ┌─────────────────────────────────────────────────────────┐
 * │ Header: [Repo Switcher] [Date Range] ... [User]        │
 * ├──────────┬──────────────────────────────────────────────┤
 * │ Sidebar  │ Main Content Area                            │
 * │          │                                               │
 * │ Overview │                                               │
 * │ Team     │                                               │
 * │ Settings │                                               │
 * │          │                                               │
 * └──────────┴──────────────────────────────────────────────┘
 *
 * Features:
 * - Fixed sidebar on desktop (Material Design style)
 * - Collapsible sidebar on mobile (Sheet drawer)
 * - Header with repository switcher and controls
 * - Scrollable main content area
 *
 * Usage:
 * ```tsx
 * export default function AnalyticsPage() {
 *   return (
 *     <AppLayout>
 *       <YourPageContent />
 *     </AppLayout>
 *   );
 * }
 * ```
 */

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Fixed Sidebar (desktop only) */}
      <AppSidebar />

      {/* Main area: Header + Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <AppHeader />

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
