"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

/**
 * SignOutButton Component
 *
 * Client component that signs out the current user and redirects to homepage.
 * Uses NextAuth's signOut function to clear session.
 *
 * Features:
 * - Signs out user on click
 * - Redirects to homepage after sign-out
 * - Accessible button with icon
 * - Error handling for failed sign-out
 *
 * @example
 * ```tsx
 * <SignOutButton />
 * ```
 */
export function SignOutButton() {
  const handleSignOut = async () => {
    try {
      await signOut({
        callbackUrl: "/",
      });
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <Button onClick={handleSignOut} variant="outline" size="default">
      <LogOut className="mr-2 h-4 w-4" />
      Sign out
    </Button>
  );
}
