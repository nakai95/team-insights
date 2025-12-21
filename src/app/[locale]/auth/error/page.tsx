"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/**
 * Authentication Error Page
 *
 * Handles OAuth and session errors with user-friendly messages.
 * Automatically signs out to clear invalid session state.
 *
 * Features:
 * - Displays error-specific messages
 * - Auto sign-out to prevent redirect loops
 * - Retry authentication option
 * - Clear call-to-action
 *
 * Error Types:
 * - AccessDenied: User cancelled OAuth authorization
 * - OAuthSignin: Failed to construct authorization URL
 * - OAuthCallback: Failed to handle callback
 * - OAuthAccountNotLinked: Email already linked to different account
 * - RefreshAccessTokenError: Session expired or token revoked
 * - Default: Generic authentication error
 *
 * Query Parameters:
 * - error: The error code from NextAuth
 */
export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");
  const t = useTranslations("auth.errors");
  const tActions = useTranslations("auth.actions");

  // Auto sign-out to clear invalid session and prevent redirect loops
  useEffect(() => {
    signOut({ redirect: false });
  }, []);

  // Get user-friendly error message based on error code
  const getErrorMessage = (errorCode: string | null) => {
    const key = errorCode || "default";
    return {
      title: t(`${key}.title`),
      message: t(`${key}.message`),
    };
  };

  const errorDetails = getErrorMessage(error);

  const handleTryAgain = () => {
    router.push("/login");
  };

  const handleGoHome = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("default.title")}</CardTitle>
          <CardDescription>{errorDetails.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{errorDetails.title}</AlertTitle>
            <AlertDescription>{errorDetails.message}</AlertDescription>
          </Alert>

          {error && (
            <div className="text-xs text-muted-foreground">
              <p>
                {t("errorCode")}:{" "}
                <code className="bg-muted px-1 py-0.5 rounded">{error}</code>
              </p>
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <Button onClick={handleTryAgain} className="w-full">
              {tActions("tryAgain")}
            </Button>
            <Button onClick={handleGoHome} variant="outline" className="w-full">
              {tActions("goHome")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
