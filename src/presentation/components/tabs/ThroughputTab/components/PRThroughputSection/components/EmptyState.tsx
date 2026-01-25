"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { FileX } from "lucide-react";

export function EmptyState() {
  const t = useTranslations("prThroughput");

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <FileX className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-center text-muted-foreground">{t("emptyState")}</p>
      </CardContent>
    </Card>
  );
}
