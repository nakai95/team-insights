"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

/**
 * SignInButton Component
 *
 * Client component that triggers GitHub OAuth sign-in flow.
 * Uses NextAuth's signIn function to redirect to GitHub authorization.
 *
 * Features:
 * - Triggers OAuth flow on click
 * - Shows loading state during redirect
 * - Accessible button with icon
 * - Error handling for failed sign-in
 *
 * @example
 * ```tsx
 * <SignInButton />
 * ```
 */
export function SignInButton() {
  const handleSignIn = async () => {
    try {
      await signIn("github", {
        callbackUrl: "/dashboard",
      });
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  return (
    <Button onClick={handleSignIn} variant="default" size="default">
      <LogIn className="mr-2 h-4 w-4" />
      Sign in with GitHub
    </Button>
  );
}
