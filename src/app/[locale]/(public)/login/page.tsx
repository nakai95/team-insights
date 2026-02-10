import { getTranslations } from "next-intl/server";
import { SignInButton } from "@/presentation/components/auth/SignInButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isEnvTokenMode } from "@/infrastructure/auth/env.schema";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Login Page
 *
 * Dedicated page for user authentication.
 * Supports two modes:
 * - OAuth Mode: Displays GitHub OAuth sign-in button
 * - Environment Token Mode (dev-only): Shows authenticated status
 *
 * Features:
 * - GitHub OAuth sign-in button (OAuth mode)
 * - Environment token status display (dev mode)
 * - Preserves destination URL for redirect after login
 * - Clean, centered layout
 * - User-friendly messaging
 *
 * Query Parameters:
 * - callbackUrl: URL to redirect to after successful authentication
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl;
  const t = await getTranslations("auth");
  const isEnvToken = isEnvTokenMode();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("welcome")}</CardTitle>
          <CardDescription>{t("welcomeDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {isEnvToken ? (
            <>
              <div className="w-full bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-800">
                  <strong>{t("envToken.title")}</strong>{" "}
                  {t("envToken.authenticated")}
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  {t("envToken.description")}
                </p>
              </div>
              <Link href="/analytics" className="w-full">
                <Button className="w-full">
                  {t("envToken.goToDashboard")}
                </Button>
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center">
                {t("helpText")}
              </p>
              <SignInButton />
              {callbackUrl && (
                <p className="text-xs text-muted-foreground text-center">
                  {t("redirectNotice")}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
