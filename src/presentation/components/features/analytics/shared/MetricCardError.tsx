import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * MetricCardError Component
 *
 * Purpose: Error state display for metric card widgets
 *
 * Features:
 * - Shows error icon and message
 * - Maintains metric card layout and dimensions
 * - Non-blocking: other widgets continue loading
 * - Graceful degradation for failed widgets
 *
 * Usage:
 * ```typescript
 * const result = await fetchPRs();
 * if (!result.ok) {
 *   return <MetricCardError icon={GitPullRequest} error={result.error.message} />;
 * }
 * ```
 */

interface MetricCardErrorProps {
  /**
   * Icon component to display alongside error (from lucide-react)
   * Example: GitPullRequest, GitCommit, Users, etc.
   */
  icon: LucideIcon;

  /**
   * Optional error message to display
   * If not provided, shows default "Failed to load" message
   */
  error?: string;
}

export function MetricCardError({ icon: Icon, error }: MetricCardErrorProps) {
  const t = useTranslations("analytics.errors");

  return (
    <Card className="border-destructive">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-destructive">
          {t("failedToLoad")}
        </CardTitle>
        <Icon className="h-4 w-4 text-destructive" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p className="text-xs">{error || t("failedToLoad")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
