"use client";

import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BarChart3, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AppSidebar Component
 *
 * Purpose: Fixed left sidebar navigation (Google Analytics style)
 *
 * Features:
 * - Material Design inspired fixed sidebar
 * - Navigation items with icons
 * - Active state highlighting
 * - Links maintain current repository and date range in URL
 *
 * Navigation Structure:
 * - Overview (default analytics view)
 * - Team (detailed contributor analysis)
 * - Settings (future)
 *
 * Usage:
 * ```tsx
 * <AppSidebar />
 * ```
 */

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  tab?: string; // For analytics tabs
}

export function AppSidebar() {
  const t = useTranslations("layout.sidebar");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current repository and date params to maintain in links
  const repo = searchParams.get("repo");
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const range = searchParams.get("range");
  const currentTab = searchParams.get("tab") || "overview";

  // Build query string for links
  const buildQueryString = (tab?: string) => {
    const params = new URLSearchParams();
    if (repo) params.set("repo", repo);
    if (tab) params.set("tab", tab);
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    if (range) params.set("range", range);
    return params.toString() ? `?${params.toString()}` : "";
  };

  const navigationItems: NavigationItem[] = [
    {
      id: "overview",
      label: t("overview"),
      icon: BarChart3,
      href: `/analytics${buildQueryString("overview")}`,
      tab: "overview",
    },
    {
      id: "team",
      label: t("team"),
      icon: Users,
      href: `/analytics${buildQueryString("team")}`,
      tab: "team",
    },
    {
      id: "settings",
      label: t("settings"),
      icon: Settings,
      href: "#",
      tab: undefined, // Not implemented yet
    },
  ];

  // Check if a navigation item is active
  const isActive = (item: NavigationItem) => {
    if (item.tab) {
      return currentTab === item.tab;
    }
    return pathname === item.href;
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r bg-muted/10">
      <div className="p-6">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                item.id === "settings" && "opacity-50 cursor-not-allowed",
              )}
              aria-current={active ? "page" : undefined}
              onClick={
                item.id === "settings"
                  ? (e) => e.preventDefault()
                  : undefined
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground">{t("footer")}</p>
      </div>
    </aside>
  );
}
