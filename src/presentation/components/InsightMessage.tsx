"use client";

import { useTranslations } from "next-intl";
import { InsightType } from "@/domain/value-objects/ThroughputInsight";
import { ThroughputInsightData } from "@/application/dto/ThroughputResult";
import { CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface InsightMessageProps {
  /**
   * The insight data to display (plain object from DTO)
   */
  insight: ThroughputInsightData;
}

/**
 * InsightMessage Component
 *
 * Displays automated insight message with appropriate styling and icons based on insight type:
 * - optimal: Green styling with success icon
 * - no_difference: Blue styling with info icon
 * - insufficient_data: Yellow styling with warning icon
 *
 * Translation is determined by insight type and uses i18n keys:
 * - prThroughput.insight.title.* for titles
 * - prThroughput.insight.message.* for descriptions
 */
export function InsightMessage({ insight }: InsightMessageProps) {
  const t = useTranslations("prThroughput.insight");

  // Determine styling, title, and message based on insight type
  const variantConfig = {
    [InsightType.OPTIMAL]: {
      icon: CheckCircle2,
      className:
        "border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100",
      iconClassName: "stroke-green-600 dark:stroke-green-400",
      titleKey: "title.optimal" as const,
      messageKey: "message.optimal" as const,
    },
    [InsightType.NO_DIFFERENCE]: {
      icon: Info,
      className:
        "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
      iconClassName: "stroke-blue-600 dark:stroke-blue-400",
      titleKey: "title.noDifference" as const,
      messageKey: "message.noDifference" as const,
    },
    [InsightType.INSUFFICIENT_DATA]: {
      icon: AlertTriangle,
      className:
        "border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100",
      iconClassName: "stroke-yellow-600 dark:stroke-yellow-400",
      titleKey: "title.insufficientData" as const,
      messageKey: "message.insufficientData" as const,
    },
  };

  const config = variantConfig[insight.type];
  const IconComponent = config.icon;

  // Get translated title and message
  const title = t(config.titleKey);
  const message =
    insight.type === InsightType.OPTIMAL && insight.optimalBucket
      ? t(config.messageKey, { bucketName: insight.optimalBucket })
      : t(config.messageKey);

  return (
    <Alert
      className={config.className}
      role="status"
      aria-live="polite"
      aria-label={`Insight: ${title}`}
    >
      <IconComponent
        className={`h-4 w-4 ${config.iconClassName}`}
        aria-hidden="true"
      />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
