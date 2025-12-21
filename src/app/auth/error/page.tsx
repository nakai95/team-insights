"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
 * - Default: Generic authentication error
 *
 * Query Parameters:
 * - error: The error code from NextAuth
 */
export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");

  // Auto sign-out to clear invalid session and prevent redirect loops
  useEffect(() => {
    signOut({ redirect: false });
  }, []);

  // Get user-friendly error message based on error code
  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case "AccessDenied":
        return {
          title: "Authorization Cancelled",
          message:
            "You cancelled the GitHub authorization. Please try again to access the application.",
        };
      case "OAuthSignin":
        return {
          title: "Sign-In Failed",
          message:
            "Failed to initiate GitHub sign-in. Please check your network connection and try again.",
        };
      case "OAuthCallback":
        return {
          title: "Callback Failed",
          message:
            "Failed to process GitHub authorization. This may be due to an invalid or expired authorization code.",
        };
      case "OAuthAccountNotLinked":
        return {
          title: "Account Conflict",
          message:
            "Your email is already associated with a different GitHub account. Please use a different account.",
        };
      default:
        return {
          title: "Authentication Error",
          message:
            "An unexpected error occurred during sign-in. Please try again.",
        };
    }
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
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>There was a problem signing you in</CardDescription>
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
                Error code:{" "}
                <code className="bg-muted px-1 py-0.5 rounded">{error}</code>
              </p>
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <Button onClick={handleTryAgain} className="w-full">
              Try Again
            </Button>
            <Button onClick={handleGoHome} variant="outline" className="w-full">
              Go to Homepage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
