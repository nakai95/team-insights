import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale } from "./config";

/**
 * Routing Configuration for i18n
 *
 * Locale Detection Cascade (when localeDetection: true):
 * 1. Locale prefix in URL (e.g., /ja/dashboard)
 * 2. NEXT_LOCALE cookie from previous visit
 * 3. Accept-Language header (browser language)
 * 4. defaultLocale as fallback
 *
 * The NEXT_LOCALE cookie is automatically set when users:
 * - Visit a locale-prefixed URL
 * - Switch language via LocaleSwitcher
 *
 * This ensures browser language preferences are respected on first visit,
 * while user's manual language selection is preserved for subsequent visits.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true, // Enable Accept-Language header detection
});
