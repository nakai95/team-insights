"use client";

import { AppSidebar } from "@/presentation/components/layout/AppSidebar";
import { AppHeader } from "@/presentation/components/layout/AppHeader";

/**
 * App Layout
 *
 * Purpose: Main application layout wrapper (Google Analytics style)
 *
 * Pages in this group:
 * - Analytics dashboard (/analytics)
 * - Settings page (/settings)
 *
 * Layout Structure:
 * ┌──────────────────────────────────────────────────────────┐
 * │ Header: [Logo] [Repo] [Date] ......... [Theme] [User]   │
 * ├──────────┬───────────────────────────────────────────────┤
 * │ Sidebar  │ Main Content Area                             │
 * │          │                                                │
 * │ Overview │                                                │
 * │ Team     │                                                │
 * │ Settings │                                                │
 * │          │                                                │
 * └──────────┴───────────────────────────────────────────────┘
 *
 * Features:
 * - Fixed sidebar on desktop (Material Design style)
 * - Collapsible sidebar on mobile (Sheet drawer)
 * - Header with repository switcher and controls
 * - Scrollable main content area
 *
 * Note: AppFooter is NOT part of this layout - it's included
 * in individual pages as part of the scrollable content area.
 */

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header - Full width at top */}
      <AppHeader />

      {/* Content area: Sidebar + Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Sidebar (desktop only) */}
        <AppSidebar />

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
