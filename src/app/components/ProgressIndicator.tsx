"use client";

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
  message = "Analyzing repository...",
  progress,
}: ProgressIndicatorProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Analysis in Progress
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress !== undefined && (
          <>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              {Math.round(progress)}% complete
            </p>
          </>
        )}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>This may take a few minutes depending on repository size:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Cloning repository</li>
            <li>Fetching commit history</li>
            <li>Analyzing pull requests</li>
            <li>Processing review comments</li>
            <li>Calculating metrics</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
