"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignInButton } from "./SignInButton";
import { SignOutButton } from "./SignOutButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * UserProfile Component
 *
 * Displays user profile information and authentication buttons.
 * Shows different UI based on authentication state.
 *
 * States:
 * - Loading: Shows skeleton loader
 * - Authenticated: Shows user avatar, name, and sign-out button
 * - Unauthenticated: Shows sign-in button
 * - Error: Redirects to login with error message
 *
 * Features:
 * - Uses NextAuth useSession hook for real-time session state
 * - Displays GitHub avatar and username
 * - Graceful loading and error states
 * - Automatic redirect on session errors
 * - Responsive layout
 *
 * @example
 * ```tsx
 * <UserProfile />
 * ```
 */
export function UserProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to login if session has an error
  useEffect(() => {
    if (session?.error) {
      router.push("/login?error=SessionExpired");
    }
  }, [session?.error, router]);

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex items-center space-x-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  // Unauthenticated state
  if (!session) {
    return <SignInButton />;
  }

  // Authenticated state
  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <Avatar>
          <AvatarImage
            src={session.user?.image || ""}
            alt={session.user?.name || "User"}
          />
          <AvatarFallback>
            {session.user?.name?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{session.user?.name}</span>
      </div>
      <SignOutButton />
    </div>
  );
}
