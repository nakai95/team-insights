"use client";

import { useTranslations } from "next-intl";
import { Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * AnalyticsEmptyState Component
 *
 * Purpose: Display helpful message when no repository is selected
 *
 * Features:
 * - Friendly message prompting user to select a repository
 * - Visual indicator pointing to repository switcher
 * - Centered, well-designed empty state
 *
 * Usage:
 * ```tsx
 * <AnalyticsEmptyState />
 * ```
 */

export function AnalyticsEmptyState() {
  const t = useTranslations("analytics.emptyState");

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Database className="h-12 w-12 text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{t("title")}</h2>
              <p className="text-muted-foreground">{t("description")}</p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">{t("howTo.title")}</p>
              <ol className="text-sm text-muted-foreground space-y-1 text-left">
                <li>1️⃣ {t("howTo.step1")}</li>
                <li>2️⃣ {t("howTo.step2")}</li>
                <li>3️⃣ {t("howTo.step3")}</li>
              </ol>
            </div>

            <p className="text-xs text-muted-foreground italic">
              {t("hint")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
