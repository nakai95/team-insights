# Quickstart Guide: GitHub OAuth Authentication

**Feature**: GitHub OAuth Authentication
**Date**: 2025-12-20
**Estimated Setup Time**: 30 minutes

## Prerequisites

- [ ] Node.js 20+ and pnpm installed
- [ ] Existing team-insights repository cloned
- [ ] GitHub account with permissions to create OAuth apps
- [ ] Basic understanding of Next.js App Router and Server Actions

## Overview

This guide walks you through implementing GitHub OAuth authentication using NextAuth.js v5. By the end, users will sign in with their GitHub account instead of manually entering personal access tokens.

**What You'll Build**:

1. GitHub OAuth app for authentication
2. NextAuth.js v5 configuration with JWT sessions
3. Session provider interface for Clean Architecture
4. Modified infrastructure adapters to use sessions
5. Authentication UI components (sign in/out buttons, user profile)
6. Protected routes via middleware

## Step 1: GitHub OAuth App Setup (5 minutes)

### Create OAuth Application

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in the form:
   - **Application name**: `Team Insights (Development)`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
   - **Description**: (optional) "Repository contribution analysis tool"
4. Click **"Register application"**
5. On the app page, click **"Generate a new client secret"**
6. **Copy both**:
   - Client ID (e.g., `Iv1.a1b2c3d4e5f6g7h8`)
   - Client secret (e.g., `abc123...`) - **Save this now, you won't see it again!**

### Production OAuth App (Optional)

Repeat the above for production:

- **Application name**: `Team Insights (Production)`
- **Homepage URL**: `https://your-domain.com`
- **Authorization callback URL**: `https://your-domain.com/api/auth/callback/github`

**Note**: GitHub requires separate OAuth apps for different callback URLs.

## Step 2: Install Dependencies (2 minutes)

```bash
cd /path/to/team-insights

# Install NextAuth v5 (currently in beta)
pnpm add next-auth@beta

# No additional dependencies needed - next-auth includes everything
```

Verify installation:

```bash
pnpm list next-auth
# Should show: next-auth 5.0.0-beta.x
```

## Step 3: Environment Configuration (3 minutes)

Create or update `.env.local`:

```bash
# .env.local

# GitHub OAuth (from Step 1)
AUTH_GITHUB_ID="Iv1.your_client_id_here"
AUTH_GITHUB_SECRET="your_client_secret_here"

# NextAuth Secret (generate with: openssl rand -base64 32)
AUTH_SECRET="your_random_32_char_string_here"

# Optional: Explicit URL (auto-detected in development)
# NEXTAUTH_URL="http://localhost:3000"
```

**Generate AUTH_SECRET**:

```bash
openssl rand -base64 32
# Copy the output to AUTH_SECRET in .env.local
```

**Security Check**:

- [ ] `.env.local` is in `.gitignore` (should already be)
- [ ] Never commit `AUTH_SECRET` or `AUTH_GITHUB_SECRET`
- [ ] Use different secrets for dev/staging/production

## Step 4: Create Domain Interface (5 minutes)

Create the session provider interface following Clean Architecture:

```bash
mkdir -p src/domain/interfaces
```

**File**: `src/domain/interfaces/ISessionProvider.ts`

```typescript
import { Result } from "@/lib/result";

/**
 * Interface for retrieving OAuth access tokens from authenticated sessions.
 * Maintains Clean Architecture by abstracting NextAuth implementation details.
 */
export interface ISessionProvider {
  /**
   * Retrieve GitHub OAuth access token from current session.
   * @returns Result with token if authenticated, error otherwise
   */
  getAccessToken(): Promise<Result<string>>;
}
```

## Step 5: Configure NextAuth (10 minutes)

### 5.1 Create TypeScript Type Extensions

**File**: `types/next-auth.d.ts`

```typescript
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    error?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
    error?: string;
  }
}
```

Update `tsconfig.json` to include types:

```json
{
  "compilerOptions": {
    // ... existing config
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    "types/**/*.d.ts" // Add this line
  ]
}
```

### 5.2 Create NextAuth Configuration

Create infrastructure directory:

```bash
mkdir -p src/infrastructure/auth
```

**File**: `src/infrastructure/auth/auth.config.ts`

```typescript
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // Extend session every 24 hours
  },
  callbacks: {
    async jwt({ token, account }) {
      // Store access token on initial sign-in
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
        };
      }
      return token;
    },
    async session({ session, token }) {
      // Add access token to session
      return {
        ...session,
        accessToken: token.accessToken as string,
        error: token.error as string | undefined,
      };
    },
  },
});
```

### 5.3 Create NextAuth Adapter

**File**: `src/infrastructure/auth/NextAuthAdapter.ts`

```typescript
import { auth } from "./auth.config";
import { ISessionProvider } from "@/domain/interfaces/ISessionProvider";
import { Result, ok, err } from "@/lib/result";
import { logger } from "@/lib/utils/logger";

export class NextAuthAdapter implements ISessionProvider {
  async getAccessToken(): Promise<Result<string>> {
    try {
      const session = await auth();

      if (!session) {
        logger.debug("No active session found");
        return err(new Error("No active session"));
      }

      if (session.error) {
        logger.error("Session error", { error: session.error });
        return err(new Error(`Session error: ${session.error}`));
      }

      if (!session.accessToken) {
        logger.error("No access token in session");
        return err(new Error("No access token in session"));
      }

      logger.debug("Access token retrieved successfully");
      return ok(session.accessToken);
    } catch (error) {
      logger.error("Failed to retrieve access token", { error });
      return err(new Error("Failed to retrieve access token"));
    }
  }
}
```

### 5.4 Create API Route Handler

```bash
mkdir -p src/app/api/auth/[...nextauth]
```

**File**: `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from "@/infrastructure/auth/auth.config";

export const { GET, POST } = handlers;
```

## Step 6: Implement Middleware for Route Protection (3 minutes)

**File**: `middleware.ts` (in project root, NOT in src/)

```typescript
import { auth } from "@/infrastructure/auth/auth.config";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/auth/error");
  const isPublicRoute = req.nextUrl.pathname === "/";

  // Redirect to error page if session has error
  if (req.auth?.error && req.nextUrl.pathname !== "/auth/error") {
    return NextResponse.redirect(new URL("/auth/error", req.nextUrl.origin));
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated && !isAuthPage && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  // Redirect away from auth pages if already authenticated
  if (isAuthenticated && isAuthPage && !req.auth?.error) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

// Run middleware on all routes except static files and API auth endpoints
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
```

## Step 7: Modify Infrastructure Adapters (5 minutes)

### 7.1 Modify OctokitAdapter

**File**: `src/infrastructure/github/OctokitAdapter.ts`

**Changes**:

1. Add constructor parameter for `ISessionProvider`
2. Remove `token` parameters from methods
3. Call `sessionProvider.getAccessToken()` internally

```typescript
// Add constructor
export class OctokitAdapter implements IGitHubAPI {
  private rateLimiter = new RateLimiter();

  constructor(private sessionProvider: ISessionProvider) {} // ADD THIS

  // Modify methods to get token from session
  async validateAccess(owner: string, repo: string): Promise<Result<boolean>> {
    const tokenResult = await this.sessionProvider.getAccessToken();
    if (!tokenResult.ok) return err(tokenResult.error);

    const token = tokenResult.value;
    // ... rest of implementation (use 'token' variable)
  }

  // Update all other methods similarly:
  // getPullRequests(owner, repo, sinceDate?)
  // getReviewComments(owner, repo, pullRequestNumbers)
  // getRateLimitStatus()
}
```

### 7.2 Modify SimpleGitAdapter

**File**: `src/infrastructure/git/SimpleGitAdapter.ts`

**Changes**:

1. Add constructor parameter for `ISessionProvider`
2. Modify `clone()` to inject token into URL

```typescript
export class SimpleGitAdapter implements IGitOperations {
  private git: SimpleGit;

  constructor(
    private sessionProvider: ISessionProvider, // ADD THIS
    options?: Partial<SimpleGitOptions>,
  ) {
    this.git = options ? simpleGit(options) : simpleGit();
  }

  async clone(
    url: string,
    targetPath: string,
    sinceDate?: Date,
  ): Promise<Result<void>> {
    try {
      const tokenResult = await this.sessionProvider.getAccessToken();
      if (!tokenResult.ok) return err(tokenResult.error);

      const token = tokenResult.value;

      // Inject token into URL: https://oauth2:TOKEN@github.com/owner/repo.git
      const authenticatedUrl = url.replace(
        "https://github.com/",
        `https://oauth2:${token}@github.com/`,
      );

      logger.debug(`Cloning repository to ${targetPath}`, {
        url: maskToken(authenticatedUrl),
        sinceDate: sinceDate?.toISOString(),
      });

      await this.git.clone(authenticatedUrl, targetPath);

      logger.info(`Successfully cloned repository to ${targetPath}`);
      return ok(undefined);
    } catch (error) {
      // ... error handling
    }
  }

  // getLog() method unchanged (no token needed)
}
```

### 7.3 Update AnalysisRequest DTO

**File**: `src/application/dto/AnalysisRequest.ts`

```typescript
// Remove githubToken field
export interface AnalysisRequest {
  repositoryUrl: string;
  // githubToken: string  // ← REMOVE THIS LINE
  dateRange?: {
    start: string;
    end: string;
  };
}
```

### 7.4 Modify analyzeRepository Server Action

**File**: `src/app/actions/analyzeRepository.ts`

**Changes**:

1. Remove `githubToken` validation
2. Inject `NextAuthAdapter` instead of accepting token parameter
3. Add authentication error handling

```typescript
import { NextAuthAdapter } from "@/infrastructure/auth/NextAuthAdapter";

export async function analyzeRepository(
  request: AnalysisRequest,
): Promise<Result<AnalysisResult, AnalysisError>> {
  try {
    // Remove githubToken validation
    if (!request.repositoryUrl) {
      return {
        ok: false,
        error: {
          code: AnalysisErrorCode.INVALID_URL,
          message: "Repository URL is required",
        },
      };
    }

    // Initialize session provider
    const sessionProvider = new NextAuthAdapter();

    // Initialize infrastructure with session provider
    const gitOperations = new SimpleGitAdapter(sessionProvider);
    const githubAPI = new OctokitAdapter(sessionProvider);
    const tempDirManager = new TempDirectoryManager();

    // ... rest of implementation
  } catch (error) {
    // ... error handling
  }
}
```

## Step 8: Create Authentication UI Components (10 minutes)

### 8.1 Session Provider Wrapper

**File**: `src/app/providers.tsx`

```typescript
"use client"

import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

Update root layout:

**File**: `src/app/layout.tsx`

```typescript
import { Providers } from "./providers"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### 8.2 Sign In Button

```bash
mkdir -p src/presentation/components/auth
```

**File**: `src/presentation/components/auth/SignInButton.tsx`

```typescript
"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/presentation/components/ui/button"  // Adjust path as needed

export function SignInButton() {
  return (
    <Button
      onClick={() => signIn("github", { callbackUrl: "/" })}
      variant="default"
    >
      Sign in with GitHub
    </Button>
  )
}
```

### 8.3 Sign Out Button

**File**: `src/presentation/components/auth/SignOutButton.tsx`

```typescript
"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/presentation/components/ui/button"

export function SignOutButton() {
  return (
    <Button onClick={() => signOut({ callbackUrl: "/" })} variant="ghost">
      Sign out
    </Button>
  )
}
```

### 8.4 User Profile Component

**File**: `src/presentation/components/auth/UserProfile.tsx`

```typescript
"use client"

import { useSession } from "next-auth/react"
import { SignInButton } from "./SignInButton"
import { SignOutButton } from "./SignOutButton"

export function UserProfile() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session) {
    return <SignInButton />
  }

  return (
    <div className="flex items-center gap-4">
      {session.user?.image && (
        <img
          src={session.user.image}
          alt={session.user.name || "User"}
          className="w-8 h-8 rounded-full"
        />
      )}
      <span>{session.user?.name || session.user?.email}</span>
      <SignOutButton />
    </div>
  )
}
```

### 8.5 Update Header Component

**File**: `src/presentation/components/Header.tsx` (or wherever your header is)

```typescript
import { UserProfile } from "./auth/UserProfile"

export function Header() {
  return (
    <header className="flex justify-between items-center p-4">
      <h1>Team Insights</h1>
      <UserProfile />
    </header>
  )
}
```

### 8.6 Login Page

```bash
mkdir -p src/app/login
```

**File**: `src/app/login/page.tsx`

```typescript
import { SignInButton } from "@/presentation/components/auth/SignInButton"

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Welcome to Team Insights</h1>
      <p className="mb-8">Sign in with your GitHub account to continue</p>
      <SignInButton />
    </div>
  )
}
```

### 8.7 Auth Error Page

```bash
mkdir -p src/app/auth/error
```

**File**: `src/app/auth/error/page.tsx`

```typescript
"use client"

import { useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { signOut } from "next-auth/react"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  // Auto sign-out to clear invalid session
  useEffect(() => {
    signOut({ redirect: false })
  }, [])

  const errorMessages: Record<string, string> = {
    OAuthSignin: "Failed to start GitHub sign-in",
    OAuthCallback: "Failed to complete GitHub sign-in",
    OAuthAccountNotLinked: "This email is already linked to another account",
    AccessDenied: "You cancelled the GitHub authorization",
    Default: "An error occurred during authentication",
  }

  const message = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
      <p className="mb-8">{message}</p>
      <a href="/login" className="text-blue-500 hover:underline">
        Try Again
      </a>
    </div>
  )
}
```

### 8.8 Update Analysis Form (Remove Token Input)

**File**: `src/presentation/components/AnalysisForm.tsx`

```typescript
// Remove token input field
export function AnalysisForm() {
  return (
    <form action={handleAnalysis}>
      {/* REMOVE: <input name="githubToken" type="password" /> */}
      <input name="repositoryUrl" type="url" placeholder="https://github.com/owner/repo" required />
      <button type="submit">Analyze Repository</button>
    </form>
  )
}
```

## Step 9: Test the Implementation (5 minutes)

### Start Development Server

```bash
pnpm dev
```

### Test Flow

1. **Visit homepage**: `http://localhost:3000`
   - [ ] Should redirect to `/login` (unauthenticated)

2. **Click "Sign in with GitHub"**:
   - [ ] Redirects to GitHub OAuth page
   - [ ] Shows requested scopes: `read:user`, `user:email`, `repo`

3. **Authorize the app**:
   - [ ] Redirects back to app
   - [ ] Header shows your GitHub profile (name/avatar)
   - [ ] Signed in successfully

4. **Analyze a repository**:
   - [ ] Enter repository URL (e.g., `https://github.com/octocat/Hello-World`)
   - [ ] Submit WITHOUT entering a token
   - [ ] Analysis proceeds normally
   - [ ] Results displayed

5. **Sign out**:
   - [ ] Click "Sign out"
   - [ ] Redirects to homepage
   - [ ] Attempting to analyze redirects to login

6. **Session persistence**:
   - [ ] Close browser
   - [ ] Reopen `http://localhost:3000`
   - [ ] Still signed in (within 7 days)

### Verify Security

```bash
# Check logs - ensure no tokens exposed
pnpm dev
# Search logs for "ghp_" (token prefix) - should see masked tokens only: "ghp_***"
```

### Common Issues

| Issue                      | Solution                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `AUTH_GITHUB_ID not found` | Ensure `.env.local` exists and variables are set                                                   |
| Redirect loop              | Check middleware matcher config, ensure `/login` and `/auth/error` are excluded                    |
| "Invalid callback URL"     | Verify GitHub OAuth app callback matches exactly: `http://localhost:3000/api/auth/callback/github` |
| Token not in session       | Check JWT callback in `auth.config.ts` stores `account.access_token`                               |
| TypeScript errors          | Run `pnpm type-check`, ensure `types/next-auth.d.ts` is in tsconfig include                        |

## Step 10: Write Tests (Optional, 10 minutes)

### Mock Session Provider for Tests

**File**: `tests/unit/infrastructure/__mocks__/MockSessionProvider.ts`

```typescript
import { ISessionProvider } from "@/domain/interfaces/ISessionProvider";
import { Result, ok, err } from "@/lib/result";

export class MockSessionProvider implements ISessionProvider {
  constructor(private mockToken?: string) {}

  async getAccessToken(): Promise<Result<string>> {
    if (!this.mockToken) {
      return err(new Error("No active session"));
    }
    return ok(this.mockToken);
  }

  setToken(token: string): void {
    this.mockToken = token;
  }

  clearToken(): void {
    this.mockToken = undefined;
  }
}
```

### Update Existing Tests

```typescript
// tests/unit/infrastructure/OctokitAdapter.test.ts
import { OctokitAdapter } from "@/infrastructure/github/OctokitAdapter";
import { MockSessionProvider } from "../__mocks__/MockSessionProvider";

describe("OctokitAdapter with session", () => {
  it("should validate access with session token", async () => {
    const mockProvider = new MockSessionProvider("ghp_testToken123");
    const adapter = new OctokitAdapter(mockProvider);

    const result = await adapter.validateAccess("owner", "repo");

    expect(result.ok).toBe(true);
  });

  it("should fail when no session", async () => {
    const mockProvider = new MockSessionProvider(); // No token
    const adapter = new OctokitAdapter(mockProvider);

    const result = await adapter.validateAccess("owner", "repo");

    expect(result.ok).toBe(false);
  });
});
```

## Summary

You've successfully implemented GitHub OAuth authentication! Here's what changed:

| Component                   | Before                   | After                     |
| --------------------------- | ------------------------ | ------------------------- |
| **User Auth**               | Manual PAT input         | OAuth sign-in button      |
| **Token Storage**           | Client-side form field   | Server-side encrypted JWT |
| **Session Management**      | None                     | 7-day persistent sessions |
| **Infrastructure Adapters** | Accept token params      | Inject `ISessionProvider` |
| **Server Actions**          | Accept `githubToken`     | Source token from session |
| **Security**                | Tokens visible to client | Tokens never exposed      |

## Next Steps

- [ ] **Deploy to staging**: Create production OAuth app, update environment variables
- [ ] **Update documentation**: Document new authentication flow in README
- [ ] **Monitor metrics**: Track auth success rates, session durations
- [ ] **Add E2E tests**: Test full OAuth flow with Playwright
- [ ] **Consider enhancements**: Profile page, account settings, token refresh

## Troubleshooting

### GitHub OAuth Scopes Not Working

If analysis fails due to insufficient permissions:

1. Check GitHub OAuth app settings: [GitHub Developer Settings](https://github.com/settings/developers)
2. Verify `authorization.params.scope` in `auth.config.ts`
3. Revoke app authorization: [GitHub Applications](https://github.com/settings/applications)
4. Sign in again to request fresh scopes

### Session Cookie Not Set

If session doesn't persist:

1. Check browser DevTools → Application → Cookies
2. Look for `next-auth.session-token` (dev) or `__Secure-next-auth.session-token` (prod)
3. Verify `AUTH_SECRET` is set and valid (32+ characters)
4. Check for CORS/SameSite issues if using custom domain

### Type Errors

```bash
# Regenerate Next.js types
rm -rf .next
pnpm dev

# Restart TypeScript server in VS Code
# Command Palette → "TypeScript: Restart TS Server"
```

## Support

- **NextAuth v5 Docs**: https://authjs.dev
- **GitHub OAuth Guide**: https://docs.github.com/en/developers/apps/building-oauth-apps
- **Team Insights Issues**: [GitHub Issues](https://github.com/your-org/team-insights/issues)

---

**Congratulations!** Your application now uses secure OAuth authentication. Users can sign in with one click, and you no longer need to handle sensitive tokens on the client side.
