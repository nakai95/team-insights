"use client";

import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BarChart3, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MobileSidebar Component
 *
 * Purpose: Mobile version of the sidebar navigation
 *
 * Features:
 * - Same navigation items as desktop sidebar
 * - Shown in Sheet drawer on mobile
 * - Active state highlighting
 *
 * Usage:
 * ```tsx
 * <Sheet>
 *   <SheetContent side="left">
 *     <MobileSidebar />
 *   </SheetContent>
 * </Sheet>
 * ```
 */

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  tab?: string;
}

export function MobileSidebar() {
  const t = useTranslations("layout.sidebar");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const repo = searchParams.get("repo");
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const range = searchParams.get("range");
  const currentTab = searchParams.get("tab") || "overview";

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
      href: "/settings",
      tab: undefined,
    },
  ];

  const isActive = (item: NavigationItem) => {
    if (item.tab) {
      return currentTab === item.tab;
    }
    // For settings page, check if pathname includes /settings
    if (item.id === "settings") {
      return pathname.includes("/settings");
    }
    return pathname === item.href;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold">Team Insights</h2>
      </div>

      <nav className="flex-1 p-3 space-y-1">
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
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
