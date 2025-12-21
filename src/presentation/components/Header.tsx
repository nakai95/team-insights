"use client";

import { UserProfile } from "./auth/UserProfile";

/**
 * Header Component
 *
 * Main application header with title, description, and authentication UI.
 * Displays user profile with sign-in/sign-out buttons based on auth state.
 *
 * Features:
 * - Application branding (title and tagline)
 * - User authentication status
 * - Sign in/out buttons
 * - User avatar and name when authenticated
 *
 * @example
 * ```tsx
 * <Header />
 * ```
 */
export function Header() {
  return (
    <header className="border-b">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left side: Branding */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Team Insights</h1>
            <p className="text-sm text-muted-foreground">
              Analyze GitHub repository contributor activity and metrics
            </p>
          </div>

          {/* Right side: User Profile */}
          <UserProfile />
        </div>
      </div>
    </header>
  );
}
