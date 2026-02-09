"use client";

import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

/**
 * AppLayout Component
 *
 * Purpose: Main application layout wrapper (Google Analytics style)
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
