"use client";

import Link from "next/link";
import { ThemeToggle } from "../shared/ThemeToggle";

/**
 * SimpleHeader Component
 *
 * Purpose: Lightweight header for legal/public pages (Privacy, Terms, etc.)
 *
 * Features:
 * - Team Insights logo with home link
 * - Theme toggle
 * - Minimal, clean design
 * - No authentication-specific controls
 *
 * Usage:
 * ```tsx
 * <SimpleHeader />
 * ```
 */

export function SimpleHeader() {
  return (
    <header className="border-b bg-background">
      <div className="flex items-center justify-between px-4 py-4 lg:px-6">
        {/* Left side: Logo + Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold hover:opacity-80 transition-opacity"
        >
          <svg
            className="h-6 w-6 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
          </svg>
          <span>Team Insights</span>
        </Link>

        {/* Right side: Theme toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
