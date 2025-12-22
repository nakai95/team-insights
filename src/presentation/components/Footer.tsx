"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Footer Component
 *
 * Application footer displayed on all pages.
 * Contains links to legal pages and contact information.
 *
 * Features:
 * - Privacy Policy link
 * - Terms of Service link
 * - Contact link (opens GitHub Issues in new tab)
 * - Copyright notice
 * - Responsive layout
 * - Matches Header styling (border, max-width, padding)
 *
 * @example
 * ```tsx
 * <Footer />
 * ```
 */
export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t mt-auto">
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left side: Copyright */}
          <div className="text-sm text-muted-foreground">{t("copyright")}</div>

          {/* Right side: Links */}
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("links.privacy")}
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("links.terms")}
            </Link>
            <a
              href="https://github.com/nakai95/team-insights/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("links.contact")}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
