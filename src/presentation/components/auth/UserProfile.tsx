"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { SignInButton } from "./SignInButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";

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
  const t = useTranslations("auth");

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
      </div>
    );
  }

  // Unauthenticated state
  if (!session) {
    return <SignInButton />;
  }

  // Authenticated state

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <Avatar className="cursor-pointer hover:opacity-80 transition-opacity">
          <AvatarImage
            src={session.user?.image || ""}
            alt={session.user?.name || "User"}
          />
          <AvatarFallback>
            {session.user?.name?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {session.user?.name}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t("signOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
