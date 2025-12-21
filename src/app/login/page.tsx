"use client";

import { SignInButton } from "@/presentation/components/auth/SignInButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSearchParams } from "next/navigation";

/**
 * Login Page
 *
 * Dedicated page for user authentication via GitHub OAuth.
 * Displays sign-in button and handles callback URL for post-login redirect.
 *
 * Features:
 * - GitHub OAuth sign-in button
 * - Preserves destination URL for redirect after login
 * - Clean, centered layout
 * - User-friendly messaging
 *
 * Query Parameters:
 * - callbackUrl: URL to redirect to after successful authentication
 */
export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Team Insights</CardTitle>
          <CardDescription>
            Sign in with your GitHub account to analyze repository activity
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            You need to authenticate with GitHub to access repository analysis
            features.
          </p>
          <SignInButton />
          {callbackUrl && (
            <p className="text-xs text-muted-foreground text-center">
              After signing in, you&apos;ll be redirected to your requested
              page.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
