"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { UserProfile } from "./auth/UserProfile";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Header Component
 *
 * Main application header with title, description, and authentication UI.
 * Displays user profile with sign-in/sign-out buttons based on auth state.
 *
 * Features:
 * - Application branding (title and tagline) with link to home
 * - User authentication status
 * - Sign in/out buttons
 * - User avatar and name when authenticated
 * - Locale switcher for language selection
 *
 * @example
 * ```tsx
 * <Header />
 * ```
 */
export function Header() {
  const t = useTranslations("common");

  return (
    <header className="border-b">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left side: Branding */}
          <Link
            href="/"
            className="space-y-1 hover:opacity-80 transition-opacity"
          >
            <h1 className="text-2xl font-bold">{t("appName")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("appDescription")}
            </p>
          </Link>

          {/* Right side: Theme Toggle, Locale Switcher and User Profile */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LocaleSwitcher />
            <UserProfile />
          </div>
        </div>
      </div>
    </header>
  );
}
