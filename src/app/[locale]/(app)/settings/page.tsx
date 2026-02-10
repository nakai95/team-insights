import { getTranslations } from "next-intl/server";
import { AppFooter } from "@/presentation/components/layout";
import { LocaleSwitcher } from "@/presentation/components/shared/LocaleSwitcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Globe } from "lucide-react";

/**
 * Settings Page
 *
 * Purpose: Application settings and preferences
 *
 * Features:
 * - Language/locale selection
 * - Theme preferences (handled by ThemeToggle in header)
 * - Future: Additional user preferences
 *
 * Layout:
 * - Simple card-based layout
 * - Grouped by category
 * - Google Analytics style settings page
 */

export default async function SettingsPage() {
  const t = await getTranslations("settings");

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground mt-2">{t("description")}</p>
          </div>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t("language.title")}
              </CardTitle>
              <CardDescription>{t("language.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t("language.label")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("language.hint")}
                    </p>
                  </div>
                  <LocaleSwitcher />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Future settings sections can be added here */}
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
