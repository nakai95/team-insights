"use client";

import { SimpleHeader } from "@/presentation/components/layout/SimpleHeader";
import { AppFooter } from "@/presentation/components/layout/AppFooter";

/**
 * Legal Pages Layout
 *
 * Purpose: Consistent layout for legal/public pages
 *
 * Pages in this group:
 * - Privacy policy (/privacy)
 * - Terms of service (/terms)
 *
 * Layout Structure:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Header: [Logo] .......................... [Theme Toggle]   │
 * ├────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │                      Page Content                          │
 * │                                                             │
 * ├────────────────────────────────────────────────────────────┤
 * │ Footer: © 2026 Team Insights | Terms | Privacy            │
 * └────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Simple header with logo and theme toggle
 * - Footer with legal links
 * - Clean, document-focused layout
 * - No sidebar or complex navigation
 */

interface LegalLayoutProps {
  children: React.ReactNode;
}

export default function LegalLayout({ children }: LegalLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <SimpleHeader />

      {/* Main content area */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <AppFooter />
    </div>
  );
}
