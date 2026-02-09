"use client";

import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../shared/ThemeToggle";
import { UserProfile } from "../auth/UserProfile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileSidebar } from "./MobileSidebar";
import { RepositorySwitcher } from "./RepositorySwitcher";
import { DateRangePicker } from "./DateRangePicker";

/**
 * AppHeader Component
 *
 * Purpose: Top header for analytics app (Google Analytics style)
 *
 * Features:
 * - Repository switcher (left side)
 * - Date range picker
 * - User controls (theme, profile) (right side)
 * - Mobile: Hamburger menu for sidebar
 *
 * Layout:
 * Desktop: [Repo Switcher] [Date Range] ......... [Theme] [User]
 * Mobile:  [☰ Menu] [Repo Switcher] ......... [User]
 *
 * Usage:
 * ```tsx
 * <AppHeader />
 * ```
 */

export function AppHeader() {
  const t = useTranslations("layout.header");

  return (
    <header className="border-b bg-background">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Left side: Mobile menu + Logo + Repository Switcher + Date Range */}
        <div className="flex items-center gap-3 lg:gap-6">
          {/* Mobile menu button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label={t("mobileMenu")}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <MobileSidebar />
            </SheetContent>
          </Sheet>

          {/* Team Insights Logo */}
          <div className="flex items-center gap-2 text-lg font-semibold">
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
            <span className="hidden lg:inline">Team Insights</span>
          </div>

          {/* Repository Switcher */}
          <RepositorySwitcher />

          {/* Date Range Picker (hidden on mobile) */}
          <div className="hidden md:block">
            <DateRangePicker />
          </div>
        </div>

        {/* Right side: Controls */}
        <div className="flex items-center gap-2 md:gap-4">
          <ThemeToggle />
          <UserProfile />
        </div>
      </div>
    </header>
  );
}
