"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

export interface ProgressIndicatorProps {
  message?: string;
  progress?: number;
}

/**
 * Component to display analysis progress
 * Shows a loading spinner and optional progress percentage
 */
export function ProgressIndicator({
  message,
  progress,
}: ProgressIndicatorProps) {
  const t = useTranslations("progress");
  const displayMessage = message || t("message");

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t("title")}
        </CardTitle>
        <CardDescription>{displayMessage}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress !== undefined && (
          <>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              {t("percentComplete", { percent: Math.round(progress) })}
            </p>
          </>
        )}
        <div className="text-sm text-muted-foreground space-y-1">
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>{t("steps.cloning")}</li>
            <li>{t("steps.commits")}</li>
            <li>{t("steps.pullRequests")}</li>
            <li>{t("steps.reviews")}</li>
            <li>{t("steps.metrics")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
