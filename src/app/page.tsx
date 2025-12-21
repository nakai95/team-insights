"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SignInButton } from "@/presentation/components/auth/SignInButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GitBranch, Users, BarChart, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Landing Page
 *
 * Public landing page for unauthenticated users.
 * Authenticated users are automatically redirected to /dashboard.
 *
 * Features:
 * - Product overview and value proposition
 * - Feature highlights with icons
 * - Clear call-to-action for GitHub sign-in
 * - Automatic redirect for authenticated users
 */
export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  // Show loading state during auth check
  if (status === "loading") {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 mb-16">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-2/3 mx-auto" />
          <div className="flex justify-center">
            <Skeleton className="h-10 w-48" />
          </div>
        </div>
      </main>
    );
  }

  // Show landing page for unauthenticated users
  return (
    <main className="container mx-auto px-4 py-16">
      {/* Hero Section */}
      <div className="text-center space-y-6 mb-16">
        <h1 className="text-5xl font-bold tracking-tight">Team Insights</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Analyze GitHub repository contributor activity and metrics to
          understand your team&apos;s development patterns
        </p>
        <div className="flex justify-center pt-4">
          <SignInButton />
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <GitBranch className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Repository Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Deep dive into repository activity with commit history, pull
              requests, and code review metrics
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Users className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Contributor Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Track individual contributor metrics including implementation
              work, code reviews, and collaboration patterns
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <BarChart className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Visual Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Interactive charts and visualizations to understand activity
              trends and team dynamics over time
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Shield className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Secure OAuth</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Safe and secure GitHub OAuth authentication with read-only access
              to your repositories
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* How It Works Section */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">
                Sign In with GitHub
              </h3>
              <p className="text-muted-foreground">
                Authenticate securely using your GitHub account. We only request
                read access to repositories.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">
                Enter Repository URL
              </h3>
              <p className="text-muted-foreground">
                Provide the GitHub repository URL you want to analyze. Works
                with both public and private repositories you have access to.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">
                View Detailed Insights
              </h3>
              <p className="text-muted-foreground">
                Get comprehensive analytics including contributor metrics,
                activity trends, and team collaboration patterns.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center space-y-4 py-8">
        <h2 className="text-3xl font-bold">Ready to get started?</h2>
        <p className="text-muted-foreground mb-6">
          Sign in with your GitHub account to start analyzing repositories
        </p>
        <SignInButton />
      </div>
    </main>
  );
}
