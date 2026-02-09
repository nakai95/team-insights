"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

/**
 * AppFooter Component
 *
 * Purpose: Footer displayed at the bottom of main content area
 *
 * Features:
 * - Links to Terms of Service and Privacy Policy
 * - Appears at bottom of scrollable content (Google Analytics style)
 * - Minimal, unobtrusive design
 *
 * Usage:
 * ```tsx
 * <AppFooter />
 * ```
 */

export function AppFooter() {
  const t = useTranslations("layout.footer");

  return (
    <footer className="border-t bg-background mt-12">
      <div className="px-4 py-6 lg:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Team Insights</p>
          <div className="flex items-center gap-6">
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              {t("terms")}
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              {t("privacy")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
