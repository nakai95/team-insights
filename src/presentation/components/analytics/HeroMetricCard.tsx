import { Card, CardContent } from "@/components/ui/card";
import { TrendIndicator } from "@/domain/value-objects/TrendIndicator";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

/**
 * HeroMetricCard Component
 *
 * Purpose: Display a prominent metric with trend indicator
 *
 * Features:
 * - Large metric value display
 * - Icon for visual identification
 * - Trend indicator with arrow and percentage
 * - Comparison text (e.g., "vs last 30 days")
 * - Color-coded trend
 *
 * Layout:
 * ┌────────────────────────┐
 * │ [Icon] Title           │
 * │                        │
 * │ 45                     │  ← Large value
 * │ Subtitle               │
 * │                        │
 * │ ↑ +15% vs last period  │  ← Trend
 * └────────────────────────┘
 *
 * Usage:
 * ```tsx
 * <HeroMetricCard
 *   title="Deployments"
 *   value="28/week"
 *   subtitle="Per week"
 *   trend={trendIndicator}
 *   icon={Rocket}
 * />
 * ```
 */

interface HeroMetricCardProps {
  /**
   * Metric title
   */
  title: string;

  /**
   * Primary value to display (can be number or formatted string)
   */
  value: string | number;

  /**
   * Optional subtitle/description
   */
  subtitle?: string;

  /**
   * Trend indicator
   */
  trend?: TrendIndicator;

  /**
   * Icon component
   */
  icon: LucideIcon;

  /**
   * Optional color accent (defaults to primary)
   */
  accentColor?: "primary" | "success" | "warning" | "info";
}

export function HeroMetricCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  accentColor = "primary",
}: HeroMetricCardProps) {
  const accentClasses = {
    primary: "text-primary",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-blue-600 dark:text-blue-400",
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        {/* Header: Icon + Title */}
        <div className="flex items-center gap-2 mb-4">
          <Icon className={cn("h-5 w-5", accentClasses[accentColor])} />
          <h3 className="font-semibold text-sm text-muted-foreground">
            {title}
          </h3>
        </div>

        {/* Large Value */}
        <div className="mb-2">
          <div className="text-3xl font-bold">{value}</div>
          {subtitle && (
            <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>
          )}
        </div>

        {/* Trend Indicator */}
        {trend && (
          <div className="flex items-center gap-2 mt-4">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                trend.colorClass,
                trend.bgColorClass,
              )}
            >
              <span className="text-base leading-none">{trend.arrow}</span>
              <span>{trend.formattedPercentage}</span>
            </span>
            {trend.comparison && (
              <span className="text-xs text-muted-foreground">
                {trend.comparison}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
